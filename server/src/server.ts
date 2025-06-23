import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Import our modules (will work after dependencies are installed)
// import { GameEngine } from './services/game-engine';
// import { SecureShuffler } from './shuffling/secure-shuffler';
// import { 
//   ClientToServerEvents, 
//   ServerToClientEvents, 
//   InterServerEvents, 
//   SocketData 
// } from '@poker-app/shared';

const prisma = new PrismaClient();

// Create Fastify instance
const fastify = Fastify({
  logger: true
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
});

await fastify.register(helmet);

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Create HTTP server
const server = createServer(fastify.server);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Store active games and rooms
const activeGames = new Map();
const activeRooms = new Map();

// Generate room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// HTTP Routes
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.post('/api/rooms', async (request, reply) => {
  try {
    const { name, settings } = request.body as any;
    
    // Generate unique room code
    let roomCode: string;
    let existingRoom;
    do {
      roomCode = generateRoomCode();
      existingRoom = await prisma.room.findUnique({
        where: { code: roomCode }
      });
    } while (existingRoom);
    
    // Create room in database
    const room = await prisma.room.create({
      data: {
        code: roomCode,
        name: name || 'Poker Room',
        settings: settings || {},
        isPrivate: false
      }
    });
    
    return { success: true, room };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to create room' });
  }
});

fastify.get('/api/rooms/:code', async (request, reply) => {
  try {
    const { code } = request.params as any;
    
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: true
      }
    });
    
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }
    
    return { success: true, room };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to get room' });
  }
});

fastify.get('/api/rooms', async (request, reply) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isPrivate: false },
      include: {
        _count: {
          select: { players: true }
        }
      },
      take: 20
    });
    
    return { 
      success: true, 
      rooms: rooms.map(room => ({
        ...room,
        currentPlayers: room._count.players
      }))
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Failed to get rooms' });
  }
});

// Socket.io event handlers
io.on('connection', (socket) => {
  fastify.log.info(`Client connected: ${socket.id}`);
  
  // Join room
  socket.on('room:join', async (data) => {
    try {
      const { roomCode, playerName } = data;
      
      // Find room
      const room = await prisma.room.findUnique({
        where: { code: roomCode }
      });
      
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }
      
      // Create or find player
      let player = await prisma.player.findFirst({
        where: { 
          roomId: room.id,
          name: playerName
        }
      });
      
      if (!player) {
        player = await prisma.player.create({
          data: {
            name: playerName,
            roomId: room.id,
            chips: 1000
          }
        });
      } else {
        // Update connection status
        await prisma.player.update({
          where: { id: player.id },
          data: { connected: true }
        });
      }
      
      // Join socket room
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      socket.data.playerName = playerName;
      
      // Emit join success
      socket.emit('room:joined', { room, player });
      
      // Notify other players
      socket.to(room.id).emit('room:player-joined', { player });
      
    } catch (error) {
      fastify.log.error(error);
      socket.emit('room:error', { message: 'Failed to join room' });
    }
  });
  
  // Create room
  socket.on('room:create', async (data) => {
    try {
      const { name, settings } = data;
      
      // Generate room code
      let roomCode: string;
      let existingRoom;
      do {
        roomCode = generateRoomCode();
        existingRoom = await prisma.room.findUnique({
          where: { code: roomCode }
        });
      } while (existingRoom);
      
      // Create room
      const room = await prisma.room.create({
        data: {
          code: roomCode,
          name: name || 'Poker Room',
          settings: settings || {},
          isPrivate: false
        }
      });
      
      // Create player
      const player = await prisma.player.create({
        data: {
          name: 'Host',
          roomId: room.id,
          chips: 1000
        }
      });
      
      // Join socket room
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerId = player.id;
      socket.data.playerName = 'Host';
      
      // Emit create success
      socket.emit('room:created', { room, player });
      
    } catch (error) {
      fastify.log.error(error);
      socket.emit('room:error', { message: 'Failed to create room' });
    }
  });
  
  // Leave room
  socket.on('room:leave', async () => {
    try {
      const { roomId, playerId } = socket.data;
      
      if (roomId && playerId) {
        // Update player connection status
        await prisma.player.update({
          where: { id: playerId },
          data: { connected: false }
        });
        
        // Leave socket room
        socket.leave(roomId);
        
        // Notify other players
        socket.to(roomId).emit('room:player-left', { playerId });
        
        // Clear socket data
        socket.data = {};
        
        socket.emit('room:left');
      }
    } catch (error) {
      fastify.log.error(error);
    }
  });
  
  // Game ready
  socket.on('game:ready', async () => {
    try {
      const { roomId, playerId } = socket.data;
      
      if (roomId && playerId) {
        // Update player status
        await prisma.player.update({
          where: { id: playerId },
          data: { chips: 1000 } // Reset chips for new game
        });
        
        // TODO: Start game logic here
        // This will be implemented when GameEngine is available
        
        socket.emit('game:state-update', { message: 'Game ready' });
      }
    } catch (error) {
      fastify.log.error(error);
    }
  });
  
  // Game action
  socket.on('game:action', async (data) => {
    try {
      const { roomId, playerId } = socket.data;
      
      if (roomId && playerId) {
        // TODO: Process game action
        // This will be implemented when GameEngine is available
        
        socket.emit('game:action-received', { 
          playerId, 
          action: data.action 
        });
      }
    } catch (error) {
      fastify.log.error(error);
      socket.emit('game:invalid-action', { message: 'Invalid action' });
    }
  });
  
  // Chat message
  socket.on('game:chat', (data) => {
    const { roomId, playerId, playerName } = socket.data;
    
    if (roomId) {
      socket.to(roomId).emit('chat:message', {
        playerId,
        message: data.message,
        timestamp: Date.now()
      });
    }
  });
  
  // Ping/Pong
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Disconnect
  socket.on('disconnect', async () => {
    try {
      const { roomId, playerId } = socket.data;
      
      if (roomId && playerId) {
        // Update player connection status
        await prisma.player.update({
          where: { id: playerId },
          data: { connected: false }
        });
        
        // Notify other players
        socket.to(roomId).emit('room:player-left', { playerId });
      }
      
      fastify.log.info(`Client disconnected: ${socket.id}`);
    } catch (error) {
      fastify.log.error(error);
    }
  });
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.ready();
    server.listen(port, host, () => {
      fastify.log.info(`Server listening on ${host}:${port}`);
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start(); 