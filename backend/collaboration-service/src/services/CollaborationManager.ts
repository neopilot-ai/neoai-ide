import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import * as Y from 'yjs';
import { logger } from '../utils/logger';
import { DocumentManager } from './DocumentManager';
import { AwarenessManager } from './AwarenessManager';
import { PermissionManager } from './PermissionManager';

export interface CollaborationSession {
  id: string;
  projectId: string;
  documentId: string;
  participants: Map<string, Participant>;
  ydoc: Y.Doc;
  createdAt: Date;
  lastActivity: Date;
}

export interface Participant {
  id: string;
  userId: string;
  socketId: string;
  name: string;
  email: string;
  avatar?: string;
  cursor?: CursorPosition;
  selection?: Selection;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
  lastActivity: Date;
}

export interface CursorPosition {
  line: number;
  column: number;
  documentId: string;
}

export interface Selection {
  start: { line: number; column: number };
  end: { line: number; column: number };
  documentId: string;
}

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  userId: string;
  timestamp: Date;
  documentId: string;
}

export interface DocumentUpdate {
  documentId: string;
  operations: Operation[];
  version: number;
  userId: string;
  timestamp: Date;
}

export class CollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private socketSessions: Map<string, string> = new Map(); // socketId -> sessionId

  constructor(
    private io: SocketIOServer,
    private documentManager: DocumentManager,
    private awarenessManager: AwarenessManager,
    private permissionManager: PermissionManager
  ) {}

  async initialize(): Promise<void> {
    logger.info('Initializing Collaboration Manager...');
    
    // Setup periodic cleanup
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    logger.info('✅ Collaboration Manager initialized');
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up Collaboration Manager...');
    
    // Close all sessions
    for (const [sessionId, session] of this.sessions) {
      await this.closeSession(sessionId);
    }
    
    this.sessions.clear();
    this.userSessions.clear();
    this.socketSessions.clear();
    
    logger.info('✅ Collaboration Manager cleaned up');
  }

  async handleConnection(socket: Socket): Promise<void> {
    logger.info(`Handling new connection: ${socket.id}`);

    // Join project room
    socket.on('join-project', async (data: { projectId: string; userId: string; userInfo: any }) => {
      try {
        await this.handleJoinProject(socket, data);
      } catch (error) {
        logger.error('Error joining project:', error);
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Join document session
    socket.on('join-document', async (data: { documentId: string; projectId: string }) => {
      try {
        await this.handleJoinDocument(socket, data);
      } catch (error) {
        logger.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Handle document operations
    socket.on('document-operation', async (data: DocumentUpdate) => {
      try {
        await this.handleDocumentOperation(socket, data);
      } catch (error) {
        logger.error('Error handling document operation:', error);
        socket.emit('error', { message: 'Failed to apply operation' });
      }
    });

    // Handle cursor updates
    socket.on('cursor-update', (data: { documentId: string; cursor: CursorPosition }) => {
      this.handleCursorUpdate(socket, data);
    });

    // Handle selection updates
    socket.on('selection-update', (data: { documentId: string; selection: Selection }) => {
      this.handleSelectionUpdate(socket, data);
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { documentId: string }) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing-stop', (data: { documentId: string }) => {
      this.handleTypingStop(socket, data);
    });

    // Leave document session
    socket.on('leave-document', async (data: { documentId: string }) => {
      try {
        await this.handleLeaveDocument(socket, data);
      } catch (error) {
        logger.error('Error leaving document:', error);
      }
    });
  }

  async handleDisconnection(socket: Socket): Promise<void> {
    const sessionId = this.socketSessions.get(socket.id);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        // Remove participant
        for (const [participantId, participant] of session.participants) {
          if (participant.socketId === socket.id) {
            session.participants.delete(participantId);
            
            // Notify other participants
            socket.to(sessionId).emit('participant-left', {
              participantId,
              participant,
            });
            
            break;
          }
        }

        // Update awareness
        await this.awarenessManager.removeUser(socket.id, sessionId);

        // Clean up if no participants left
        if (session.participants.size === 0) {
          await this.closeSession(sessionId);
        }
      }

      this.socketSessions.delete(socket.id);
    }
  }

  private async handleJoinProject(socket: Socket, data: { projectId: string; userId: string; userInfo: any }): Promise<void> {
    const { projectId, userId, userInfo } = data;

    // Check permissions
    const hasAccess = await this.permissionManager.checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to project' });
      return;
    }

    // Join project room
    socket.join(`project:${projectId}`);

    // Update user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }

    socket.emit('project-joined', {
      projectId,
      message: 'Successfully joined project',
    });

    logger.info(`User ${userId} joined project ${projectId}`);
  }

  private async handleJoinDocument(socket: Socket, data: { documentId: string; projectId: string }): Promise<void> {
    const { documentId, projectId } = data;
    const userId = (socket as any).userId; // Set by auth middleware

    // Check permissions
    const hasAccess = await this.permissionManager.checkDocumentAccess(userId, documentId);
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied to document' });
      return;
    }

    // Get or create session
    let session = await this.getOrCreateSession(projectId, documentId);

    // Create participant
    const participant: Participant = {
      id: uuidv4(),
      userId,
      socketId: socket.id,
      name: (socket as any).userName || 'Unknown User',
      email: (socket as any).userEmail || '',
      avatar: (socket as any).userAvatar,
      role: await this.permissionManager.getUserRole(userId, projectId),
      joinedAt: new Date(),
      lastActivity: new Date(),
    };

    // Add participant to session
    session.participants.set(participant.id, participant);
    this.socketSessions.set(socket.id, session.id);

    // Join session room
    socket.join(session.id);

    // Get document content
    const document = await this.documentManager.getDocument(documentId);

    // Send initial state
    socket.emit('document-joined', {
      sessionId: session.id,
      documentId,
      content: document?.content || '',
      version: document?.version || 0,
      participants: Array.from(session.participants.values()),
    });

    // Notify other participants
    socket.to(session.id).emit('participant-joined', {
      participant,
    });

    // Update awareness
    await this.awarenessManager.addUser(socket.id, session.id, participant);

    session.lastActivity = new Date();

    logger.info(`User ${userId} joined document ${documentId} in session ${session.id}`);
  }

  private async handleDocumentOperation(socket: Socket, data: DocumentUpdate): Promise<void> {
    const { documentId, operations, version, userId } = data;
    const sessionId = this.socketSessions.get(socket.id);

    if (!sessionId) {
      socket.emit('error', { message: 'Not in a collaboration session' });
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session || session.documentId !== documentId) {
      socket.emit('error', { message: 'Invalid session or document' });
      return;
    }

    // Check permissions
    const participant = Array.from(session.participants.values())
      .find(p => p.socketId === socket.id);
    
    if (!participant || participant.role === 'viewer') {
      socket.emit('error', { message: 'Insufficient permissions to edit' });
      return;
    }

    try {
      // Apply operations to Yjs document
      const ytext = session.ydoc.getText('content');
      
      // Transform operations if needed (handle concurrent edits)
      const transformedOperations = await this.transformOperations(operations, version, session);

      // Apply operations
      session.ydoc.transact(() => {
        for (const op of transformedOperations) {
          switch (op.type) {
            case 'insert':
              if (op.content) {
                ytext.insert(op.position, op.content);
              }
              break;
            case 'delete':
              if (op.length) {
                ytext.delete(op.position, op.length);
              }
              break;
            case 'retain':
              // No action needed for retain
              break;
          }
        }
      });

      // Update document in database
      const newContent = ytext.toString();
      const newVersion = version + 1;
      
      await this.documentManager.updateDocument(documentId, {
        content: newContent,
        version: newVersion,
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
      });

      // Broadcast to other participants
      socket.to(sessionId).emit('document-operation', {
        documentId,
        operations: transformedOperations,
        version: newVersion,
        userId,
        timestamp: new Date(),
      });

      // Update participant activity
      if (participant) {
        participant.lastActivity = new Date();
      }
      session.lastActivity = new Date();

      // Send acknowledgment
      socket.emit('operation-ack', {
        documentId,
        version: newVersion,
        operationIds: operations.map(op => op.id),
      });

    } catch (error) {
      logger.error('Error applying document operation:', error);
      socket.emit('operation-error', {
        documentId,
        error: 'Failed to apply operation',
        operationIds: operations.map(op => op.id),
      });
    }
  }

  private handleCursorUpdate(socket: Socket, data: { documentId: string; cursor: CursorPosition }): void {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update participant cursor
    for (const participant of session.participants.values()) {
      if (participant.socketId === socket.id) {
        participant.cursor = data.cursor;
        participant.lastActivity = new Date();
        break;
      }
    }

    // Broadcast cursor update
    socket.to(sessionId).emit('cursor-update', {
      userId: (socket as any).userId,
      documentId: data.documentId,
      cursor: data.cursor,
    });
  }

  private handleSelectionUpdate(socket: Socket, data: { documentId: string; selection: Selection }): void {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update participant selection
    for (const participant of session.participants.values()) {
      if (participant.socketId === socket.id) {
        participant.selection = data.selection;
        participant.lastActivity = new Date();
        break;
      }
    }

    // Broadcast selection update
    socket.to(sessionId).emit('selection-update', {
      userId: (socket as any).userId,
      documentId: data.documentId,
      selection: data.selection,
    });
  }

  private handleTypingStart(socket: Socket, data: { documentId: string }): void {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    socket.to(sessionId).emit('typing-start', {
      userId: (socket as any).userId,
      documentId: data.documentId,
    });
  }

  private handleTypingStop(socket: Socket, data: { documentId: string }): void {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    socket.to(sessionId).emit('typing-stop', {
      userId: (socket as any).userId,
      documentId: data.documentId,
    });
  }

  private async handleLeaveDocument(socket: Socket, data: { documentId: string }): Promise<void> {
    const sessionId = this.socketSessions.get(socket.id);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Remove participant
    for (const [participantId, participant] of session.participants) {
      if (participant.socketId === socket.id) {
        session.participants.delete(participantId);
        
        // Notify other participants
        socket.to(sessionId).emit('participant-left', {
          participantId,
          participant,
        });
        
        break;
      }
    }

    // Leave session room
    socket.leave(sessionId);
    this.socketSessions.delete(socket.id);

    // Update awareness
    await this.awarenessManager.removeUser(socket.id, sessionId);

    // Clean up if no participants left
    if (session.participants.size === 0) {
      await this.closeSession(sessionId);
    }

    socket.emit('document-left', { documentId: data.documentId });
  }

  private async getOrCreateSession(projectId: string, documentId: string): Promise<CollaborationSession> {
    // Look for existing session
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId && session.documentId === documentId) {
        return session;
      }
    }

    // Create new session
    const sessionId = uuidv4();
    const ydoc = new Y.Doc();
    
    // Initialize document content
    const document = await this.documentManager.getDocument(documentId);
    if (document?.content) {
      const ytext = ydoc.getText('content');
      ytext.insert(0, document.content);
    }

    const session: CollaborationSession = {
      id: sessionId,
      projectId,
      documentId,
      participants: new Map(),
      ydoc,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
    
    logger.info(`Created new collaboration session: ${sessionId} for document ${documentId}`);
    
    return session;
  }

  private async transformOperations(
    operations: Operation[],
    version: number,
    session: CollaborationSession
  ): Promise<Operation[]> {
    // Get current document version
    const document = await this.documentManager.getDocument(session.documentId);
    const currentVersion = document?.version || 0;

    if (version === currentVersion) {
      // No transformation needed
      return operations;
    }

    // TODO: Implement operational transform for concurrent operations
    // For now, we'll use Yjs which handles this automatically
    return operations;
  }

  private async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Notify all participants
    this.io.to(sessionId).emit('session-closed', {
      sessionId,
      reason: 'Session ended',
    });

    // Clean up
    session.ydoc.destroy();
    this.sessions.delete(sessionId);

    // Remove from user sessions
    for (const participant of session.participants.values()) {
      const userSessions = this.userSessions.get(participant.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(participant.userId);
        }
      }
      this.socketSessions.delete(participant.socketId);
    }

    logger.info(`Closed collaboration session: ${sessionId}`);
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions) {
      if (now.getTime() - session.lastActivity.getTime() > inactivityThreshold) {
        logger.info(`Cleaning up inactive session: ${sessionId}`);
        this.closeSession(sessionId);
      }
    }
  }

  // Public methods for API access
  async getActiveSessions(projectId: string): Promise<CollaborationSession[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.projectId === projectId);
  }

  async getSessionParticipants(sessionId: string): Promise<Participant[]> {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session.participants.values()) : [];
  }

  async kickParticipant(sessionId: string, participantId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(participantId);
    if (!participant) return;

    // Emit kick event
    this.io.to(participant.socketId).emit('kicked', {
      sessionId,
      reason: reason || 'Removed from session',
    });

    // Remove participant
    session.participants.delete(participantId);
    this.socketSessions.delete(participant.socketId);

    // Notify other participants
    this.io.to(sessionId).emit('participant-left', {
      participantId,
      participant,
      reason: 'kicked',
    });

    logger.info(`Kicked participant ${participantId} from session ${sessionId}`);
  }
}
