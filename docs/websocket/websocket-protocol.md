# WEBSOCKET PROTOCOL

## Overview
The WebSocket protocol provides real-time bidirectional communication between the poker engine and clients. This document outlines the complete message protocol, connection management, and event handling for the poker application.

## Connection Architecture

### 1. Connection Flow
```
Client → WebSocket Gateway → Authentication → Game Room Assignment → Real-time Events
  ↓           ↓                ↓              ↓                    ↓
Connect   Load Balance    JWT Validation   Room Join         Event Broadcasting
```

### 2. Connection Management
```typescript
interface WebSocketConnection {
  id: string;
  userId: string;
  gameId?: string;
  playerId?: string;
  isAuthenticated: boolean;
  lastHeartbeat: number;
  connectionQuality: 'good' | 'poor' | 'disconnected';
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
}
```

## Authentication Protocol

### 1. Connection Authentication
```typescript
// Client sends authentication message
interface AuthMessage {
  type: 'auth';
  token: string; // JWT token
  userId: string;
}

// Server responds with authentication result
interface AuthResponse {
  type: 'auth_response';
  success: boolean;
  userId?: string;
  error?: string;
  gameId?: string;
  playerId?: string;
}
```

### 2. Authentication Flow
```typescript
class WebSocketAuthHandler {
  async authenticateConnection(socket: WebSocket, message: AuthMessage): Promise<AuthResponse> {
    try {
      // Validate JWT token
      const decoded = jwt.verify(message.token, process.env.JWT_SECRET);
      
      // Check if user exists and is active
      const user = await this.userService.getUser(decoded.userId);
      if (!user || user.isBanned) {
        return {
          type: 'auth_response',
          success: false,
          error: 'User not found or banned'
        };
      }
      
      // Associate socket with user
      socket.userId = decoded.userId;
      socket.isAuthenticated = true;
      
      // Check if user is in active game
      const activeGame = await this.gameService.getActiveGame(decoded.userId);
      
      return {
        type: 'auth_response',
        success: true,
        userId: decoded.userId,
        gameId: activeGame?.id,
        playerId: activeGame?.playerId
      };
    } catch (error) {
      return {
        type: 'auth_response',
        success: false,
        error: 'Invalid token'
      };
    }
  }
}
```

## Message Protocol

### 1. Client to Server Messages

#### Join Game
```typescript
interface JoinGameMessage {
  type: 'join_game';
  gameId: string;
  buyInAmount?: number;
}

interface JoinGameResponse {
  type: 'join_game_response';
  success: boolean;
  gameId?: string;
  playerId?: string;
  position?: number;
  error?: string;
}
```

#### Leave Game
```typescript
interface LeaveGameMessage {
  type: 'leave_game';
  gameId: string;
}

interface LeaveGameResponse {
  type: 'leave_game_response';
  success: boolean;
  error?: string;
}
```

#### Player Action
```typescript
interface PlayerActionMessage {
  type: 'player_action';
  gameId: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
  amount?: number;
}

interface PlayerActionResponse {
  type: 'player_action_response';
  success: boolean;
  error?: string;
  actionId?: string;
}
```

#### Reconnect
```typescript
interface ReconnectMessage {
  type: 'reconnect';
  gameId: string;
  playerId: string;
}

interface ReconnectResponse {
  type: 'reconnect_response';
  success: boolean;
  gameState?: GameState;
  error?: string;
}
```

### 2. Server to Client Messages

#### Game State Updates
```typescript
interface GameStateUpdateMessage {
  type: 'game_state_update';
  gameId: string;
  state: GameState;
  timestamp: number;
}

interface GameState {
  id: string;
  players: Player[];
  communityCards: Card[];
  pot: Pot;
  currentBet: number;
  street: Street;
  currentPlayerIndex: number;
  dealerPosition: number;
  handNumber: number;
  entropySeed: string;
  lastActionTime: number;
  status: GameStatus;
}
```

#### Player Action Broadcast
```typescript
interface PlayerActionBroadcastMessage {
  type: 'player_action_broadcast';
  gameId: string;
  playerId: string;
  action: string;
  amount?: number;
  timestamp: number;
}
```

#### Street Change
```typescript
interface StreetChangeMessage {
  type: 'street_change';
  gameId: string;
  street: Street;
  communityCards: Card[];
  timestamp: number;
}
```

#### Hand Results
```typescript
interface HandResultsMessage {
  type: 'hand_results';
  gameId: string;
  handNumber: number;
  winners: Winner[];
  handEvaluations: HandEvaluation[];
  potDistribution: Record<string, number>;
  timestamp: number;
}

interface Winner {
  playerId: string;
  amount: number;
  handRank: string;
  handDescription: string;
}

interface HandEvaluation {
  playerId: string;
  handRank: string;
  handDescription: string;
  holeCards: Card[];
}
```

#### Error Messages
```typescript
interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  timestamp: number;
}
```

## Event Broadcasting

### 1. Game Events
```typescript
class GameEventBroadcaster {
  async broadcastGameStart(gameId: string, gameState: GameState): Promise<void> {
    const message: GameStateUpdateMessage = {
      type: 'game_state_update',
      gameId,
      state: gameState,
      timestamp: Date.now()
    };
    
    await this.broadcastToGame(gameId, message);
  }
  
  async broadcastPlayerAction(gameId: string, playerId: string, action: string, amount?: number): Promise<void> {
    const message: PlayerActionBroadcastMessage = {
      type: 'player_action_broadcast',
      gameId,
      playerId,
      action,
      amount,
      timestamp: Date.now()
    };
    
    await this.broadcastToGame(gameId, message);
  }
  
  async broadcastStreetChange(gameId: string, street: Street, communityCards: Card[]): Promise<void> {
    const message: StreetChangeMessage = {
      type: 'street_change',
      gameId,
      street,
      communityCards,
      timestamp: Date.now()
    };
    
    await this.broadcastToGame(gameId, message);
  }
  
  async broadcastHandResults(gameId: string, results: HandResults): Promise<void> {
    const message: HandResultsMessage = {
      type: 'hand_results',
      gameId,
      handNumber: results.handNumber,
      winners: results.winners,
      handEvaluations: results.handEvaluations,
      potDistribution: results.potDistribution,
      timestamp: Date.now()
    };
    
    await this.broadcastToGame(gameId, message);
  }
}
```

### 2. Private Messages
```typescript
class PrivateMessageSender {
  async sendHoleCards(playerId: string, holeCards: Card[]): Promise<void> {
    const message = {
      type: 'hole_cards',
      cards: holeCards,
      timestamp: Date.now()
    };
    
    await this.sendToPlayer(playerId, message);
  }
  
  async sendValidActions(playerId: string, validActions: ValidAction[]): Promise<void> {
    const message = {
      type: 'valid_actions',
      actions: validActions,
      timestamp: Date.now()
    };
    
    await this.sendToPlayer(playerId, message);
  }
  
  async sendError(playerId: string, error: string): Promise<void> {
    const message: ErrorMessage = {
      type: 'error',
      code: 'INVALID_ACTION',
      message: error,
      timestamp: Date.now()
    };
    
    await this.sendToPlayer(playerId, message);
  }
}
```

## Connection Management

### 1. Connection Pool
```typescript
class ConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private gameRooms: Map<string, Set<string>> = new Map(); // gameId -> connectionIds
  
  addConnection(connection: WebSocketConnection): void {
    this.connections.set(connection.id, connection);
    
    if (connection.gameId) {
      this.addToGameRoom(connection.gameId, connection.id);
    }
  }
  
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection?.gameId) {
      this.removeFromGameRoom(connection.gameId, connectionId);
    }
    
    this.connections.delete(connectionId);
  }
  
  private addToGameRoom(gameId: string, connectionId: string): void {
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set());
    }
    this.gameRooms.get(gameId)!.add(connectionId);
  }
  
  private removeFromGameRoom(gameId: string, connectionId: string): void {
    const room = this.gameRooms.get(gameId);
    if (room) {
      room.delete(connectionId);
      if (room.size === 0) {
        this.gameRooms.delete(gameId);
      }
    }
  }
}
```

### 2. Heartbeat Management
```typescript
class HeartbeatManager {
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 90000; // 90 seconds
  
  startHeartbeat(connection: WebSocketConnection): void {
    const heartbeat = setInterval(() => {
      this.sendHeartbeat(connection);
    }, this.HEARTBEAT_INTERVAL);
    
    connection.heartbeatInterval = heartbeat;
  }
  
  private sendHeartbeat(connection: WebSocketConnection): void {
    const message = {
      type: 'heartbeat',
      timestamp: Date.now()
    };
    
    connection.send(JSON.stringify(message));
  }
  
  handleHeartbeatResponse(connection: WebSocketConnection): void {
    connection.lastHeartbeat = Date.now();
  }
  
  checkConnectionHealth(): void {
    const now = Date.now();
    
    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
        this.disconnectConnection(connectionId, 'Heartbeat timeout');
      }
    }
  }
}
```

## Error Handling

### 1. Connection Errors
```typescript
class WebSocketErrorHandler {
  handleConnectionError(socket: WebSocket, error: Error): void {
    console.error('WebSocket connection error:', error);
    
    const errorMessage: ErrorMessage = {
      type: 'error',
      code: 'CONNECTION_ERROR',
      message: 'Connection error occurred',
      timestamp: Date.now()
    };
    
    socket.send(JSON.stringify(errorMessage));
  }
  
  handleMessageError(socket: WebSocket, error: Error, message: any): void {
    console.error('WebSocket message error:', error, message);
    
    const errorMessage: ErrorMessage = {
      type: 'error',
      code: 'MESSAGE_ERROR',
      message: 'Invalid message format',
      timestamp: Date.now()
    };
    
    socket.send(JSON.stringify(errorMessage));
  }
}
```

### 2. Reconnection Logic
```typescript
class ReconnectionHandler {
  async handleReconnection(userId: string, gameId: string): Promise<ReconnectResponse> {
    try {
      // Check if user was in active game
      const game = await this.gameService.getGame(gameId);
      const player = game.players.find(p => p.userId === userId);
      
      if (!player) {
        return {
          type: 'reconnect_response',
          success: false,
          error: 'Player not found in game'
        };
      }
      
      // Validate game state
      if (game.status === 'completed') {
        return {
          type: 'reconnect_response',
          success: false,
          error: 'Game already completed'
        };
      }
      
      return {
        type: 'reconnect_response',
        success: true,
        gameState: game.currentState
      };
    } catch (error) {
      return {
        type: 'reconnect_response',
        success: false,
        error: 'Failed to reconnect'
      };
    }
  }
}
```

## Performance Optimization

### 1. Message Compression
```typescript
class MessageCompressor {
  compressMessage(message: any): string {
    // Remove unnecessary fields for smaller payload
    const compressed = {
      t: message.type,
      d: message.data,
      ts: message.timestamp
    };
    
    return JSON.stringify(compressed);
  }
  
  decompressMessage(compressed: string): any {
    const parsed = JSON.parse(compressed);
    
    return {
      type: parsed.t,
      data: parsed.d,
      timestamp: parsed.ts
    };
  }
}
```

### 2. Batch Updates
```typescript
class BatchUpdateManager {
  private updateQueue: Map<string, any[]> = new Map();
  private batchTimeout = 100; // 100ms batch window
  
  queueUpdate(gameId: string, update: any): void {
    if (!this.updateQueue.has(gameId)) {
      this.updateQueue.set(gameId, []);
      
      // Schedule batch processing
      setTimeout(() => {
        this.processBatch(gameId);
      }, this.batchTimeout);
    }
    
    this.updateQueue.get(gameId)!.push(update);
  }
  
  private async processBatch(gameId: string): Promise<void> {
    const updates = this.updateQueue.get(gameId) || [];
    this.updateQueue.delete(gameId);
    
    if (updates.length === 0) return;
    
    // Combine updates into single message
    const batchMessage = {
      type: 'batch_update',
      gameId,
      updates,
      timestamp: Date.now()
    };
    
    await this.broadcastToGame(gameId, batchMessage);
  }
}
```

## Security Measures

### 1. Rate Limiting
```typescript
class WebSocketRateLimiter {
  private readonly MAX_MESSAGES_PER_MINUTE = 60;
  private readonly MAX_ACTIONS_PER_MINUTE = 30;
  private messageCounts: Map<string, number> = new Map();
  private actionCounts: Map<string, number> = new Map();
  
  isRateLimited(userId: string, messageType: string): boolean {
    const key = `${userId}:${messageType}`;
    const count = this.messageCounts.get(key) || 0;
    
    if (count >= this.MAX_MESSAGES_PER_MINUTE) {
      return true;
    }
    
    this.messageCounts.set(key, count + 1);
    return false;
  }
  
  isActionRateLimited(userId: string): boolean {
    const count = this.actionCounts.get(userId) || 0;
    
    if (count >= this.MAX_ACTIONS_PER_MINUTE) {
      return true;
    }
    
    this.actionCounts.set(userId, count + 1);
    return false;
  }
}
```

### 2. Message Validation
```typescript
class MessageValidator {
  validateMessage(message: any): ValidationResult {
    // Check required fields
    if (!message.type) {
      return { valid: false, error: 'Missing message type' };
    }
    
    // Validate message structure based on type
    switch (message.type) {
      case 'player_action':
        return this.validatePlayerAction(message);
      case 'join_game':
        return this.validateJoinGame(message);
      case 'leave_game':
        return this.validateLeaveGame(message);
      default:
        return { valid: false, error: 'Unknown message type' };
    }
  }
  
  private validatePlayerAction(message: any): ValidationResult {
    if (!message.gameId || !message.action) {
      return { valid: false, error: 'Missing required fields' };
    }
    
    const validActions = ['fold', 'check', 'call', 'bet', 'raise', 'all_in'];
    if (!validActions.includes(message.action)) {
      return { valid: false, error: 'Invalid action' };
    }
    
    if (['bet', 'raise'].includes(message.action) && !message.amount) {
      return { valid: false, error: 'Amount required for bet/raise' };
    }
    
    return { valid: true };
  }
}
```

## Monitoring and Metrics

### 1. Connection Metrics
```typescript
class WebSocketMetrics {
  private metrics = {
    activeConnections: 0,
    totalConnections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
    averageLatency: 0
  };
  
  recordConnection(): void {
    this.metrics.activeConnections++;
    this.metrics.totalConnections++;
  }
  
  recordDisconnection(): void {
    this.metrics.activeConnections--;
  }
  
  recordMessageSent(): void {
    this.metrics.messagesSent++;
  }
  
  recordMessageReceived(): void {
    this.metrics.messagesReceived++;
  }
  
  recordError(): void {
    this.metrics.errors++;
  }
  
  getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }
}
```

### 2. Health Monitoring
```typescript
class WebSocketHealthMonitor {
  async checkHealth(): Promise<HealthStatus> {
    const checks = [
      this.checkConnectionCount(),
      this.checkMessageRate(),
      this.checkErrorRate(),
      this.checkLatency()
    ];
    
    const results = await Promise.all(checks);
    
    return {
      isHealthy: results.every(check => check.healthy),
      checks: results,
      timestamp: new Date()
    };
  }
  
  private async checkConnectionCount(): Promise<HealthCheck> {
    const activeConnections = this.connectionManager.getActiveConnectionCount();
    
    return {
      name: 'connection_count',
      healthy: activeConnections < 10000, // Max 10k connections
      value: activeConnections,
      threshold: 10000
    };
  }
}
```

This comprehensive WebSocket protocol ensures reliable, secure, and performant real-time communication for the poker engine with proper error handling, monitoring, and scalability. 