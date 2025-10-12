# CORE GAME ENGINE IMPLEMENTATION

## Overview
The Core Game Engine is the central orchestrator of the poker game, responsible for managing game flow, state transitions, player actions, and winner determination. This document outlines the complete implementation of the core engine with all its components and interactions.

## Architecture

### 1. Core Engine Structure
```typescript
class GameEngine {
  private stateManager: StateManager;
  private actionProcessor: ActionProcessor;
  private roundManager: RoundManager;
  private potManager: PotManager;
  private handEvaluator: HandEvaluator;
  private entropyService: EntropyService;
  private webSocketService: WebSocketService;
  private databaseService: DatabaseService;
}
```

### 2. Component Responsibilities
- **GameEngine**: Main orchestrator and game flow controller
- **StateManager**: Immutable state transitions and persistence
- **ActionProcessor**: Player action validation and execution
- **RoundManager**: Betting round management and progression
- **PotManager**: Pot calculation and side pot creation
- **HandEvaluator**: Hand ranking and winner determination
- **EntropyService**: External randomness generation
- **WebSocketService**: Real-time communication
- **DatabaseService**: Data persistence and retrieval

## Core Engine Implementation

### 1. GameEngine Class
```typescript
class GameEngine {
  private currentState: GameState;
  private gameId: string;
  private players: Player[];
  private deck: Deck;
  private entropySeed: string;

  constructor(gameId: string) {
    this.gameId = gameId;
    this.stateManager = new StateManager();
    this.actionProcessor = new ActionProcessor();
    this.roundManager = new RoundManager();
    this.potManager = new PotManager();
    this.handEvaluator = new HandEvaluator();
    this.entropyService = new EntropyService();
    this.webSocketService = new WebSocketService();
    this.databaseService = new DatabaseService();
  }

  // Main game lifecycle methods
  async startNewHand(): Promise<void>
  async processPlayerAction(playerId: string, action: Action, amount?: number): Promise<void>
  async advanceStreet(): Promise<void>
  async determineWinners(): Promise<Player[]>
  async distributePot(winners: Player[]): Promise<void>
}
```

### 2. Game Lifecycle Methods

#### startNewHand()
**Purpose**: Initialize a new poker hand
**Process**:
1. Get entropy seed from external sources
2. Shuffle deck with entropy
3. Deal hole cards to players
4. Post blinds
5. Set initial game state
6. Broadcast game start

```typescript
async startNewHand(): Promise<void> {
  try {
    // 1. Get entropy seed
    this.entropySeed = await this.entropyService.getSeed();
    
    // 2. Shuffle deck
    this.deck = new Deck();
    this.deck.shuffle(this.entropySeed);
    
    // 3. Deal hole cards
    await this.dealHoleCards();
    
    // 4. Post blinds
    await this.postBlinds();
    
    // 5. Set initial state
    this.currentState = this.stateManager.createInitialState({
      gameId: this.gameId,
      players: this.players,
      deck: this.deck,
      entropySeed: this.entropySeed,
      street: Street.PREFLOP,
      currentPlayerIndex: this.getFirstActivePlayer()
    });
    
    // 6. Persist state
    await this.databaseService.saveGameState(this.currentState);
    
    // 7. Broadcast game start
    await this.webSocketService.broadcastGameStart(this.currentState);
    
  } catch (error) {
    await this.handleError('startNewHand', error);
  }
}
```

#### processPlayerAction()
**Purpose**: Handle player actions (fold, call, raise, etc.)
**Process**:
1. Validate action
2. Execute action
3. Update game state
4. Check if round complete
5. Broadcast updates

```typescript
async processPlayerAction(playerId: string, action: Action, amount?: number): Promise<void> {
  try {
    // 1. Validate action
    const validation = this.actionProcessor.validateAction(
      this.currentState,
      playerId,
      action,
      amount
    );
    
    if (!validation.isValid) {
      throw new Error(`Invalid action: ${validation.reason}`);
    }
    
    // 2. Execute action
    const newState = this.actionProcessor.executeAction(
      this.currentState,
      playerId,
      action,
      amount
    );
    
    // 3. Update pot
    this.potManager.updatePot(newState);
    
    // 4. Update current state
    this.currentState = newState;
    
    // 5. Persist state
    await this.databaseService.saveGameState(this.currentState);
    
    // 6. Check if round complete
    if (this.roundManager.isRoundComplete(this.currentState)) {
      await this.advanceStreet();
    } else {
      // Move to next player
      this.currentState = this.stateManager.moveToNextPlayer(this.currentState);
      await this.databaseService.saveGameState(this.currentState);
    }
    
    // 7. Broadcast action
    await this.webSocketService.broadcastPlayerAction(
      this.currentState,
      playerId,
      action,
      amount
    );
    
  } catch (error) {
    await this.handleError('processPlayerAction', error);
  }
}
```

#### advanceStreet()
**Purpose**: Progress to next betting round
**Process**:
1. Check current street
2. Deal community cards if needed
3. Reset betting round
4. Update game state
5. Broadcast street change

```typescript
async advanceStreet(): Promise<void> {
  try {
    const currentStreet = this.currentState.street;
    
    switch (currentStreet) {
      case Street.PREFLOP:
        // Deal flop (3 cards)
        await this.dealCommunityCards(3);
        this.currentState = this.stateManager.updateStreet(this.currentState, Street.FLOP);
        break;
        
      case Street.FLOP:
        // Deal turn (1 card)
        await this.dealCommunityCards(1);
        this.currentState = this.stateManager.updateStreet(this.currentState, Street.TURN);
        break;
        
      case Street.TURN:
        // Deal river (1 card)
        await this.dealCommunityCards(1);
        this.currentState = this.stateManager.updateStreet(this.currentState, Street.RIVER);
        break;
        
      case Street.RIVER:
        // Go to showdown
        this.currentState = this.stateManager.updateStreet(this.currentState, Street.SHOWDOWN);
        await this.determineWinners();
        break;
        
      default:
        throw new Error(`Invalid street transition: ${currentStreet}`);
    }
    
    // Reset betting round
    this.currentState = this.roundManager.resetBettingRound(this.currentState);
    
    // Persist state
    await this.databaseService.saveGameState(this.currentState);
    
    // Broadcast street change
    await this.webSocketService.broadcastStreetChange(this.currentState);
    
  } catch (error) {
    await this.handleError('advanceStreet', error);
  }
}
```

#### determineWinners()
**Purpose**: Determine hand winners and distribute pot
**Process**:
1. Evaluate all active player hands
2. Compare hands and find winners
3. Calculate pot distribution
4. Update player balances
5. Broadcast results

```typescript
async determineWinners(): Promise<Player[]> {
  try {
    const activePlayers = this.currentState.players.filter(p => p.status === PlayerStatus.ACTIVE);
    
    if (activePlayers.length === 1) {
      // Single player wins by default
      const winner = activePlayers[0];
      await this.distributePot([winner]);
      return [winner];
    }
    
    // Evaluate all hands
    const playerHands = activePlayers.map(player => ({
      player,
      hand: this.handEvaluator.evaluateHand(
        player.holeCards,
        this.currentState.communityCards
      )
    }));
    
    // Find winners
    const winners = this.handEvaluator.determineWinners(playerHands);
    
    // Distribute pot
    await this.distributePot(winners);
    
    // Broadcast results
    await this.webSocketService.broadcastHandResults(
      this.currentState,
      winners,
      playerHands
    );
    
    return winners;
    
  } catch (error) {
    await this.handleError('determineWinners', error);
  }
}
```

#### distributePot()
**Purpose**: Distribute pot to winners
**Process**:
1. Calculate pot distribution
2. Update player balances
3. Log transactions
4. Broadcast updates

```typescript
async distributePot(winners: Player[]): Promise<void> {
  try {
    const potDistribution = this.potManager.calculatePotDistribution(
      this.currentState.pot,
      winners
    );
    
    // Update player balances
    for (const [playerId, amount] of Object.entries(potDistribution)) {
      const player = this.currentState.players.find(p => p.id === playerId);
      if (player) {
        player.stack += amount;
        
        // Log transaction
        await this.databaseService.logTransaction({
          playerId,
          amount,
          type: 'win',
          gameId: this.gameId,
          handNumber: this.currentState.handNumber
        });
      }
    }
    
    // Update game state
    this.currentState = this.stateManager.updatePlayerBalances(
      this.currentState,
      potDistribution
    );
    
    // Persist state
    await this.databaseService.saveGameState(this.currentState);
    
    // Broadcast pot distribution
    await this.webSocketService.broadcastPotDistribution(
      this.currentState,
      potDistribution
    );
    
  } catch (error) {
    await this.handleError('distributePot', error);
  }
}
```

## Helper Methods

### 1. Card Dealing Methods
```typescript
private async dealHoleCards(): Promise<void> {
  for (const player of this.players) {
    const holeCards = [
      this.deck.drawCard(),
      this.deck.drawCard()
    ];
    
    player.holeCards = holeCards;
    
    // Send private hole cards to player
    await this.webSocketService.sendHoleCards(player.id, holeCards);
  }
}

private async dealCommunityCards(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const card = this.deck.drawCard();
    this.currentState.communityCards.push(card);
  }
}
```

### 2. Blind Posting
```typescript
private async postBlinds(): Promise<void> {
  const smallBlindPlayer = this.getSmallBlindPlayer();
  const bigBlindPlayer = this.getBigBlindPlayer();
  
  const smallBlindAmount = this.currentState.smallBlindAmount;
  const bigBlindAmount = this.currentState.bigBlindAmount;
  
  // Post small blind
  smallBlindPlayer.stack -= smallBlindAmount;
  smallBlindPlayer.currentBet = smallBlindAmount;
  
  // Post big blind
  bigBlindPlayer.stack -= bigBlindAmount;
  bigBlindPlayer.currentBet = bigBlindAmount;
  
  // Update pot
  this.currentState.pot.mainPot += smallBlindAmount + bigBlindAmount;
}
```

### 3. Player Management
```typescript
private getFirstActivePlayer(): number {
  // UTG position (Under the Gun)
  return (this.currentState.dealerPosition + 3) % this.players.length;
}

private getSmallBlindPlayer(): Player {
  const smallBlindPosition = (this.currentState.dealerPosition + 1) % this.players.length;
  return this.players[smallBlindPosition];
}

private getBigBlindPlayer(): Player {
  const bigBlindPosition = (this.currentState.dealerPosition + 2) % this.players.length;
  return this.players[bigBlindPosition];
}
```

## Error Handling

### 1. Error Handling Strategy
```typescript
private async handleError(method: string, error: Error): Promise<void> {
  // Log error
  console.error(`GameEngine.${method} error:`, error);
  
  // Log to database
  await this.databaseService.logError({
    gameId: this.gameId,
    method,
    error: error.message,
    stack: error.stack,
    timestamp: new Date()
  });
  
  // Broadcast error to players
  await this.webSocketService.broadcastError(
    this.currentState,
    'An error occurred during the game. Please try again.'
  );
  
  // Attempt recovery
  await this.attemptRecovery(method, error);
}
```

### 2. Recovery Methods
```typescript
private async attemptRecovery(method: string, error: Error): Promise<void> {
  try {
    switch (method) {
      case 'startNewHand':
        // Retry with new entropy seed
        await this.retryWithNewEntropy();
        break;
        
      case 'processPlayerAction':
        // Revert to previous state
        await this.revertToPreviousState();
        break;
        
      case 'advanceStreet':
        // Manually advance street
        await this.manualStreetAdvance();
        break;
        
      default:
        // Generic recovery
        await this.genericRecovery();
    }
  } catch (recoveryError) {
    // If recovery fails, pause game
    await this.pauseGame();
  }
}
```

## Performance Optimization

### 1. Caching Strategy
```typescript
class GameEngine {
  private handEvaluationCache: Map<string, HandRank> = new Map();
  private potCalculationCache: Map<string, PotDistribution> = new Map();
  
  private getCachedHandEvaluation(holeCards: Card[], communityCards: Card[]): HandRank | null {
    const key = this.generateHandKey(holeCards, communityCards);
    return this.handEvaluationCache.get(key) || null;
  }
  
  private cacheHandEvaluation(holeCards: Card[], communityCards: Card[], result: HandRank): void {
    const key = this.generateHandKey(holeCards, communityCards);
    this.handEvaluationCache.set(key, result);
  }
}
```

### 2. Batch Operations
```typescript
private async batchStateUpdates(updates: StateUpdate[]): Promise<void> {
  // Group updates by type
  const groupedUpdates = this.groupUpdatesByType(updates);
  
  // Execute in batches
  for (const [type, batch] of Object.entries(groupedUpdates)) {
    await this.executeBatchUpdate(type, batch);
  }
}
```

## Monitoring and Metrics

### 1. Performance Metrics
```typescript
class GameEngine {
  private metrics: {
    actionProcessingTime: number[];
    handEvaluationTime: number[];
    stateUpdateTime: number[];
    errorCount: number;
  } = {
    actionProcessingTime: [],
    handEvaluationTime: [],
    stateUpdateTime: [],
    errorCount: 0
  };
  
  private recordMetric(type: string, value: number): void {
    this.metrics[type].push(value);
    
    // Keep only last 100 measurements
    if (this.metrics[type].length > 100) {
      this.metrics[type].shift();
    }
  }
  
  private getAverageMetric(type: string): number {
    const values = this.metrics[type];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}
```

### 2. Health Checks
```typescript
async performHealthCheck(): Promise<HealthStatus> {
  const checks = [
    this.checkStateConsistency(),
    this.checkPlayerConnections(),
    this.checkDatabaseConnection(),
    this.checkWebSocketConnections()
  ];
  
  const results = await Promise.all(checks);
  
  return {
    isHealthy: results.every(result => result.isHealthy),
    checks: results,
    timestamp: new Date()
  };
}
```

## Testing Strategy

### 1. Unit Tests
```typescript
describe('GameEngine', () => {
  let gameEngine: GameEngine;
  
  beforeEach(() => {
    gameEngine = new GameEngine('test-game-id');
  });
  
  describe('startNewHand', () => {
    it('should initialize new hand with entropy', async () => {
      await gameEngine.startNewHand();
      
      expect(gameEngine.currentState.street).toBe(Street.PREFLOP);
      expect(gameEngine.currentState.entropySeed).toBeDefined();
      expect(gameEngine.currentState.players.every(p => p.holeCards.length === 2)).toBe(true);
    });
  });
  
  describe('processPlayerAction', () => {
    it('should validate and execute valid actions', async () => {
      await gameEngine.startNewHand();
      
      const playerId = gameEngine.currentState.players[0].id;
      await gameEngine.processPlayerAction(playerId, Action.CALL, 10);
      
      expect(gameEngine.currentState.players[0].currentBet).toBe(10);
    });
    
    it('should reject invalid actions', async () => {
      await gameEngine.startNewHand();
      
      const playerId = gameEngine.currentState.players[0].id;
      
      await expect(
        gameEngine.processPlayerAction(playerId, Action.RAISE, 5)
      ).rejects.toThrow('Invalid action');
    });
  });
});
```

### 2. Integration Tests
```typescript
describe('GameEngine Integration', () => {
  it('should complete full hand from deal to showdown', async () => {
    const gameEngine = new GameEngine('integration-test');
    
    // Start hand
    await gameEngine.startNewHand();
    
    // Simulate betting rounds
    await simulateBettingRound(gameEngine, Street.PREFLOP);
    await simulateBettingRound(gameEngine, Street.FLOP);
    await simulateBettingRound(gameEngine, Street.TURN);
    await simulateBettingRound(gameEngine, Street.RIVER);
    
    // Determine winners
    const winners = await gameEngine.determineWinners();
    
    expect(winners.length).toBeGreaterThan(0);
    expect(gameEngine.currentState.street).toBe(Street.COMPLETED);
  });
});
```

This comprehensive core engine implementation provides a robust, scalable, and maintainable foundation for the poker game, ensuring reliable gameplay, proper state management, and excellent performance under load. 