import { Server } from 'socket.io';

let _io: Server | null = null;

export function setIO(io: Server) {
  _io = io;
}

export function getIO(): Server {
  if (!_io) {
    throw new Error('Socket.io not initialized. Call setIO() first.');
  }
  return _io;
}
