import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { 
  SocketEvents, 
  SocketUser, 
  ActionType, 
  Game, 
  HandAction,
  ChatMessage,
  User
} from '../../types';
import { AuthService } from '../services/authService';
import { PokerGameService } from '../services/pokerGameService';
import { logger } from '../utils/logger';

export class SocketServer {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private authService: AuthService;
  private gameService: PokerGameService;
  private connectedUsers: Map<string, SocketUser> = new Map();

  constructor(
    httpServer: HTTPServer,
    prisma: PrismaClient,
    authService: AuthService,
    gameService: PokerGameService
  ) {
    this.prisma = prisma;
    this.authService = authService;
    this.gameService = gameService;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO middleware for authentication
   */
  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const user = await this.authService.verifyToken(token);
        const socketUser: SocketUser = {
          id: user.id,
          username: user.username,
          isAuthenticated: true
        };

        socket.data.user = socketUser;
        this.connectedUsers.set(socket.id, socketUser);
        
        next();
      } catch (error) {
        logger.error('Socket authentication failed', { error, socketId: socket.id });
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const user = socket.data.user as SocketUser;
      
      logger.info('Client connected', { 
        socketId: socket.id, 
        userId: user.id, 
        username: user.username 
      });

      // Handle joining a game
      socket.on('join-game', async (data: SocketEvents['join-game']) => {
        try {
          await this.handleJoinGame(socket, data);
        } catch (error) {
          this.emitError(socket, error as Error);
        }
      });

      // Handle leaving a game
      socket.on('leave-game', async (data: SocketEvents['leave-game']) => {
        try {
          await this.handleLeaveGame(socket, data);
        } catch (error) {
          this.emitError(socket, error as Error);
        }
      });

      // Handle player actions
      socket.on('player-action', async (data: SocketEvents['player-action']) => {
        try {
          await this.handlePlayerAction(socket, data);
        } catch (error) {
          this.emitError(socket, error as Error);
        }
      });

      // Handle chat messages
      socket.on('chat-message', async (data: SocketEvents['chat-message']) => {
        try {
          await this.handleChatMessage(socket, data);
        } catch (error) {
          this.emitError(socket, error as Error);
        }
      });

      // Handle typing indicator
      socket.on('typing', (data: SocketEvents['typing']) => {
        socket.to(data.gameId).emit('typing', {
          userId: user.id,
          username: user.username,
          isTyping: data.isTyping
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle joining a game
   */
  private async handleJoinGame(socket: any, data: SocketEvents['join-game']): Promise<void> {
    const user = socket.data.user as SocketUser;
    const { gameId } = data;

    // Get available seat
    const game = await this.gameService.getGameState(gameId);
    const availableSeat = this.findAvailableSeat(game);

    if (availableSeat === -1) {
      throw new Error('Game is full');
    }

    // Join the game
    const player = await this.gameService.joinGame(gameId, user.id, availableSeat);

    // Join the socket room
    socket.join(gameId);
    socket.data.gameId = gameId;
    user.gameId = gameId;

    // Notify other players
    socket.to(gameId).emit('player-joined', player);

    // Send current game state to the joining player
    const currentGameState = await this.gameService.getGameState(gameId);
    socket.emit('game-updated', currentGameState);

    logger.info('Player joined game', {
      userId: user.id,
      username: user.username,
      gameId,
      seat: availableSeat
    });
  }

  /**
   * Handle leaving a game
   */
  private async handleLeaveGame(socket: any, data: SocketEvents['leave-game']): Promise<void> {
    const user = socket.data.user as SocketUser;
    const { gameId } = data;

    // Leave the game
    await this.gameService.leaveGame(gameId, user.id);

    // Leave the socket room
    socket.leave(gameId);
    delete socket.data.gameId;
    delete user.gameId;

    // Notify other players
    socket.to(gameId).emit('player-left', {
      userId: user.id,
      seat: -1 // Will be determined by the game state
    });

    logger.info('Player left game', {
      userId: user.id,
      username: user.username,
      gameId
    });
  }

  /**
   * Handle player actions
   */
  private async handlePlayerAction(socket: any, data: SocketEvents['player-action']): Promise<void> {
    const user = socket.data.user as SocketUser;
    const { gameId, handId, action, amount, cards } = data;

    // Process the action
    const handAction = await this.gameService.processPlayerAction({
      gameId,
      handId,
      userId: user.id,
      action,
      amount
    });

    // Broadcast the action to all players in the game
    this.io.to(gameId).emit('action-performed', handAction);

    // Update game state for all players
    const updatedGameState = await this.gameService.getGameState(gameId);
    this.io.to(gameId).emit('game-updated', updatedGameState);

    logger.info('Player action processed', {
      userId: user.id,
      username: user.username,
      gameId,
      action,
      amount
    });
  }

  /**
   * Handle chat messages
   */
  private async handleChatMessage(socket: any, data: SocketEvents['chat-message']): Promise<void> {
    const user = socket.data.user as SocketUser;
    const { gameId, message } = data;

    // Validate message
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 500) {
      throw new Error('Message too long');
    }

    // Create chat message
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        userId: user.id,
        gameId,
        message: message.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // Broadcast to all players in the game
    this.io.to(gameId).emit('chat-message-received', chatMessage);

    logger.info('Chat message sent', {
      userId: user.id,
      username: user.username,
      gameId,
      messageLength: message.length
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnect(socket: any): void {
    const user = socket.data.user as SocketUser;
    
    // Remove from connected users
    this.connectedUsers.delete(socket.id);

    // If user was in a game, notify other players
    if (user.gameId) {
      socket.to(user.gameId).emit('player-left', {
        userId: user.id,
        seat: -1
      });
    }

    // Update user's online status
    this.authService.logout(user.id).catch(error => {
      logger.error('Failed to update user offline status', { error, userId: user.id });
    });

    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: user.id,
      username: user.username
    });
  }

  /**
   * Find available seat in a game
   */
  private findAvailableSeat(game: Game): number {
    const occupiedSeats = game.players.map(p => p.seat);
    
    for (let i = 0; i < game.maxPlayers; i++) {
      if (!occupiedSeats.includes(i)) {
        return i;
      }
    }
    
    return -1; // No available seats
  }

  /**
   * Emit error to client
   */
  private emitError(socket: any, error: Error): void {
    socket.emit('error', {
      message: error.message,
      code: error.name
    });

    logger.error('Socket error', {
      socketId: socket.id,
      error: error.message,
      userId: socket.data.user?.id
    });
  }

  /**
   * Broadcast notification to all connected users
   */
  public broadcastNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.io.emit('notification', { message, type });
  }

  /**
   * Send notification to specific user
   */
  public sendNotificationToUser(userId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    // Find socket for user
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.id === userId) {
        this.io.to(socketId).emit('notification', { message, type });
        break;
      }
    }
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get online users
   */
  public getOnlineUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Get Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
} 