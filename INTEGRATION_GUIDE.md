# 🃏 Entropoker Integration Guide

## Overview
This guide helps you integrate your room management system with the game logic and hashing algorithm that has been implemented.

## 🎯 What's Already Implemented

### ✅ Game Logic (Complete)
- **Hand Evaluation**: All poker hand types with proper kicker logic
- **Game State Machine**: Complete betting rounds and phase transitions
- **Pot Management**: Main pot and side pot calculations
- **Showdown Logic**: Winner determination and pot distribution
- **AI Players**: Fast, responsive AI decision making

### ✅ Hashing Algorithm (Complete)
- **Entropy Collection**: Twitch/YouTube entropy sources
- **Cryptographic Mixing**: SHA-256 with HMAC for security
- **Provably Fair**: Cryptographic proof generation and verification
- **Shuffle Algorithm**: Fisher-Yates with entropy-seeded RNG

## 🔌 Integration Points

### 1. Data Schema (`apps/web/types/game.ts`)

The complete data schema is defined with all necessary interfaces:

```typescript
// Core game types
export interface GameState {
  id: string
  phase: GamePhase
  pot: number
  sidePots: SidePot[]
  currentBet: number
  minRaise: number
  maxRaise: number
  communityCards: Card[]
  players: Player[]
  dealer: number
  currentPlayer: number
  smallBlindAmount: number
  bigBlindAmount: number
  deck: any // Deck state for entropy tracking
  entropyHash?: string
  shuffleTimestamp?: number
  handNumber: number
  startTime: number
  lastActionTime: number
  turnTimeout: number
  gameHistory: GameHistoryEntry[]
}

// Player with all necessary fields
export interface Player {
  id: string
  name: string
  chips: number
  cards: Card[]
  currentBet: number
  isFolded: boolean
  isAllIn: boolean
  isDealer: boolean
  isSmallBlind: boolean
  isBigBlind: boolean
  lastAction?: PlayerAction
  lastActionAmount?: number
  position: number
  isActive: boolean
  isOnline: boolean
  timeBank: number
  avatar?: string
  totalHandsPlayed: number
  totalWinnings: number
  biggestPot: number
}
```

### 2. State Management Interface (`apps/web/types/state-management.ts`)

Complete interfaces for your room management:

```typescript
export interface GameStateManager {
  // Core state management
  getGameState(gameId: string): GameState | null
  updateGameState(gameId: string, updates: Partial<GameState>): void
  setGameState(gameId: string, gameState: GameState): void
  
  // Player management
  addPlayer(gameId: string, player: Player): void
  removePlayer(gameId: string, playerId: string): void
  updatePlayer(gameId: string, playerId: string, updates: Partial<Player>): void
  
  // Room management
  createRoom(room: GameRoom): void
  getRoom(roomId: string): GameRoom | null
  updateRoom(roomId: string, updates: Partial<GameRoom>): void
  
  // Game flow management
  startGame(gameId: string): void
  endGame(gameId: string, results: GameResult): void
  dealCards(gameId: string): void
  advancePhase(gameId: string): void
  processPlayerAction(gameId: string, playerId: string, action: string, amount?: number): void
}
```

### 3. Socket.IO Events (`apps/web/types/game.ts`)

Complete event types for real-time communication:

```typescript
export interface SocketEvents {
  // Game state updates
  'game-state-update': GameState
  'player-joined': { playerId: string; player: Player }
  'player-left': { playerId: string }
  'player-action': { playerId: string; action: PlayerAction; amount?: number }
  'phase-change': { phase: GamePhase; communityCards?: Card[] }
  'showdown-results': GameResult
  
  // Player actions
  'fold': { playerId: string }
  'check': { playerId: string }
  'call': { playerId: string; amount: number }
  'bet': { playerId: string; amount: number }
  'raise': { playerId: string; amount: number }
  'all-in': { playerId: string; amount: number }
  
  // Chat and social
  'chat-message': { playerId: string; message: string; timestamp: number }
  'player-typing': { playerId: string; isTyping: boolean }
  
  // Game management
  'game-created': { gameId: string; gameState: GameState }
  'game-started': { gameId: string; gameState: GameState }
  'game-ended': { gameId: string; results: GameResult }
  'hand-complete': { handNumber: number; results: GameResult }
  
  // Entropy and fairness
  'entropy-update': { 
    totalEntropyBits: number
    sources: Array<{ id: string; name: string; entropyBits: number; status: string }>
    lastUpdate: number
  }
  'shuffle-proof': { 
    entropyHash: string
    timestamp: number
    sources: string[]
    proof: string
  }
}
```

## 🚀 Implementation Steps

### Step 1: Replace Default Implementations

Replace the placeholder implementations in `apps/web/types/state-management.ts`:

```typescript
// Replace DefaultGameStateManager with your implementation
export class YourGameStateManager implements GameStateManager {
  // Implement all methods with your room management logic
  getGameState(gameId: string): GameState | null {
    // Your implementation
  }
  
  updateGameState(gameId: string, updates: Partial<GameState>): void {
    // Your implementation
  }
  
  // ... implement all other methods
}
```

### Step 2: Connect to Game Engine

Import and use the game engine in your state manager:

```typescript
import { GameStateMachine } from '@entropoker/game-engine'
import { HandEvaluator } from '@entropoker/game-engine'
import { EntropyShuffler } from '@entropoker/game-engine'

export class YourGameStateManager implements GameStateManager {
  private gameMachines = new Map<string, GameStateMachine>()
  
  processPlayerAction(gameId: string, playerId: string, action: string, amount?: number): void {
    const gameMachine = this.gameMachines.get(gameId)
    if (!gameMachine) return
    
    // Use the game engine to process the action
    const result = gameMachine.processAction({
      type: 'player_action',
      playerId,
      action,
      amount,
      timestamp: Date.now()
    })
    
    // Update your state and emit to clients
    this.updateGameState(gameId, result)
    this.emitToRoom(gameId, 'game-state-update', result)
  }
}
```

### Step 3: Integrate Entropy System

Connect the entropy system to your shuffling:

```typescript
import { CSPRNG } from '@entropoker/entropy-core'
import { EntropyShuffler } from '@entropoker/game-engine'

export class YourEntropyManager implements EntropyManager {
  private csprng = new CSPRNG({
    minSources: 2,
    minEntropyBits: 128,
    mixingRounds: 3,
    outputFormat: 'hex',
    sources: []
  })
  
  async generateShuffleSeed(): Promise<string> {
    const seed = this.csprng.generateShuffleSeed()
    return seed.seed
  }
  
  createFairnessProof(gameId: string): string {
    // Use the entropy system to create fairness proof
    return this.csprng.createFairnessProof(gameId)
  }
}
```

### Step 4: Socket.IO Integration

Connect your Socket.IO server to the game logic:

```typescript
// In your Socket.IO server
io.on('connection', (socket) => {
  socket.on('join-game', (data) => {
    const { gameId, playerId } = data
    socket.join(gameId)
    
    // Add player to game
    gameManager.state.addPlayer(gameId, {
      id: playerId,
      name: `Player ${playerId}`,
      chips: 1000,
      cards: [],
      currentBet: 0,
      isFolded: false,
      isAllIn: false,
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      position: 0,
      isActive: true,
      isOnline: true,
      timeBank: 30,
      totalHandsPlayed: 0,
      totalWinnings: 0,
      biggestPot: 0
    })
    
    // Emit updated game state
    const gameState = gameManager.state.getGameState(gameId)
    socket.emit('game-state-update', gameState)
  })
  
  socket.on('player-action', (data) => {
    const { gameId, playerId, action, amount } = data
    
    // Process action through game engine
    await gameManager.playerAction(gameId, playerId, action, amount)
    
    // Get updated state and emit to room
    const gameState = gameManager.state.getGameState(gameId)
    io.to(gameId).emit('game-state-update', gameState)
  })
})
```

## 📊 Database Integration

The Prisma schema is already set up. Use it in your database manager:

```typescript
import { PrismaClient } from '@prisma/client'

export class YourDatabaseManager implements DatabaseManager {
  private prisma = new PrismaClient()
  
  async saveGame(game: any): Promise<void> {
    await this.prisma.game.create({
      data: {
        id: game.id,
        name: game.name,
        status: game.status,
        maxPlayers: game.maxPlayers,
        minPlayers: game.minPlayers,
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        buyIn: game.buyIn,
        entropyHash: game.entropyHash,
        shuffleTimestamp: game.shuffleTimestamp
      }
    })
  }
  
  async loadGame(gameId: string): Promise<any | null> {
    return await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        hands: true
      }
    })
  }
}
```

## 🎮 Game Flow Integration

### Starting a Game
```typescript
async startGame(gameId: string): Promise<void> {
  // 1. Generate entropy for shuffling
  const entropySeed = await this.entropy.generateShuffleSeed()
  
  // 2. Create and shuffle deck
  const shuffler = new EntropyShuffler(this.entropy)
  const shuffleResult = await shuffler.createAndShuffleDeck()
  
  // 3. Initialize game state
  const gameState: GameState = {
    id: gameId,
    phase: 'preflop',
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaise: 20,
    maxRaise: 1000,
    communityCards: [],
    players: this.getPlayers(gameId),
    dealer: 0,
    currentPlayer: 0,
    smallBlindAmount: 10,
    bigBlindAmount: 20,
    deck: shuffleResult.deck,
    entropyHash: shuffleResult.entropyHash,
    shuffleTimestamp: shuffleResult.shuffleTimestamp,
    handNumber: 1,
    startTime: Date.now(),
    lastActionTime: Date.now(),
    turnTimeout: 30,
    gameHistory: []
  }
  
  // 4. Update state and emit
  this.state.setGameState(gameId, gameState)
  this.emitToRoom(gameId, 'game-started', { gameId, gameState })
}
```

### Processing Player Actions
```typescript
async playerAction(gameId: string, playerId: string, action: string, amount?: number): Promise<void> {
  // 1. Validate action
  const gameState = this.state.getGameState(gameId)
  if (!gameState) return
  
  // 2. Process through game engine
  const gameMachine = new GameStateMachine(gameState)
  const result = gameMachine.processAction({
    type: 'player_action',
    playerId,
    action,
    amount,
    timestamp: Date.now()
  })
  
  // 3. Update state
  this.state.setGameState(gameId, result)
  
  // 4. Emit to clients
  this.emitToRoom(gameId, 'player-action', { playerId, action, amount })
  this.emitToRoom(gameId, 'game-state-update', result)
  
  // 5. Check for phase changes
  if (result.phase !== gameState.phase) {
    this.emitToRoom(gameId, 'phase-change', { 
      phase: result.phase, 
      communityCards: result.communityCards 
    })
  }
  
  // 6. Check for showdown
  if (result.phase === 'showdown') {
    const winners = gameMachine.determineWinners()
    this.emitToRoom(gameId, 'showdown-results', winners)
  }
}
```

## 🔐 Entropy Integration

### Real-time Entropy Updates
```typescript
// Start entropy collection
this.entropy.startEntropyCollection()

// Emit entropy updates to clients
setInterval(() => {
  const stats = this.entropy.getEntropyStats()
  this.broadcastToAll('entropy-update', {
    totalEntropyBits: stats.totalEntropyBits,
    sources: stats.sources,
    lastUpdate: Date.now()
  })
}, 1000)
```

### Fairness Verification
```typescript
// Create fairness proof for each hand
const fairnessProof = this.entropy.createFairnessProof(gameId)
this.emitToRoom(gameId, 'shuffle-proof', {
  entropyHash: fairnessProof,
  timestamp: Date.now(),
  sources: ['twitch:pokergame', 'youtube:livepoker'],
  proof: fairnessProof
})
```

## 🧪 Testing Your Integration

### Test Game Flow
```typescript
// Test a complete hand
const gameId = 'test-game'
await gameManager.createGame({ buyIn: 1000, smallBlind: 10, bigBlind: 20 })
await gameManager.joinGame(gameId, 'player1')
await gameManager.joinGame(gameId, 'player2')
await gameManager.startGame(gameId)

// Test player actions
await gameManager.playerAction(gameId, 'player1', 'call', 20)
await gameManager.playerAction(gameId, 'player2', 'raise', 40)
await gameManager.playerAction(gameId, 'player1', 'call', 40)
```

## 📋 Checklist for Your Implementation

- [ ] Replace `DefaultGameStateManager` with your implementation
- [ ] Replace `DefaultSocketManager` with your Socket.IO logic
- [ ] Replace `DefaultDatabaseManager` with your database integration
- [ ] Replace `DefaultEntropyManager` with entropy system integration
- [ ] Connect game engine to your state management
- [ ] Implement real-time event emission
- [ ] Add proper error handling and validation
- [ ] Test complete game flow
- [ ] Add logging and monitoring
- [ ] Implement reconnection logic

## 🎯 Key Integration Points

1. **Game State Updates**: Use `GameState` interface for all state changes
2. **Player Actions**: Process through `GameStateMachine` for consistency
3. **Entropy Integration**: Use `CSPRNG` and `EntropyShuffler` for fairness
4. **Socket Events**: Use `SocketEvents` interface for type safety
5. **Database Schema**: Use Prisma models for persistence

Your room management system can now plug directly into the game logic and entropy system! 🎉 