import { Server } from 'socket.io';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Join a game room
    socket.on('join-game', (data) => {
      const { gameId, playerId } = data;
      socket.join(gameId);
      console.log(`Player ${playerId} joined game ${gameId}`);
      
      // Notify other players
      socket.to(gameId).emit('player-joined', { playerId });
    });
    
    // Leave a game room
    socket.on('leave-game', (data) => {
      const { gameId, playerId } = data;
      socket.leave(gameId);
      console.log(`Player ${playerId} left game ${gameId}`);
      
      // Notify other players
      socket.to(gameId).emit('player-left', { playerId });
    });
    
    // Player action (fold, call, raise, etc.)
    socket.on('player-action', (data) => {
      const { gameId, playerId, action, amount } = data;
      console.log(`Player ${playerId} action: ${action} ${amount || ''}`);
      
      // TODO: Process action through game engine
      // TODO: Broadcast updated game state
      
      socket.to(gameId).emit('player-action', { playerId, action, amount });
    });
    
    // Chat message
    socket.on('chat-message', (data) => {
      const { gameId, playerId, message } = data;
      console.log(`Chat from ${playerId}: ${message}`);
      
      socket.to(gameId).emit('chat-message', { playerId, message });
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
    });
  });
} 