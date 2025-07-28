import { GameState, Player, GameRoom, GameResult, SocketEvents } from './game'

// State Management Interface for Room Management Integration
export interface GameStateManager {
  // Core state management
  getGameState(gameId: string): GameState | null
  updateGameState(gameId: string, updates: Partial<GameState>): void
  setGameState(gameId: string, gameState: GameState): void
  
  // Player management
  addPlayer(gameId: string, player: Player): void
  removePlayer(gameId: string, playerId: string): void
  updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): void
  getPlayer(gameId: string, playerId: string): Player | null
  getPlayers(gameId: string): Player[]
  
  // Room management
  createRoom(room: GameRoom): void
  getRoom(roomId: string): GameRoom | null
  updateRoom(roomId: string, updates: Partial<GameRoom>): void
  deleteRoom(roomId: string): void
  getAllRooms(): GameRoom[]
  
  // Game flow management
  startGame(gameId: string): void
  endGame(gameId: string, results: GameResult): void
  dealCards(gameId: string): void
  advancePhase(gameId: string): void
  processPlayerAction(gameId: string, playerId: string, action: string, amount?: number): void
  
  // Entropy integration
  updateEntropy(gameId: string, entropyData: any): void
  getEntropyHash(gameId: string): string | null
  
  // Event emission
  emitToRoom(roomId: string, event: keyof SocketEvents, data: any): void
  emitToPlayer(playerId: string, event: keyof SocketEvents, data: any): void
  broadcastToAll(event: keyof SocketEvents, data: any): void
}

// Socket.IO Integration Interface
export interface SocketManager {
  // Connection management
  connectPlayer(playerId: string, socketId: string): void
  disconnectPlayer(playerId: string): void
  getPlayerSocket(playerId: string): string | null
  getSocketPlayer(socketId: string): string | null
  
  // Room management
  joinRoom(socketId: string, roomId: string): void
  leaveRoom(socketId: string, roomId: string): void
  getRoomPlayers(roomId: string): string[]
  
  // Event handling
  onPlayerAction(callback: (data: { playerId: string; action: string; amount?: number }) => void): void
  onPlayerJoin(callback: (data: { playerId: string; roomId: string }) => void): void
  onPlayerLeave(callback: (data: { playerId: string; roomId: string }) => void): void
  onChatMessage(callback: (data: { playerId: string; message: string }) => void): void
}

// Database Integration Interface
export interface DatabaseManager {
  // Game persistence
  saveGame(game: any): Promise<void>
  loadGame(gameId: string): Promise<any | null>
  updateGame(gameId: string, updates: any): Promise<void>
  deleteGame(gameId: string): Promise<void>
  
  // Player persistence
  savePlayer(player: any): Promise<void>
  loadPlayer(playerId: string): Promise<any | null>
  updatePlayer(playerId: string, updates: any): Promise<void>
  
  // Hand history
  saveHand(hand: any): Promise<void>
  loadHandHistory(gameId: string): Promise<any[]>
  
  // Analytics
  getPlayerStats(playerId: string): Promise<any>
  getGameStats(gameId: string): Promise<any>
}

// Entropy Integration Interface
export interface EntropyManager {
  // Entropy collection
  startEntropyCollection(): void
  stopEntropyCollection(): void
  getEntropyStats(): any
  
  // Shuffle management
  generateShuffleSeed(): Promise<string>
  verifyShuffleProof(proof: string): boolean
  
  // Fairness verification
  createFairnessProof(gameId: string): string
  verifyFairness(gameId: string, proof: string): boolean
}

// Complete Integration Interface for Your Friend
export interface PokerGameManager {
  // Core managers
  state: GameStateManager
  socket: SocketManager
  database: DatabaseManager
  entropy: EntropyManager
  
  // High-level game operations
  createGame(settings: any): Promise<string>
  joinGame(gameId: string, playerId: string): Promise<boolean>
  leaveGame(gameId: string, playerId: string): Promise<void>
  startGame(gameId: string): Promise<void>
  endGame(gameId: string): Promise<void>
  
  // Player actions
  playerAction(gameId: string, playerId: string, action: string, amount?: number): Promise<void>
  chatMessage(gameId: string, playerId: string, message: string): Promise<void>
  
  // Game state queries
  getCurrentGameState(gameId: string): GameState | null
  getPlayerInfo(gameId: string, playerId: string): Player | null
  getGameHistory(gameId: string): any[]
  
  // Entropy and fairness
  getEntropyStatus(gameId: string): any
  verifyGameFairness(gameId: string): boolean
  
  // Event listeners for your friend's integration
  onGameStateChange(callback: (gameId: string, gameState: GameState) => void): void
  onPlayerAction(callback: (gameId: string, playerId: string, action: string) => void): void
  onGameEnd(callback: (gameId: string, results: GameResult) => void): void
  onEntropyUpdate(callback: (gameId: string, entropyData: any) => void): void
}

// Implementation example for your friend
export class DefaultPokerGameManager implements PokerGameManager {
  state: GameStateManager
  socket: SocketManager
  database: DatabaseManager
  entropy: EntropyManager
  
  constructor() {
    // Your friend can implement these interfaces
    this.state = new DefaultGameStateManager()
    this.socket = new DefaultSocketManager()
    this.database = new DefaultDatabaseManager()
    this.entropy = new DefaultEntropyManager()
  }
  
  // Implementation methods...
  async createGame(settings: any): Promise<string> {
    // Implementation for your friend
    return 'game-id'
  }
  
  async joinGame(gameId: string, playerId: string): Promise<boolean> {
    // Implementation for your friend
    return true
  }
  
  async leaveGame(gameId: string, playerId: string): Promise<void> {
    // Implementation for your friend
  }
  
  async startGame(gameId: string): Promise<void> {
    // Implementation for your friend
  }
  
  async endGame(gameId: string): Promise<void> {
    // Implementation for your friend
  }
  
  async playerAction(gameId: string, playerId: string, action: string, amount?: number): Promise<void> {
    // Implementation for your friend
  }
  
  async chatMessage(gameId: string, playerId: string, message: string): Promise<void> {
    // Implementation for your friend
  }
  
  getCurrentGameState(gameId: string): any {
    // Implementation for your friend
    return null
  }
  
  getPlayerInfo(gameId: string, playerId: string): any {
    // Implementation for your friend
    return null
  }
  
  getGameHistory(gameId: string): any[] {
    // Implementation for your friend
    return []
  }
  
  getEntropyStatus(gameId: string): any {
    // Implementation for your friend
    return {}
  }
  
  verifyGameFairness(gameId: string): boolean {
    // Implementation for your friend
    return true
  }
  
  onGameStateChange(callback: (gameId: string, gameState: any) => void): void {
    // Implementation for your friend
  }
  
  onPlayerAction(callback: (gameId: string, playerId: string, action: string) => void): void {
    // Implementation for your friend
  }
  
  onGameEnd(callback: (gameId: string, results: any) => void): void {
    // Implementation for your friend
  }
  
  onEntropyUpdate(callback: (gameId: string, entropyData: any) => void): void {
    // Implementation for your friend
  }
}

// Placeholder implementations for your friend to replace
export class DefaultGameStateManager implements GameStateManager {
  getGameState(gameId: string): GameState | null { return null }
  updateGameState(gameId: string, updates: Partial<GameState>): void {}
  setGameState(gameId: string, gameState: GameState): void {}
  addPlayer(gameId: string, player: Player): void {}
  removePlayer(gameId: string, playerId: string): void {}
  updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): void {}
  getPlayer(gameId: string, playerId: string): Player | null { return null }
  getPlayers(gameId: string): Player[] { return [] }
  createRoom(room: GameRoom): void {}
  getRoom(roomId: string): GameRoom | null { return null }
  updateRoom(roomId: string, updates: Partial<GameRoom>): void {}
  deleteRoom(roomId: string): void {}
  getAllRooms(): GameRoom[] { return [] }
  startGame(gameId: string): void {}
  endGame(gameId: string, results: GameResult): void {}
  dealCards(gameId: string): void {}
  advancePhase(gameId: string): void {}
  processPlayerAction(gameId: string, playerId: string, action: string, amount?: number): void {}
  updateEntropy(gameId: string, entropyData: any): void {}
  getEntropyHash(gameId: string): string | null { return null }
  emitToRoom(roomId: string, event: keyof SocketEvents, data: any): void {}
  emitToPlayer(playerId: string, event: keyof SocketEvents, data: any): void {}
  broadcastToAll(event: keyof SocketEvents, data: any): void {}
}

export class DefaultSocketManager implements SocketManager {
  connectPlayer(playerId: string, socketId: string): void {}
  disconnectPlayer(playerId: string): void {}
  getPlayerSocket(playerId: string): string | null { return null }
  getSocketPlayer(socketId: string): string | null { return null }
  joinRoom(socketId: string, roomId: string): void {}
  leaveRoom(socketId: string, roomId: string): void {}
  getRoomPlayers(roomId: string): string[] { return [] }
  onPlayerAction(callback: (data: { playerId: string; action: string; amount?: number }) => void): void {}
  onPlayerJoin(callback: (data: { playerId: string; roomId: string }) => void): void {}
  onPlayerLeave(callback: (data: { playerId: string; roomId: string }) => void): void {}
  onChatMessage(callback: (data: { playerId: string; message: string }) => void): void {}
}

export class DefaultDatabaseManager implements DatabaseManager {
  async saveGame(game: any): Promise<void> {}
  async loadGame(gameId: string): Promise<any | null> { return null }
  async updateGame(gameId: string, updates: any): Promise<void> {}
  async deleteGame(gameId: string): Promise<void> {}
  async savePlayer(player: any): Promise<void> {}
  async loadPlayer(playerId: string): Promise<any | null> { return null }
  async updatePlayer(playerId: string, updates: any): Promise<void> {}
  async saveHand(hand: any): Promise<void> {}
  async loadHandHistory(gameId: string): Promise<any[]> { return [] }
  async getPlayerStats(playerId: string): Promise<any> { return {} }
  async getGameStats(gameId: string): Promise<any> { return {} }
}

export class DefaultEntropyManager implements EntropyManager {
  startEntropyCollection(): void {}
  stopEntropyCollection(): void {}
  getEntropyStats(): any { return {} }
  async generateShuffleSeed(): Promise<string> { return '' }
  verifyShuffleProof(proof: string): boolean { return true }
  createFairnessProof(gameId: string): string { return '' }
  verifyFairness(gameId: string, proof: string): boolean { return true }
} 