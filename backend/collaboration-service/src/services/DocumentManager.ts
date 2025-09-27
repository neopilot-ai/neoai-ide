import { logger } from '../utils/logger';
import redis from 'redis';

export interface Document {
  id: string;
  projectId: string;
  path: string;
  content: string;
  version: number;
  language: string;
  size: number;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
}

export interface DocumentUpdate {
  content?: string;
  version?: number;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
}

export class DocumentManager {
  private redisClient: redis.RedisClientType | null = null;
  private documents: Map<string, Document> = new Map();

  async initialize(): Promise<void> {
    logger.info('Initializing Document Manager...');
    
    try {
      // Initialize Redis connection
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = redis.createClient({ url: redisUrl });
      await this.redisClient.connect();
      
      logger.info('✅ Document Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Document Manager:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Document Manager...');
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    this.documents.clear();
    
    logger.info('✅ Document Manager cleaned up');
  }

  async getDocument(documentId: string): Promise<Document | null> {
    try {
      // Try cache first
      let document = this.documents.get(documentId);
      if (document) {
        return document;
      }

      // Try Redis cache
      if (this.redisClient) {
        const cached = await this.redisClient.get(`document:${documentId}`);
        if (cached) {
          document = JSON.parse(cached);
          this.documents.set(documentId, document!);
          return document!;
        }
      }

      // TODO: Fetch from database
      // For now, return null if not found
      return null;
    } catch (error) {
      logger.error(`Error getting document ${documentId}:`, error);
      return null;
    }
  }

  async updateDocument(documentId: string, updates: DocumentUpdate): Promise<Document | null> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        logger.warn(`Document ${documentId} not found for update`);
        return null;
      }

      // Apply updates
      const updatedDocument: Document = {
        ...document,
        ...updates,
        updatedAt: new Date(),
      };

      // Update cache
      this.documents.set(documentId, updatedDocument);

      // Update Redis cache
      if (this.redisClient) {
        await this.redisClient.setEx(
          `document:${documentId}`,
          3600, // 1 hour TTL
          JSON.stringify(updatedDocument)
        );
      }

      // TODO: Update database
      
      logger.debug(`Document ${documentId} updated to version ${updatedDocument.version}`);
      return updatedDocument;
    } catch (error) {
      logger.error(`Error updating document ${documentId}:`, error);
      return null;
    }
  }

  async createDocument(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    try {
      const newDocument: Document = {
        ...document,
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in cache
      this.documents.set(newDocument.id, newDocument);

      // Store in Redis
      if (this.redisClient) {
        await this.redisClient.setEx(
          `document:${newDocument.id}`,
          3600,
          JSON.stringify(newDocument)
        );
      }

      // TODO: Store in database

      logger.info(`Created new document: ${newDocument.id}`);
      return newDocument;
    } catch (error) {
      logger.error('Error creating document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // Remove from cache
      this.documents.delete(documentId);

      // Remove from Redis
      if (this.redisClient) {
        await this.redisClient.del(`document:${documentId}`);
      }

      // TODO: Delete from database

      logger.info(`Deleted document: ${documentId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting document ${documentId}:`, error);
      return false;
    }
  }

  async lockDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        return false;
      }

      if (document.isLocked && document.lockedBy !== userId) {
        return false; // Already locked by another user
      }

      const updatedDocument = await this.updateDocument(documentId, {
        ...document,
        isLocked: true,
        lockedBy: userId,
        lockedAt: new Date(),
      });

      return updatedDocument !== null;
    } catch (error) {
      logger.error(`Error locking document ${documentId}:`, error);
      return false;
    }
  }

  async unlockDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        return false;
      }

      if (document.isLocked && document.lockedBy !== userId) {
        return false; // Can't unlock document locked by another user
      }

      const updatedDocument = await this.updateDocument(documentId, {
        ...document,
        isLocked: false,
        lockedBy: undefined,
        lockedAt: undefined,
      });

      return updatedDocument !== null;
    } catch (error) {
      logger.error(`Error unlocking document ${documentId}:`, error);
      return false;
    }
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    try {
      // TODO: Implement database query
      // For now, filter from cache
      return Array.from(this.documents.values())
        .filter(doc => doc.projectId === projectId);
    } catch (error) {
      logger.error(`Error getting documents for project ${projectId}:`, error);
      return [];
    }
  }

  async calculateChecksum(content: string): Promise<string> {
    // Simple checksum calculation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
