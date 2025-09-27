import { logger } from '../utils/logger';
import redis from 'redis';

export interface Permission {
  id: string;
  userId: string;
  resourceType: 'project' | 'document' | 'session';
  resourceId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[]; // ['read', 'write', 'delete', 'share', 'admin']
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface ProjectRole {
  userId: string;
  projectId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: ProjectPermissions;
  invitedBy?: string;
  joinedAt: Date;
}

export interface ProjectPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
  canInvite: boolean;
  canManageRoles: boolean;
  canManageSettings: boolean;
}

export class PermissionManager {
  private redisClient: redis.RedisClientType | null = null;
  private permissions: Map<string, Permission> = new Map();
  private projectRoles: Map<string, ProjectRole> = new Map(); // userId:projectId -> ProjectRole

  async initialize(): Promise<void> {
    logger.info('Initializing Permission Manager...');
    
    try {
      // Initialize Redis connection
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = redis.createClient({ url: redisUrl });
      await this.redisClient.connect();
      
      logger.info('✅ Permission Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Permission Manager:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Permission Manager...');
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    this.permissions.clear();
    this.projectRoles.clear();
    
    logger.info('✅ Permission Manager cleaned up');
  }

  async checkProjectAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      const role = await this.getProjectRole(userId, projectId);
      return role !== null && role.permissions.canRead;
    } catch (error) {
      logger.error(`Error checking project access for user ${userId}, project ${projectId}:`, error);
      return false;
    }
  }

  async checkDocumentAccess(userId: string, documentId: string): Promise<boolean> {
    try {
      // TODO: Implement document-specific permissions
      // For now, check if user has access to the project containing the document
      
      // Get document's project ID (would normally query database)
      const projectId = await this.getDocumentProjectId(documentId);
      if (!projectId) {
        return false;
      }

      return this.checkProjectAccess(userId, projectId);
    } catch (error) {
      logger.error(`Error checking document access for user ${userId}, document ${documentId}:`, error);
      return false;
    }
  }

  async getUserRole(userId: string, projectId: string): Promise<'owner' | 'admin' | 'editor' | 'viewer'> {
    try {
      const role = await this.getProjectRole(userId, projectId);
      return role?.role || 'viewer';
    } catch (error) {
      logger.error(`Error getting user role for user ${userId}, project ${projectId}:`, error);
      return 'viewer';
    }
  }

  async getProjectRole(userId: string, projectId: string): Promise<ProjectRole | null> {
    try {
      const key = `${userId}:${projectId}`;
      
      // Check cache first
      let role = this.projectRoles.get(key);
      if (role) {
        return role;
      }

      // Check Redis cache
      if (this.redisClient) {
        const cached = await this.redisClient.get(`project_role:${key}`);
        if (cached) {
          role = JSON.parse(cached);
          this.projectRoles.set(key, role!);
          return role!;
        }
      }

      // TODO: Query database for project role
      // For now, return a default role for demo purposes
      const defaultRole: ProjectRole = {
        userId,
        projectId,
        role: 'editor',
        permissions: this.getDefaultPermissions('editor'),
        joinedAt: new Date(),
      };

      // Cache the role
      this.projectRoles.set(key, defaultRole);
      if (this.redisClient) {
        await this.redisClient.setEx(
          `project_role:${key}`,
          3600, // 1 hour TTL
          JSON.stringify(defaultRole)
        );
      }

      return defaultRole;
    } catch (error) {
      logger.error(`Error getting project role for user ${userId}, project ${projectId}:`, error);
      return null;
    }
  }

  async grantProjectRole(
    userId: string,
    projectId: string,
    role: ProjectRole['role'],
    grantedBy: string
  ): Promise<boolean> {
    try {
      const projectRole: ProjectRole = {
        userId,
        projectId,
        role,
        permissions: this.getDefaultPermissions(role),
        invitedBy: grantedBy,
        joinedAt: new Date(),
      };

      const key = `${userId}:${projectId}`;
      
      // Update cache
      this.projectRoles.set(key, projectRole);

      // Update Redis cache
      if (this.redisClient) {
        await this.redisClient.setEx(
          `project_role:${key}`,
          3600,
          JSON.stringify(projectRole)
        );
      }

      // TODO: Update database

      logger.info(`Granted ${role} role to user ${userId} for project ${projectId}`);
      return true;
    } catch (error) {
      logger.error(`Error granting project role:`, error);
      return false;
    }
  }

  async revokeProjectRole(userId: string, projectId: string): Promise<boolean> {
    try {
      const key = `${userId}:${projectId}`;
      
      // Remove from cache
      this.projectRoles.delete(key);

      // Remove from Redis
      if (this.redisClient) {
        await this.redisClient.del(`project_role:${key}`);
      }

      // TODO: Update database

      logger.info(`Revoked project role for user ${userId} from project ${projectId}`);
      return true;
    } catch (error) {
      logger.error(`Error revoking project role:`, error);
      return false;
    }
  }

  async updateProjectRole(
    userId: string,
    projectId: string,
    newRole: ProjectRole['role']
  ): Promise<boolean> {
    try {
      const key = `${userId}:${projectId}`;
      const existingRole = this.projectRoles.get(key);
      
      if (!existingRole) {
        return false;
      }

      const updatedRole: ProjectRole = {
        ...existingRole,
        role: newRole,
        permissions: this.getDefaultPermissions(newRole),
      };

      // Update cache
      this.projectRoles.set(key, updatedRole);

      // Update Redis cache
      if (this.redisClient) {
        await this.redisClient.setEx(
          `project_role:${key}`,
          3600,
          JSON.stringify(updatedRole)
        );
      }

      // TODO: Update database

      logger.info(`Updated role for user ${userId} in project ${projectId} to ${newRole}`);
      return true;
    } catch (error) {
      logger.error(`Error updating project role:`, error);
      return false;
    }
  }

  async getProjectMembers(projectId: string): Promise<ProjectRole[]> {
    try {
      // TODO: Query database for all project members
      // For now, return cached members
      return Array.from(this.projectRoles.values())
        .filter(role => role.projectId === projectId);
    } catch (error) {
      logger.error(`Error getting project members for project ${projectId}:`, error);
      return [];
    }
  }

  async canUserPerformAction(
    userId: string,
    projectId: string,
    action: keyof ProjectPermissions
  ): Promise<boolean> {
    try {
      const role = await this.getProjectRole(userId, projectId);
      if (!role) {
        return false;
      }

      return role.permissions[action] || false;
    } catch (error) {
      logger.error(`Error checking user permission:`, error);
      return false;
    }
  }

  private getDefaultPermissions(role: ProjectRole['role']): ProjectPermissions {
    switch (role) {
      case 'owner':
        return {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canShare: true,
          canInvite: true,
          canManageRoles: true,
          canManageSettings: true,
        };
      case 'admin':
        return {
          canRead: true,
          canWrite: true,
          canDelete: true,
          canShare: true,
          canInvite: true,
          canManageRoles: true,
          canManageSettings: false,
        };
      case 'editor':
        return {
          canRead: true,
          canWrite: true,
          canDelete: false,
          canShare: true,
          canInvite: false,
          canManageRoles: false,
          canManageSettings: false,
        };
      case 'viewer':
        return {
          canRead: true,
          canWrite: false,
          canDelete: false,
          canShare: false,
          canInvite: false,
          canManageRoles: false,
          canManageSettings: false,
        };
      default:
        return {
          canRead: false,
          canWrite: false,
          canDelete: false,
          canShare: false,
          canInvite: false,
          canManageRoles: false,
          canManageSettings: false,
        };
    }
  }

  private async getDocumentProjectId(documentId: string): Promise<string | null> {
    // TODO: Query database to get document's project ID
    // For now, extract from document ID pattern or return a default
    return 'sample-project';
  }

  // Utility methods for permission checking
  async canRead(userId: string, projectId: string): Promise<boolean> {
    return this.canUserPerformAction(userId, projectId, 'canRead');
  }

  async canWrite(userId: string, projectId: string): Promise<boolean> {
    return this.canUserPerformAction(userId, projectId, 'canWrite');
  }

  async canDelete(userId: string, projectId: string): Promise<boolean> {
    return this.canUserPerformAction(userId, projectId, 'canDelete');
  }

  async canShare(userId: string, projectId: string): Promise<boolean> {
    return this.canUserPerformAction(userId, projectId, 'canShare');
  }

  async canInvite(userId: string, projectId: string): Promise<boolean> {
    return this.canUserPerformAction(userId, projectId, 'canInvite');
  }

  async canManageRoles(userId: string, projectId: string): Promise<boolean> {
    return this.canUserPerformAction(userId, projectId, 'canManageRoles');
  }

  async canManageSettings(userId: string, projectId: string): Promise<boolean> {
    return this.canUserPerformAction(userId, projectId, 'canManageSettings');
  }
}
