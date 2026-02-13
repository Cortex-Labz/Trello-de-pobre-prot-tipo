import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import workspaceRoutes from './routes/workspace.routes';
import boardRoutes from './routes/board.routes';
import listRoutes from './routes/list.routes';
import cardRoutes from './routes/card.routes';
import labelRoutes from './routes/label.routes';
import commentRoutes from './routes/comment.routes';
import checklistRoutes from './routes/checklist.routes';
import attachmentRoutes from './routes/attachment.routes';
import activityRoutes from './routes/activity.routes';
import notificationRoutes from './routes/notification.routes';
import invitationRoutes from './routes/invitation.routes';
import { errorHandler } from './middleware/error.middleware';
import { initializeWebSocket } from './services/websocket.service';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

// Middleware - Allow all origins for development
app.use(cors({
  origin: '*',
  credentials: true,
}));
// Increase body size limit for file uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api', commentRoutes); // Must be before /api/cards to match /api/cards/:cardId/comments
app.use('/api', checklistRoutes); // Must be before /api/cards to match /api/cards/:cardId/checklists
app.use('/api', attachmentRoutes); // Must be before /api/cards to match /api/cards/:cardId/attachments
app.use('/api/cards', cardRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations', invitationRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize WebSocket
initializeWebSocket(io);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 VersatlyTask Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io };
