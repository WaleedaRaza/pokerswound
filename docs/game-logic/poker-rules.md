# TEXAS HOLD'EM POKER RULES

## Overview
This document outlines the complete implementation of Texas Hold'em poker rules for the poker engine. All rules are implemented server-side to ensure fairness and prevent cheating.

## Basic Game Structure

### 1. Game Setup
**Number of Players**: 2-9 players per table
**Starting Stack**: 1000 chips (configurable)
**Blinds**: Small Blind (SB) and Big Blind (BB)
**Dealer Button**: Rotates clockwise after each hand

### 2. Card System
**Deck**: Standard 52-card deck
**Suits**: ♠ (Spades), ♥ (Hearts), ♦ (Diamonds), ♣ (Clubs)
**Ranks**: 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A (Ace is high)

### 3. Hand Rankings (Highest to Lowest)
1. **Royal Flush**: A, K, Q, J, 10 of same suit
2. **Straight Flush**: Five consecutive cards of same suit
3. **Four of a Kind**: Four cards of same rank
4. **Full House**: Three of a kind + pair
5. **Flush**: Five cards of same suit
6. **Straight**: Five consecutive cards
7. **Three of a Kind**: Three cards of same rank
8. **Two Pair**: Two pairs of different ranks
9. **One Pair**: Two cards of same rank
10. **High Card**: Highest card wins

## Game Flow

### 1. Hand Initialization
**Steps**:
1. Shuffle deck with entropy seed
2. Deal two hole cards to each player
3. Post blinds (SB and BB)
4. Determine first action (UTG - Under the Gun)

**Blind Posting**:
- Small Blind: 1/2 of minimum bet
- Big Blind: Full minimum bet
- Blinds rotate clockwise each hand

### 2. Betting Rounds

#### Preflop (First Betting Round)
**Action Order**: UTG → UTG+1 → ... → SB → BB
**Actions Available**:
- **Fold**: Give up hand, lose chips invested
- **Call**: Match current bet
- **Raise**: Increase current bet
- **Check**: No bet (only if no bet to call)

**Special Rules**:
- BB can check if no raises
- Minimum raise = previous bet + minimum increment
- All-in: Bet entire stack

#### Flop (Second Betting Round)
**Community Cards**: Deal 3 cards face up
**Action Order**: SB → BB → UTG → ... (clockwise)
**Actions Available**:
- **Check**: No bet (if no bet to call)
- **Bet**: Make first bet of round
- **Call**: Match current bet
- **Raise**: Increase current bet
- **Fold**: Give up hand

#### Turn (Third Betting Round)
**Community Cards**: Deal 1 card face up (4 total)
**Action Order**: SB → BB → UTG → ... (clockwise)
**Actions Available**: Same as Flop

#### River (Fourth Betting Round)
**Community Cards**: Deal 1 card face up (5 total)
**Action Order**: SB → BB → UTG → ... (clockwise)
**Actions Available**: Same as Flop

### 3. Showdown
**Trigger**: All betting rounds complete, multiple players remain
**Process**:
1. Players reveal hole cards
2. Evaluate best 5-card hand for each player
3. Compare hands and determine winner(s)
4. Distribute pot to winner(s)

**Hand Evaluation**:
- Use best 5 cards from 7 available (2 hole + 5 community)
- Compare hand rankings first, then kickers
- Split pot for tied hands

## Betting Rules

### 1. Betting Limits
**No-Limit Hold'em**:
- Minimum bet: Big Blind amount
- Maximum bet: Player's entire stack
- Minimum raise: Previous bet + minimum increment

### 2. Betting Actions
**Fold**:
- Surrender hand
- Lose all chips invested
- Cannot win pot

**Check**:
- No bet made
- Only available if no bet to call
- Passes action to next player

**Call**:
- Match current bet amount
- Stay in hand
- Can win pot

**Bet**:
- Make first bet of betting round
- Must be at least minimum bet
- Cannot be less than previous bet

**Raise**:
- Increase current bet
- Must be at least minimum raise
- Previous bet + minimum increment

**All-In**:
- Bet entire remaining stack
- Can be less than minimum bet
- Creates side pot if other players have more chips

### 3. Betting Order
**Preflop**:
1. UTG (Under the Gun)
2. UTG+1, UTG+2, etc.
3. Small Blind
4. Big Blind

**Postflop**:
1. Small Blind
2. Big Blind
3. UTG, UTG+1, etc.

### 4. Betting Round Completion
**Conditions**:
- All players have acted
- All bets are equal
- At least one player has bet or raised

**Exception**: All players fold except one

## Pot Management

### 1. Main Pot
**Definition**: Pot containing all equal bets
**Distribution**: Winner(s) receive entire main pot

### 2. Side Pots
**Creation**: When players are all-in with different amounts
**Structure**:
- Each all-in amount creates a side pot
- Players with sufficient chips compete for each pot
- All-in players can only win pots they contributed to

**Example**:
- Player A: 100 chips (all-in)
- Player B: 200 chips (all-in)
- Player C: 500 chips
- Main pot: 300 chips (A and B compete)
- Side pot: 300 chips (B and C compete)

### 3. Pot Distribution
**Single Winner**:
- Winner receives entire pot

**Multiple Winners**:
- Split pot equally among winners
- Handle odd chips (give to first player in order)

**Tied Hands**:
- Split pot equally
- Use kicker cards for partial ties

## Player Actions

### 1. Valid Actions by Situation
**No Bet to Call**:
- Check
- Bet

**Bet to Call**:
- Fold
- Call
- Raise

**All-In Situation**:
- Fold
- Call (if affordable)
- All-In

### 2. Action Validation
**Turn Validation**:
- Only current player can act
- Action must be valid for situation
- Bet amounts must be within limits

**Amount Validation**:
- Cannot bet more than stack
- Cannot bet less than minimum
- Cannot raise less than minimum raise

**Timing Validation**:
- Action must be within time limit
- Cannot act out of turn
- Cannot change action after submission

## Special Situations

### 1. All-In Scenarios
**Definition**: Player bets entire remaining stack
**Rules**:
- Can be less than minimum bet
- Creates side pot for remaining players
- All-in player can only win pots they contributed to

### 2. Heads-Up Play
**Blind Posting**:
- Dealer posts Small Blind
- Other player posts Big Blind
- Dealer acts first preflop

**Action Order**:
- Preflop: Dealer acts first
- Postflop: Dealer acts last

### 3. Short Stack Play
**Definition**: Player with fewer chips than big blind
**Rules**:
- Can go all-in with any amount
- Creates side pot if necessary
- Cannot be forced to post full big blind

### 4. Disconnections
**Handling**:
- Player has 30 seconds to reconnect
- If no reconnection, player folds
- Game continues with remaining players
- Disconnected player loses chips invested

## Hand Evaluation

### 1. Best Hand Calculation
**Process**:
1. Combine hole cards with community cards
2. Find best 5-card combination
3. Rank hand according to poker hierarchy
4. Use kickers for ties

**Algorithm**:
```typescript
function evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank {
  const allCards = [...holeCards, ...communityCards];
  const combinations = getCombinations(allCards, 5);
  const bestHand = combinations.reduce((best, current) => {
    return rankHand(current) > rankHand(best) ? current : best;
  });
  return rankHand(bestHand);
}
```

### 2. Hand Comparison
**Primary**: Compare hand rankings (Royal Flush > Straight Flush > ...)
**Secondary**: Compare kicker cards for same rankings
**Tertiary**: Split pot for identical hands

### 3. Kicker Cards
**Usage**: Break ties when hand rankings are equal
**Order**: Compare highest kicker, then second highest, etc.
**Example**: A♠A♥ vs A♦A♣ with K♠ kicker vs Q♠ kicker

## Game State Management

### 1. State Transitions
**Game States**:
- WAITING: No active game
- DEALING: Shuffling and dealing cards
- PREFLOP: First betting round
- FLOP: Second betting round
- TURN: Third betting round
- RIVER: Fourth betting round
- SHOWDOWN: Determining winners
- COMPLETED: Hand finished

### 2. State Validation
**Rules**:
- Only valid state transitions allowed
- All required data present for each state
- Player actions must match current state
- State consistency maintained across all components

### 3. State Persistence
**Storage**:
- Complete game state in database
- Action history for audit trail
- Player positions and stacks
- Community cards and pot amounts

## Implementation Requirements

### 1. Server-Side Validation
**All Rules Enforced Server-Side**:
- No client-trusted data
- All calculations server-side
- Action validation before execution
- State verification after each action

### 2. Immutable State
**State Management**:
- Never modify existing state
- Create new state for each action
- Maintain complete action history
- Enable state reconstruction

### 3. Real-time Updates
**Communication**:
- Broadcast state changes to all players
- Send action confirmations
- Provide real-time game updates
- Handle disconnections gracefully

### 4. Audit Trail
**Logging**:
- Log all player actions
- Record state transitions
- Track pot calculations
- Maintain hand histories

## Error Handling

### 1. Invalid Actions
**Response**:
- Reject invalid actions
- Provide clear error messages
- Maintain game state integrity
- Log attempted violations

### 2. Disconnections
**Handling**:
- Graceful timeout period
- Automatic fold after timeout
- Continue game with remaining players
- Reconnection support

### 3. System Failures
**Recovery**:
- State reconstruction from database
- Action replay from logs
- Game continuation where possible
- Manual intervention if necessary

## Performance Requirements

### 1. Response Times
**Targets**:
- Action processing: < 100ms
- State updates: < 50ms
- Hand evaluation: < 10ms
- Pot calculation: < 5ms

### 2. Throughput
**Capabilities**:
- 1000+ concurrent games
- 10,000+ simultaneous players
- 100,000+ actions per minute
- 99.9% uptime

### 3. Scalability
**Architecture**:
- Horizontal scaling support
- Database sharding capability
- Load balancing across servers
- Caching for performance

This comprehensive rule set ensures fair, consistent, and reliable poker gameplay while maintaining the highest standards of security and performance. 