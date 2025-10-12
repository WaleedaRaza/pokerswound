# PHASE 1: CORE ENGINE IMPLEMENTATION PLAN (Weeks 1-4)

## WEEK 1: FOUNDATION & BASIC STATE MANAGEMENT

### Day 1-2: Project Setup & Core Models
**Tasks:**
- Initialize project structure with TypeScript
- Set up Supabase connection and basic schema
- Create core data models (Game, Player, Card, Pot)
- Implement basic type definitions

**Deliverables:**
- Project structure with TypeScript configuration
- Basic Supabase schema with games and players tables
- Core model classes with proper typing
- Basic CRUD operations for games and players

**Success Criteria:**
- Can create and retrieve game instances
- Can add/remove players from games
- All data models properly typed
- Database operations working

### Day 3-4: Basic Game State Management
**Tasks:**
- Implement GameState interface and types
- Create StateManager for immutable state transitions
- Implement basic game lifecycle (create, start, end)
- Add state validation and persistence

**Deliverables:**
- GameState interface with all required fields
- StateManager with createNewState() and validateState()
- Basic game lifecycle methods
- State persistence to Supabase

**Success Criteria:**
- Can create new game with initial state
- State transitions are immutable
- State validation prevents invalid states
- State persists correctly to database

### Day 5-7: Card System & Deck Management
**Tasks:**
- Implement Card class with suits and ranks
- Create Deck class with shuffle and draw methods
- Add basic entropy integration for shuffling
- Implement card dealing logic

**Deliverables:**
- Card class with proper comparison methods
- Deck class with Fisher-Yates shuffle
- Basic entropy service integration
- Card dealing for hole cards and community cards

**Success Criteria:**
- Cards can be created and compared correctly
- Deck shuffles with entropy seeding
- Cards can be dealt to players
- Community cards can be dealt

## WEEK 2: PLAYER ACTION PROCESSING

### Day 8-10: Action System Foundation
**Tasks:**
- Define Action types and interfaces
- Create ActionProcessor for handling player actions
- Implement action validation logic
- Add action history tracking

**Deliverables:**
- Action types (FOLD, CHECK, CALL, BET, RAISE)
- ActionProcessor with validateAction() and executeAction()
- Action validation rules (turn order, bet amounts, etc.)
- Action history storage in database

**Success Criteria:**
- Can validate player actions against game rules
- Actions execute correctly and update game state
- Action history is properly tracked
- Invalid actions are rejected with proper errors

### Day 11-12: Betting Round Logic
**Tasks:**
- Implement betting round progression
- Add pot calculation and bet tracking
- Create side pot logic for all-in situations
- Implement betting round completion logic

**Deliverables:**
- Betting round state management
- Pot calculation with main and side pots
- Bet tracking per player
- Round completion detection

**Success Criteria:**
- Betting rounds progress correctly
- Pot calculations are accurate
- Side pots created for all-in scenarios
- Rounds complete when all players agree

### Day 13-14: Turn Management & Player Order
**Tasks:**
- Implement player turn order management
- Add position tracking (UTG, BTN, SB, BB)
- Create dealer button movement logic
- Implement action order validation

**Deliverables:**
- Player turn order system
- Position tracking and dealer button
- Action order validation
- Turn progression logic

**Success Criteria:**
- Players act in correct order
- Positions rotate correctly
- Dealer button moves properly
- Turn validation prevents out-of-order actions

## WEEK 3: HAND EVALUATION SYSTEM

### Day 15-17: Hand Evaluation Core
**Tasks:**
- Implement hand ranking system
- Create hand comparison logic
- Add hand strength calculation
- Implement winner determination

**Deliverables:**
- HandEvaluator class with evaluateHand()
- Hand ranking from high card to royal flush
- Hand comparison methods
- Winner determination logic

**Success Criteria:**
- Hand evaluation is accurate for all poker hands
- Hand comparisons work correctly
- Winners are determined properly
- Hand rankings follow standard poker rules

### Day 18-19: Community Card Integration
**Tasks:**
- Integrate community cards with hand evaluation
- Implement best hand calculation
- Add hand improvement tracking
- Create hand result reporting

**Deliverables:**
- Community card integration with hand evaluation
- Best hand calculation for each player
- Hand improvement tracking
- Detailed hand result reporting

**Success Criteria:**
- Community cards properly integrated
- Best hands calculated correctly
- Hand improvements tracked
- Results reported accurately

### Day 20-21: Pot Distribution & Game Completion
**Tasks:**
- Implement pot distribution logic
- Add winner payout calculation
- Create game completion handling
- Implement balance updates

**Deliverables:**
- Pot distribution system
- Winner payout calculation
- Game completion logic
- Player balance updates

**Success Criteria:**
- Pots distributed correctly to winners
- Payouts calculated accurately
- Games complete properly
- Player balances updated correctly

## WEEK 4: WEBSOCKET COMMUNICATION & INTEGRATION

### Day 22-24: WebSocket Foundation
**Tasks:**
- Set up WebSocket server
- Implement connection management
- Add authentication for WebSocket connections
- Create basic message protocol

**Deliverables:**
- WebSocket server setup
- Connection management system
- WebSocket authentication
- Basic message protocol

**Success Criteria:**
- WebSocket server runs and accepts connections
- Connections are properly managed
- Authentication works for WebSocket
- Basic messages can be sent/received

### Day 25-26: Real-time Game Events
**Tasks:**
- Implement game state broadcasting
- Add player action broadcasting
- Create round update events
- Add error notification system

**Deliverables:**
- Game state broadcast system
- Player action broadcasting
- Round update events
- Error notification system

**Success Criteria:**
- Game state updates broadcast to all players
- Player actions broadcast to other players
- Round updates sent correctly
- Errors communicated to players

### Day 27-28: Integration Testing & Polish
**Tasks:**
- Integrate all components together
- Test complete game flow
- Fix any integration issues
- Add basic error handling

**Deliverables:**
- Complete integrated system
- End-to-end game flow working
- Basic error handling
- Integration test suite

**Success Criteria:**
- Complete poker game works end-to-end
- All components integrate properly
- Error handling prevents crashes
- Basic tests pass

## PHASE 1 SUCCESS CRITERIA VERIFICATION

### 1. Single Table Poker Functional
**Verification Tests:**
- Create a new game table
- Add 2-9 players to the table
- Start a new hand
- Complete a full hand from deal to showdown
- Verify all game states transition correctly

**Expected Behavior:**
- Game can be created and started
- Players can join and leave
- Hands deal correctly with proper cards
- Betting rounds progress properly
- Game completes and determines winners

### 2. Basic Betting Rounds Working
**Verification Tests:**
- Preflop betting round
- Flop betting round
- Turn betting round
- River betting round
- All-in scenarios with side pots

**Expected Behavior:**
- Each betting round starts and completes
- Players can fold, check, call, bet, raise
- Pot calculations are accurate
- Side pots created for all-in situations
- Betting rounds end when all players agree

### 3. Hand Evaluation Accurate
**Verification Tests:**
- Test all hand rankings (high card to royal flush)
- Test hand comparisons
- Test community card integration
- Test winner determination

**Expected Behavior:**
- All hand rankings calculated correctly
- Hand comparisons work properly
- Community cards integrated correctly
- Winners determined accurately
- Ties handled properly

### 4. Real-time Updates Working
**Verification Tests:**
- Player actions broadcast to all players
- Game state updates sent to all players
- Round transitions communicated
- Error messages delivered

**Expected Behavior:**
- All players see actions in real-time
- Game state synchronized across all clients
- Round transitions communicated clearly
- Errors handled gracefully

## TECHNICAL REQUIREMENTS FOR PHASE 1

### Database Schema (Supabase)
```sql
-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state JSONB NOT NULL,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  user_id UUID,
  position INTEGER,
  stack NUMERIC DEFAULT 1000,
  hole_cards JSONB,
  current_bet NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now()
);

-- Actions table
CREATE TABLE game_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  player_id UUID REFERENCES players(id),
  action TEXT NOT NULL,
  amount NUMERIC,
  street TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### Core Classes Structure
```typescript
// Core Engine Classes
class GameEngine {
  startNewHand(): void
  processPlayerAction(playerId: string, action: Action, amount?: number): void
  advanceStreet(): void
  determineWinners(): Player[]
}

class StateManager {
  createNewState(currentState: GameState, action: Action): GameState
  validateState(state: GameState): boolean
  persistState(state: GameState): void
}

class ActionProcessor {
  validateAction(player: Player, action: Action, amount?: number): boolean
  executeAction(player: Player, action: Action, amount?: number): void
}

class HandEvaluator {
  evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank
  compareHands(hand1: HandRank, hand2: HandRank): number
  determineWinners(players: Player[], communityCards: Card[]): Player[]
}
```

### WebSocket Message Protocol
```typescript
// Client to Server
interface ClientMessages {
  JOIN_GAME: { gameId: string, userId: string }
  LEAVE_GAME: { gameId: string, userId: string }
  PLAYER_ACTION: { gameId: string, action: Action, amount?: number }
}

// Server to Client
interface ServerMessages {
  GAME_STATE_UPDATE: GameState
  PLAYER_ACTION_BROADCAST: { playerId: string, action: Action, amount?: number }
  ROUND_UPDATE: { street: Street, communityCards: Card[] }
  HAND_RESULT: { winners: string[], payouts: Record<string, number> }
  ERROR: { message: string, code: string }
}
```

This Phase 1 plan provides a solid foundation for the poker engine with all core functionality working. Each week builds upon the previous, ensuring that by the end of Week 4, you have a fully functional single-table poker game with real-time updates.