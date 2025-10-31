// SOCKET.IO HANDLERS - Extracted from sophisticated-engine-server.js
// Real-time WebSocket communication for poker game with session management

module.exports = function setupSocketIO(io, getDb) {
  if (!io) {
    console.warn('⚠️  Socket.IO not initialized, skipping connection handlers');
    return;
  }
  
  // Store socket -> userId mapping for presence tracking
  const socketUserMap = new Map();
  
  io.on('connection', (socket) => {
    console.log(`🔌 New WebSocket connection: ${socket.id}`);
    
    // MINIMAL TABLE: Simplified authentication (no SessionService dependency)
    socket.on('authenticate', async (data) => {
      try {
        const { userId, roomId } = data;
        
        if (!userId) {
          socket.emit('auth_error', { error: 'Missing userId' });
          return;
        }
        
        // Track socket -> user
        socketUserMap.set(socket.id, userId);
        socket.userId = userId;
        socket.roomId = roomId;
        
        // Join room
        if (roomId) {
          socket.join(`room:${roomId}`);
          console.log(`✅ [MINIMAL] User ${userId} authenticated for room ${roomId}`);
        }
        
        socket.emit('authenticated', { userId, roomId });
        
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { error: error.message });
      }
    });
    
    // JOIN_ROOM - ONLY joins the lobby, does NOT claim seats
    // Seat claiming happens via claimSeat() API endpoint
    socket.on('join_room', async (data) => {
      try {
        const { roomId, userId } = data;
        
        if (!roomId || !userId) {
          socket.emit('join_error', { error: 'Missing roomId or userId' });
          return;
        }
        
        const sessionService = io.sessionService;
        if (sessionService) {
          // Create/restore session (optional, non-blocking)
          await sessionService.getOrCreateSession(userId).catch(err => {
            console.warn('Session creation failed (non-critical):', err.message);
          });
        }
        
        // Join Socket.IO room (just the lobby)
        socket.join(`room:${roomId}`);
        socketUserMap.set(socket.id, userId);
        socket.userId = userId;
        socket.roomId = roomId;
        
        console.log(`✅ User ${userId} joined room ${roomId} (lobby only)`);
        
        socket.emit('joined_room', { 
          roomId, 
          userId
        });
        
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('join_error', { error: error.message });
      }
    });
    
    // HEARTBEAT (keep seat binding alive)
    socket.on('heartbeat', async (data) => {
      try {
        const userId = socket.userId || data?.userId;
        if (!userId) return;
        
        const sessionService = io.sessionService;
        if (!sessionService) return;
        
        const binding = await sessionService.heartbeat(userId);
        if (binding) {
          socket.emit('heartbeat_ack', { status: binding.status });
        }
      } catch (error) {
        console.warn('Heartbeat error:', error.message);
      }
    });
    
    // GO TO TABLE (for seat selection)
    socket.on('go_to_table', (data) => {
      const { roomId } = data;
      if (!roomId) return;
      console.log(`🎰 Broadcasting go_to_table to room:${roomId}`);
      io.to(`room:${roomId}`).emit('go_to_table', {
        type: 'go_to_table',
        version: '1.0.0',
        seq: Date.now(), // Use timestamp as seq for compatibility
        timestamp: Date.now(),
        payload: { roomId }
      });
    });
    
    // START GAME
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
    
    // DISCONNECT (grace period)
    socket.on('disconnect', async () => {
      try {
        const userId = socketUserMap.get(socket.id);
        if (!userId) return;
        
        console.log(`🔌 Socket ${socket.id} disconnected (user: ${userId})`);
        
        const sessionService = io.sessionService;
        if (!sessionService) return;
        
        // Mark player as AWAY (grace period starts)
        const binding = await sessionService.markPlayerAway(userId);
        if (binding) {
          console.log(`⏰ Grace period started for user ${userId} in room ${binding.roomId}`);
          
          // Notify room that player went AWAY
          io.to(`room:${binding.roomId}`).emit('player_away', {
            userId,
            seatIndex: binding.seatIndex,
            gracePeriod: 300 // 5 minutes
          });
          
          // After grace period, release seat if no reconnection
          setTimeout(async () => {
            const currentBinding = await sessionService.getUserSeat(userId);
            if (currentBinding && currentBinding.status === 'AWAY') {
              await sessionService.releaseSeat(userId);
              io.to(`room:${binding.roomId}`).emit('player_timeout', {
                userId,
                seatIndex: binding.seatIndex
              });
              console.log(`⏱️  Grace period expired for user ${userId}, seat released`);
            }
          }, 300000); // 5 minutes
        }
        
        socketUserMap.delete(socket.id);
      } catch (error) {
        console.error('Disconnect handling error:', error);
      }
    });
  });
  
  console.log('✅ Socket.IO connection handlers registered (session-aware)');
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

