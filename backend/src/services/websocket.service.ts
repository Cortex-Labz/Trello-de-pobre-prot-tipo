import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeWebSocket(io: Server): void {
  // Authentication middleware for WebSocket
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join board room
    socket.on('join:board', (boardId: string) => {
      socket.join(`board:${boardId}`);
      console.log(`📋 User ${socket.userId} joined board ${boardId}`);
    });

    // Leave board room
    socket.on('leave:board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      console.log(`📋 User ${socket.userId} left board ${boardId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });
}

// Helper functions to emit events
export function emitBoardUpdate(io: Server, boardId: string, event: string, data: any): void {
  io.to(`board:${boardId}`).emit(event, data);
}

export function emitUserNotification(io: Server, userId: string, data: any): void {
  io.to(`user:${userId}`).emit('notification', data);
}
