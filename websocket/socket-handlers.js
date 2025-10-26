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
    
    // RECONNECT-FIRST HANDSHAKE
    socket.on('authenticate', async (data) => {
      try {
        const { userId, seatToken, roomId } = data;
        
        if (!userId) {
          socket.emit('auth_error', { error: 'Missing userId' });
          return;
        }
        
        // Get SessionService from Socket.IO instance (set during init)
        const sessionService = io.sessionService || io.engine?.httpServer?.app?.locals?.sessionService;
        if (!sessionService) {
          console.warn('SessionService not available for authentication', {
            hasIoSessionService: !!io.sessionService,
            hasHttpServer: !!io.engine?.httpServer,
            hasAppLocals: !!io.engine?.httpServer?.app?.locals
          });
          socket.emit('auth_error', { error: 'Session service unavailable' });
          return;
        }
        
        // Track socket -> user
        socketUserMap.set(socket.id, userId);
        socket.userId = userId;
        
        // Restore session
        const session = await sessionService.getOrCreateSession(userId);
        
        // If seatToken provided, verify and restore seat binding
        let seatBinding = null;
        if (seatToken) {
          try {
            seatBinding = await sessionService.verifySeatToken(seatToken);
            console.log(`♻️  Seat restored for user ${userId}:`, seatBinding);
          } catch (error) {
            console.warn(`Failed to restore seat: ${error.message}`);
          }
        } else if (roomId) {
          // Check if user has existing seat in room
          seatBinding = await sessionService.getUserSeat(userId);
        }
        
        // Join room if bound to seat
        if (seatBinding && seatBinding.roomId) {
          socket.join(`room:${seatBinding.roomId}`);
          console.log(`✅ User ${userId} reconnected to room ${seatBinding.roomId}, seat ${seatBinding.seatIndex}`);
        }
        
        socket.emit('authenticated', {
          userId,
          session,
          seatBinding
        });
        
        // Send state_sync for hydration if we have room context
        const effectiveRoomId = roomId || seatBinding?.roomId;
        if (effectiveRoomId && io.engine?.httpServer?.app?.locals) {
          const { getDb, dbV2 } = io.engine.httpServer.app.locals;
          
          try {
            const db = getDb();
            const currentSeq = dbV2 ? await dbV2.getCurrentSequence(effectiveRoomId) : 0;
            
            // Quick check if user has a seat in this room
            const seatCheck = await db.query(
              'SELECT seat_index FROM room_seats WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL',
              [effectiveRoomId, userId]
            );
            
            if (seatCheck.rowCount > 0) {
              console.log('🌊 [SOCKET] Sending state_sync for hydration:', userId, 'room:', effectiveRoomId);
              
              // Signal client to fetch hydration data
              socket.emit('state_sync', {
                type: 'state_sync',
                version: '1.0.0',
                seq: currentSeq,
                timestamp: Date.now(),
                payload: {
                  roomId: effectiveRoomId,
                  userId,
                  fetchViaHttp: true // Client should call /hydrate endpoint
                }
              });
            }
          } catch (error) {
            console.error('State sync error:', error);
          }
        }
        
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

