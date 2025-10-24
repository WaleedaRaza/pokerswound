// SOCKET.IO HANDLERS - Extracted from sophisticated-engine-server.js
// Real-time WebSocket communication for poker game

module.exports = function setupSocketIO(io, getDb) {
  if (!io) {
    console.warn('⚠️  Socket.IO not initialized, skipping connection handlers');
    return;
  }
  
  io.on('connection', (socket) => {
    socket.on('join_room', (data) => {
      // Handle both old format (string) and new format (object)
      const roomId = typeof data === 'string' ? data : data?.roomId;
      const userId = typeof data === 'object' ? data?.userId : null;
      
      if (!roomId) return;
      console.log(`🔌 Socket ${socket.id} joining room:${roomId}${userId ? ` (user: ${userId})` : ''}`);
      socket.join(`room:${roomId}`);
      socket.emit('joined_room', { roomId });
      console.log(`✅ Socket ${socket.id} joined room:${roomId}`);
    });
    
    socket.on('start_game', (data) => {
      const { roomId, gameId, game } = data;
      if (!roomId) return;
      console.log(`🎮 Broadcasting game start to room:${roomId}, game:${gameId}`);
      io.to(`room:${roomId}`).emit('game_started', { 
        roomId, 
        gameId,
        game: game || { id: gameId } 
      });
    });
  });
  
  console.log('✅ Socket.IO connection handlers registered');
};

// Helper function to broadcast seat updates
async function broadcastSeats(io, getDb, roomId) {
  try {
    if (!io) return;
    const db = getDb();
    if (!db) return;
    const { rows } = await db.query(
      `SELECT seat_index, user_id, status, chips_in_play FROM room_seats WHERE room_id=$1 ORDER BY seat_index ASC`,
      [roomId]
    );
    io.to(`room:${roomId}`).emit('seat_update', { roomId, seats: rows });
  } catch (e) {
    console.warn('Seat broadcast failed:', e.message);
  }
}

module.exports.broadcastSeats = broadcastSeats;

