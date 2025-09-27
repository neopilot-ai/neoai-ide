import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

export interface UserAwareness {
  userId: string;
  socketId: string;
  sessionId: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  cursor?: {
    documentId: string;
    line: number;
    column: number;
  };
  selection?: {
    documentId: string;
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  typing?: {
    documentId: string;
    isTyping: boolean;
    lastTyped: Date;
  };
  lastActivity: Date;
  joinedAt: Date;
}

export interface SessionAwareness {
  sessionId: string;
  users: Map<string, UserAwareness>;
  lastUpdate: Date;
}

export class AwarenessManager {
  private sessions: Map<string, SessionAwareness> = new Map();
  private userSessions: Map<string, string> = new Map(); // socketId -> sessionId

  constructor(private io: SocketIOServer) {}

  async initialize(): Promise<void> {
    logger.info('Initializing Awareness Manager...');
    
    // Setup periodic cleanup for inactive users
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 30 * 1000); // Every 30 seconds
    
    logger.info('✅ Awareness Manager initialized');
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Awareness Manager...');
    
    this.sessions.clear();
    this.userSessions.clear();
    
    logger.info('✅ Awareness Manager cleaned up');
  }

  async addUser(socketId: string, sessionId: string, userInfo: any): Promise<void> {
    try {
      // Get or create session awareness
      let sessionAwareness = this.sessions.get(sessionId);
      if (!sessionAwareness) {
        sessionAwareness = {
          sessionId,
          users: new Map(),
          lastUpdate: new Date(),
        };
        this.sessions.set(sessionId, sessionAwareness);
      }

      // Create user awareness
      const userAwareness: UserAwareness = {
        userId: userInfo.userId,
        socketId,
        sessionId,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.avatar,
        status: 'online',
        lastActivity: new Date(),
        joinedAt: new Date(),
      };

      // Add user to session
      sessionAwareness.users.set(socketId, userAwareness);
      sessionAwareness.lastUpdate = new Date();
      
      // Track user session
      this.userSessions.set(socketId, sessionId);

      // Broadcast awareness update
      this.broadcastAwarenessUpdate(sessionId);

      logger.debug(`Added user ${userInfo.userId} to session ${sessionId} awareness`);
    } catch (error) {
      logger.error('Error adding user to awareness:', error);
    }
  }

  async removeUser(socketId: string, sessionId: string): Promise<void> {
    try {
      const sessionAwareness = this.sessions.get(sessionId);
      if (!sessionAwareness) {
        return;
      }

      const userAwareness = sessionAwareness.users.get(socketId);
      if (userAwareness) {
        // Remove user from session
        sessionAwareness.users.delete(socketId);
        sessionAwareness.lastUpdate = new Date();

        // Remove user session tracking
        this.userSessions.delete(socketId);

        // Clean up empty sessions
        if (sessionAwareness.users.size === 0) {
          this.sessions.delete(sessionId);
        } else {
          // Broadcast awareness update
          this.broadcastAwarenessUpdate(sessionId);
        }

        logger.debug(`Removed user ${userAwareness.userId} from session ${sessionId} awareness`);
      }
    } catch (error) {
      logger.error('Error removing user from awareness:', error);
    }
  }

  async updateUserCursor(socketId: string, cursor: UserAwareness['cursor']): Promise<void> {
    try {
      const sessionId = this.userSessions.get(socketId);
      if (!sessionId) return;

      const sessionAwareness = this.sessions.get(sessionId);
      if (!sessionAwareness) return;

      const userAwareness = sessionAwareness.users.get(socketId);
      if (!userAwareness) return;

      // Update cursor
      userAwareness.cursor = cursor;
      userAwareness.lastActivity = new Date();
      sessionAwareness.lastUpdate = new Date();

      // Broadcast cursor update
      this.io.to(sessionId).emit('awareness-cursor-update', {
        userId: userAwareness.userId,
        socketId,
        cursor,
      });
    } catch (error) {
      logger.error('Error updating user cursor:', error);
    }
  }

  async updateUserSelection(socketId: string, selection: UserAwareness['selection']): Promise<void> {
    try {
      const sessionId = this.userSessions.get(socketId);
      if (!sessionId) return;

      const sessionAwareness = this.sessions.get(sessionId);
      if (!sessionAwareness) return;

      const userAwareness = sessionAwareness.users.get(socketId);
      if (!userAwareness) return;

      // Update selection
      userAwareness.selection = selection;
      userAwareness.lastActivity = new Date();
      sessionAwareness.lastUpdate = new Date();

      // Broadcast selection update
      this.io.to(sessionId).emit('awareness-selection-update', {
        userId: userAwareness.userId,
        socketId,
        selection,
      });
    } catch (error) {
      logger.error('Error updating user selection:', error);
    }
  }

  async updateUserTyping(socketId: string, typing: UserAwareness['typing']): Promise<void> {
    try {
      const sessionId = this.userSessions.get(socketId);
      if (!sessionId) return;

      const sessionAwareness = this.sessions.get(sessionId);
      if (!sessionAwareness) return;

      const userAwareness = sessionAwareness.users.get(socketId);
      if (!userAwareness) return;

      // Update typing status
      userAwareness.typing = typing;
      userAwareness.lastActivity = new Date();
      sessionAwareness.lastUpdate = new Date();

      // Broadcast typing update
      this.io.to(sessionId).emit('awareness-typing-update', {
        userId: userAwareness.userId,
        socketId,
        typing,
      });
    } catch (error) {
      logger.error('Error updating user typing:', error);
    }
  }

  async updateUserStatus(socketId: string, status: UserAwareness['status']): Promise<void> {
    try {
      const sessionId = this.userSessions.get(socketId);
      if (!sessionId) return;

      const sessionAwareness = this.sessions.get(sessionId);
      if (!sessionAwareness) return;

      const userAwareness = sessionAwareness.users.get(socketId);
      if (!userAwareness) return;

      // Update status
      userAwareness.status = status;
      userAwareness.lastActivity = new Date();
      sessionAwareness.lastUpdate = new Date();

      // Broadcast status update
      this.io.to(sessionId).emit('awareness-status-update', {
        userId: userAwareness.userId,
        socketId,
        status,
      });
    } catch (error) {
      logger.error('Error updating user status:', error);
    }
  }

  async getSessionAwareness(sessionId: string): Promise<UserAwareness[]> {
    const sessionAwareness = this.sessions.get(sessionId);
    return sessionAwareness ? Array.from(sessionAwareness.users.values()) : [];
  }

  async getUserAwareness(socketId: string): Promise<UserAwareness | null> {
    const sessionId = this.userSessions.get(socketId);
    if (!sessionId) return null;

    const sessionAwareness = this.sessions.get(sessionId);
    if (!sessionAwareness) return null;

    return sessionAwareness.users.get(socketId) || null;
  }

  private broadcastAwarenessUpdate(sessionId: string): void {
    const sessionAwareness = this.sessions.get(sessionId);
    if (!sessionAwareness) return;

    const users = Array.from(sessionAwareness.users.values()).map(user => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      cursor: user.cursor,
      selection: user.selection,
      typing: user.typing,
      lastActivity: user.lastActivity,
    }));

    this.io.to(sessionId).emit('awareness-update', {
      sessionId,
      users,
      timestamp: new Date(),
    });
  }

  private cleanupInactiveUsers(): void {
    const now = new Date();
    const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [sessionId, sessionAwareness] of this.sessions) {
      let hasChanges = false;

      for (const [socketId, userAwareness] of sessionAwareness.users) {
        // Check for inactive users
        if (now.getTime() - userAwareness.lastActivity.getTime() > inactivityThreshold) {
          sessionAwareness.users.delete(socketId);
          this.userSessions.delete(socketId);
          hasChanges = true;
          
          logger.debug(`Cleaned up inactive user ${userAwareness.userId} from session ${sessionId}`);
        }
        // Clear typing status if user stopped typing
        else if (userAwareness.typing?.isTyping && 
                 userAwareness.typing.lastTyped &&
                 now.getTime() - userAwareness.typing.lastTyped.getTime() > 3000) { // 3 seconds
          userAwareness.typing.isTyping = false;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        if (sessionAwareness.users.size === 0) {
          // Remove empty session
          this.sessions.delete(sessionId);
        } else {
          // Broadcast awareness update
          sessionAwareness.lastUpdate = now;
          this.broadcastAwarenessUpdate(sessionId);
        }
      }
    }
  }

  // Public methods for external access
  async getActiveUsers(): Promise<{ sessionId: string; userCount: number; users: UserAwareness[] }[]> {
    return Array.from(this.sessions.entries()).map(([sessionId, sessionAwareness]) => ({
      sessionId,
      userCount: sessionAwareness.users.size,
      users: Array.from(sessionAwareness.users.values()),
    }));
  }

  async getSessionStats(sessionId: string): Promise<{
    totalUsers: number;
    onlineUsers: number;
    typingUsers: number;
    lastActivity: Date;
  } | null> {
    const sessionAwareness = this.sessions.get(sessionId);
    if (!sessionAwareness) return null;

    const users = Array.from(sessionAwareness.users.values());
    
    return {
      totalUsers: users.length,
      onlineUsers: users.filter(u => u.status === 'online').length,
      typingUsers: users.filter(u => u.typing?.isTyping).length,
      lastActivity: sessionAwareness.lastUpdate,
    };
  }
}
