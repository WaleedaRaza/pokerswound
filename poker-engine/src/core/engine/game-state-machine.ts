import type { UUID, Chips } from '../../types/common.types';
import { Street, ActionType } from '../../types/common.types';
import { GameStateModel, GameStatus } from '../models/game-state';
import { PlayerModel } from '../models/player';
import { Card } from '../card/card';
import { Deck } from '../card/deck';
import { HandEvaluator, HandRanking } from './hand-evaluator';

export interface GameAction {
  type: 'START_GAME' | 'START_HAND' | 'PLAYER_ACTION' | 'ADVANCE_STREET' | 'END_HAND' | 'PAUSE_GAME' | 'RESUME_GAME';
  playerId?: UUID;
  actionType?: ActionType;
  amount?: Chips;
  metadata?: Record<string, any>;
}

export interface StateTransitionResult {
  success: boolean;
  newState: GameStateModel;
  events: GameEvent[];
  error?: string;
}

export interface GameEvent {
  type: string;
  playerId?: UUID;
  data: Record<string, any>;
  timestamp: number;
}

/**
 * Game State Machine
 * Manages all state transitions and ensures game rules are followed
 */
export class GameStateMachine {
  private readonly randomFn: () => number;

  constructor(randomFn: () => number = Math.random) {
    this.randomFn = randomFn;
  }

  /**
   * Process a game action and return the new state
   */
  public processAction(
    currentState: GameStateModel,
    action: GameAction
  ): StateTransitionResult {
    try {
      // Create a working copy of the state
      const newState = this.cloneState(currentState);
      const events: GameEvent[] = [];

      switch (action.type) {
        case 'START_GAME':
          return this.handleStartGame(newState, events);
          
        case 'START_HAND':
          return this.handleStartHand(newState, events);
          
        case 'PLAYER_ACTION':
          if (!action.playerId || !action.actionType) {
            throw new Error('Player action requires playerId and actionType');
          }
          return this.handlePlayerAction(newState, action.playerId, action.actionType, action.amount, events);
          
        case 'ADVANCE_STREET':
          return this.handleAdvanceStreet(newState, events);
          
        case 'END_HAND':
          return this.handleEndHand(newState, events);
          
        case 'PAUSE_GAME':
          return this.handlePauseGame(newState, events);
          
        case 'RESUME_GAME':
          return this.handleResumeGame(newState, events);
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
    return {
        success: false,
        newState: currentState,
        events: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Start the game
   */
  private handleStartGame(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
    if (state.status !== GameStatus.WAITING) {
      throw new Error('Game can only be started from WAITING status');
    }

    if (!state.canStartGame()) {
      throw new Error('Cannot start game: insufficient players');
    }

    state.status = GameStatus.DEALING;
    state.updateTimestamp();

    events.push({
      type: 'GAME_STARTED',
      data: {
        gameId: state.id,
        playerCount: state.getActivePlayers().length
      },
      timestamp: Date.now()
    });

    // Automatically start the first hand
    return this.handleStartHand(state, events);
  }

  /**
   * Start a new hand
   */
  private handleStartHand(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
    if (!state.canStartHand()) {
      throw new Error('Cannot start hand: insufficient players or invalid state');
    }

    // Increment hand number
    state.handState.handNumber++;

    // Set dealer position and blinds
    this.setPositions(state);

    // Create and shuffle deck
    this.prepareDeck(state);

    // Deal hole cards
    this.dealHoleCards(state);

    // Post blinds
    this.postBlinds(state);

    // Set initial betting state
    this.initializeBettingRound(state);

    // Set game status and street
    state.status = GameStatus.PREFLOP;
    state.currentStreet = Street.Preflop;

    // Set first player to act (after big blind)
    state.toAct = this.getFirstPlayerToAct(state);

    // Update timing
    state.timing.handStartTime = Date.now();
    state.timing.streetStartTime = Date.now();
    state.timing.actionStartTime = Date.now();

    state.updateTimestamp();

    events.push({
      type: 'HAND_STARTED',
      data: {
        gameId: state.id,
        handNumber: state.handState.handNumber,
        dealerPosition: state.handState.dealerPosition,
        smallBlind: state.configuration.smallBlind,
        bigBlind: state.configuration.bigBlind
      },
      timestamp: Date.now()
    });

    return {
      success: true,
      newState: state,
      events
    };
  }

  /**
   * Handle player action
   */
  private handlePlayerAction(
    state: GameStateModel,
    playerId: UUID,
    actionType: ActionType,
    amount: Chips | undefined,
    events: GameEvent[]
  ): StateTransitionResult {
    // Validate it's the player's turn
    if (state.toAct !== playerId) {
      throw new Error('Not your turn to act');
    }

    const player = state.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    // Process the action using existing betting engine logic
    this.processPlayerAction(state, player, actionType, amount);

    // Record action in history
    state.actionHistory.push({
      player: playerId,
      action: actionType,
      amount,
      timestamp: Date.now(),
      street: state.currentStreet,
      handNumber: state.handState.handNumber
    });

    state.bettingRound.actionsThisRound++;

    events.push({
      type: 'PLAYER_ACTION',
      playerId,
      data: {
        action: actionType,
        amount,
        street: state.currentStreet,
        handNumber: state.handState.handNumber
      },
      timestamp: Date.now()
    });

    // Check if betting round is complete
    const bettingComplete = state.isBettingRoundComplete();
    console.log(`🎯 Betting round complete check: ${bettingComplete}`);
    
    if (bettingComplete) {
      // Check if hand is over (only one active player)
      const activePlayers = state.getActivePlayers();
      console.log(`  Active players: ${activePlayers.length}`);
      
      if (activePlayers.length <= 1) {
        console.log(`🏆 Only ${activePlayers.length} active player(s), ending hand`);
        return this.handleEndHand(state, events);
      }

      // Check if all players are all-in
      const allInCount = activePlayers.filter(p => p.isAllIn).length;
      console.log(`  All-in players: ${allInCount}/${activePlayers.length}`);
      
      // Advance to next street
      console.log(`✅ Advancing to next street from ${state.currentStreet}`);
      return this.handleAdvanceStreet(state, events);
    } else {
      // Set next player to act
      state.toAct = state.getNextPlayerToAct(playerId);
      state.timing.actionStartTime = Date.now();
      console.log(`  Next to act: ${state.toAct}`);
    }

    state.updateTimestamp();

    return {
      success: true,
      newState: state,
      events
    };
  }

  /**
   * Advance to next street
   */
  private handleAdvanceStreet(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
    console.log('🔄 ADVANCING STREET:');
    console.log(`  From: ${state.currentStreet}`);
    console.log(`  Current bet BEFORE reset: ${state.bettingRound.currentBet}`);
    console.log('  Player states BEFORE reset:');
    for (const player of state.players.values()) {
      console.log(`    ${player.name}: bet=${player.betThisStreet}, stack=${player.stack}, allIn=${player.isAllIn}`);
    }
    
    // Reset betting round
    this.resetBettingRound(state);
    
    console.log('  ✅ Betting round reset complete');

    // Deal community cards and advance street
    switch (state.currentStreet) {
      case Street.Preflop:
        this.dealFlop(state);
        state.currentStreet = Street.Flop;
        state.status = GameStatus.FLOP;
        break;

      case Street.Flop:
        this.dealTurn(state);
        state.currentStreet = Street.Turn;
        state.status = GameStatus.TURN;
        break;

      case Street.Turn:
        this.dealRiver(state);
        state.currentStreet = Street.River;
        state.status = GameStatus.RIVER;
        break;

      case Street.River:
        state.currentStreet = Street.Showdown;
        state.status = GameStatus.SHOWDOWN;
        return this.handleEndHand(state, events);

      default:
        throw new Error(`Cannot advance from street: ${state.currentStreet}`);
    }

    // Set first player to act
    state.toAct = this.getFirstPlayerToActPostFlop(state);

    // Update timing
    state.timing.streetStartTime = Date.now();
    state.timing.actionStartTime = Date.now();

    state.updateTimestamp();

    events.push({
      type: 'STREET_ADVANCED',
      data: {
        street: state.currentStreet,
        communityCards: state.handState.communityCards.map(c => c.toString()),
        handNumber: state.handState.handNumber
      },
      timestamp: Date.now()
    });

    return {
      success: true,
      newState: state,
      events
    };
  }

  /**
   * End the current hand
   */
  private handleEndHand(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
    console.log('🏆 ENDING HAND:');
    console.log(`  Total pot: ${state.pot.totalPot}`);
    console.log('  Player states before showdown:');
    for (const player of state.players.values()) {
      console.log(`    ${player.name}: stack=${player.stack}, bet=${player.betThisStreet}, allIn=${player.isAllIn}, folded=${player.hasFolded}`);
    }
    
    // Determine winners and distribute pot
    const results = this.determineWinners(state);
    console.log('  Winners determined:', results.length);
    for (const result of results) {
      console.log(`    Winner: playerId=${result.playerId}, amount=${result.amount}, rank=${result.handRank}`);
    }

    // Update player stacks
    this.distributePot(state, results);
    
    console.log('  Player stacks AFTER distribution:');
    for (const player of state.players.values()) {
      console.log(`    ${player.name}: stack=${player.stack}`);
    }

    // Clean up hand state
    this.cleanupHand(state);

    // Set status
    state.status = GameStatus.COMPLETED;
    state.toAct = null;

    state.updateTimestamp();

    events.push({
      type: 'HAND_COMPLETED',
      data: {
        handNumber: state.handState.handNumber,
        winners: results.map(r => ({
          playerId: r.playerId,
          amount: r.amount,
          handRank: r.handRank
        })),
        totalPot: state.pot.totalPot
      },
      timestamp: Date.now()
    });

    return {
      success: true,
      newState: state,
      events
    };
  }

  /**
   * Pause the game
   */
  private handlePauseGame(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
    if (state.status === GameStatus.PAUSED) {
      throw new Error('Game is already paused');
    }

    state.status = GameStatus.PAUSED;
    state.updateTimestamp();

    events.push({
      type: 'GAME_PAUSED',
      data: { gameId: state.id },
      timestamp: Date.now()
    });

    return {
      success: true,
      newState: state,
      events
    };
  }

  /**
   * Resume the game
   */
  private handleResumeGame(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
    if (state.status !== GameStatus.PAUSED) {
      throw new Error('Game is not paused');
    }

    // Restore previous status based on current street
    switch (state.currentStreet) {
      case Street.Preflop:
        state.status = GameStatus.PREFLOP;
        break;
      case Street.Flop:
        state.status = GameStatus.FLOP;
        break;
      case Street.Turn:
        state.status = GameStatus.TURN;
        break;
      case Street.River:
        state.status = GameStatus.RIVER;
        break;
      case Street.Showdown:
        state.status = GameStatus.SHOWDOWN;
        break;
      default:
        state.status = GameStatus.WAITING;
    }

    state.updateTimestamp();

    events.push({
      type: 'GAME_RESUMED',
      data: { gameId: state.id },
      timestamp: Date.now()
    });

    return {
      success: true,
      newState: state,
      events
    };
  }

  // Helper methods (simplified implementations - would use existing components)

  private cloneState(state: GameStateModel): GameStateModel {
    return GameStateModel.fromSnapshot(state.toSnapshot());
  }

  private setPositions(state: GameStateModel): void {
    const activePlayers = state.getActivePlayers();
    console.log(`🎯 Setting positions for ${activePlayers.length} players`);
    
    // For first hand, set dealer to first player (seat 0)
    if (state.handState.handNumber <= 1) {
      state.handState.dealerPosition = (activePlayers[0]?.seatIndex || 0) as any;
    } else {
      // Move dealer button clockwise
      state.handState.dealerPosition = this.getNextDealerPosition(state);
    }
    
    // Set blind positions based on seat indices
    if (activePlayers.length === 2) {
      // Heads up: dealer is small blind
      state.handState.smallBlindPosition = state.handState.dealerPosition;
      state.handState.bigBlindPosition = this.getNextSeatIndex(state.handState.dealerPosition, activePlayers);
    } else {
      // Multi-way: small blind is next after dealer
      state.handState.smallBlindPosition = this.getNextSeatIndex(state.handState.dealerPosition, activePlayers);
      state.handState.bigBlindPosition = this.getNextSeatIndex(state.handState.smallBlindPosition, activePlayers);
    }
    
    console.log(`🎯 Dealer: ${state.handState.dealerPosition}, SB: ${state.handState.smallBlindPosition}, BB: ${state.handState.bigBlindPosition}`);
  }

  private prepareDeck(state: GameStateModel): void {
    const deck = new Deck(this.randomFn);
    deck.shuffle();
    state.handState.deck = Array.from({ length: deck.size() }, () => deck.drawOne());
    state.handState.deckSeed = `${Date.now()}-${Math.random()}`;
  }

  private dealHoleCards(state: GameStateModel): void {
    const activePlayers = state.getActivePlayers();
    console.log(`🃏 Dealing hole cards to ${activePlayers.length} players`);
    
    // Deal 2 cards to each player
    for (let round = 0; round < 2; round++) {
      for (const player of activePlayers) {
        if (state.handState.deck.length > 0) {
          const card = state.handState.deck.pop()!;
          player.addHoleCard(card);
          console.log(`📤 Dealt ${card.toString()} to ${player.name} (round ${round + 1})`);
        }
      }
    }
    
    // Log final hole cards
    for (const player of activePlayers) {
      if (player.hole && player.hole.length === 2) {
        console.log(`🎴 ${player.name} has: ${player.hole.map(c => c.toString()).join(', ')}`);
      }
    }
  }

  private postBlinds(state: GameStateModel): void {
    const activePlayers = state.getActivePlayers();
    const sbPosition = state.handState.smallBlindPosition;
    const bbPosition = state.handState.bigBlindPosition;
    
    // Find small blind and big blind players
    const sbPlayer = activePlayers.find(p => p.seatIndex === sbPosition);
    const bbPlayer = activePlayers.find(p => p.seatIndex === bbPosition);
    
    if (sbPlayer) {
      const sbAmount = Math.min(state.configuration.smallBlind as unknown as number, sbPlayer.stack as unknown as number);
      sbPlayer.collectBet(sbAmount as Chips);
      state.pot.totalPot = (state.pot.totalPot as unknown as number + sbAmount) as Chips;
      console.log(`✅ Small blind posted: ${sbPlayer.name} - $${sbAmount}`);
    }
    
    if (bbPlayer) {
      const bbAmount = Math.min(state.configuration.bigBlind as unknown as number, bbPlayer.stack as unknown as number);
      bbPlayer.collectBet(bbAmount as Chips);
      state.pot.totalPot = (state.pot.totalPot as unknown as number + bbAmount) as Chips;
      console.log(`✅ Big blind posted: ${bbPlayer.name} - $${bbAmount}`);
    }
  }

  private initializeBettingRound(state: GameStateModel): void {
    state.bettingRound = {
      currentBet: state.configuration.bigBlind,
      minRaise: state.configuration.bigBlind,
      lastRaiseAmount: state.configuration.bigBlind,
      isComplete: false,
      actionsThisRound: 0
    };
  }

  private resetBettingRound(state: GameStateModel): void {
    state.bettingRound = {
      currentBet: 0 as Chips,
      minRaise: state.configuration.bigBlind,
      lastRaiseAmount: 0 as Chips,
      isComplete: false,
      actionsThisRound: 0
    };

    // Reset player betting states
    for (const player of state.players.values()) {
      player.resetForNewStreet();
    }
  }

  private getFirstPlayerToAct(state: GameStateModel): UUID | null {
    // First to act preflop is after big blind
    const activePlayers = state.getActivePlayers();
    const bbPosition = state.handState.bigBlindPosition;
    return this.getNextPlayerUUID(bbPosition, activePlayers);
  }

  private getFirstPlayerToActPostFlop(state: GameStateModel): UUID | null {
    // First to act post-flop is small blind (or next active player)
    const activePlayers = state.getActivePlayers();
    const sbPosition = state.handState.smallBlindPosition;
    
    // Find the small blind player or next active player
    const sbPlayer = activePlayers.find(p => p.seatIndex === sbPosition);
    if (sbPlayer && !sbPlayer.hasFolded && !sbPlayer.isAllIn) {
      return sbPlayer.uuid;
    }
    
    return this.getNextPlayerUUID(sbPosition, activePlayers);
  }

  private dealFlop(state: GameStateModel): void {
    // Burn one card, deal 3
    if (state.handState.deck.length >= 4) {
      state.handState.deck.pop(); // burn
      for (let i = 0; i < 3; i++) {
        state.handState.communityCards.push(state.handState.deck.pop()!);
      }
    }
  }

  private dealTurn(state: GameStateModel): void {
    // Burn one card, deal 1
    if (state.handState.deck.length >= 2) {
      state.handState.deck.pop(); // burn
      state.handState.communityCards.push(state.handState.deck.pop()!);
    }
  }

  private dealRiver(state: GameStateModel): void {
    // Burn one card, deal 1
    if (state.handState.deck.length >= 2) {
      state.handState.deck.pop(); // burn
      state.handState.communityCards.push(state.handState.deck.pop()!);
    }
  }

  private processPlayerAction(
    state: GameStateModel,
    player: PlayerModel,
    actionType: ActionType,
    amount?: Chips
  ): void {
    const currentBet = state.bettingRound.currentBet as unknown as number;
    const playerBetThisStreet = player.betThisStreet as unknown as number;
    
    switch (actionType) {
      case ActionType.Fold:
        player.fold();
        console.log(`✅ ${player.name} folded`);
        break;
        
      case ActionType.Check:
        if (currentBet > playerBetThisStreet) {
          throw new Error('Cannot check when facing a bet');
        }
        console.log(`✅ ${player.name} checked`);
        break;
        
      case ActionType.Call:
        const callAmount = currentBet - playerBetThisStreet;
        const actualCallAmount = Math.min(callAmount, player.stack as unknown as number);
        player.collectBet(actualCallAmount as Chips);
        state.pot.totalPot = (state.pot.totalPot as unknown as number + actualCallAmount) as Chips;
        console.log(`✅ ${player.name} called $${actualCallAmount}`);
        
        if (actualCallAmount === player.stack as unknown as number) {
          player.allIn();
          console.log(`✅ ${player.name} is all-in`);
        }
        break;
        
      case ActionType.Bet:
      case ActionType.Raise:
        if (!amount) {
          throw new Error('Bet/Raise requires an amount');
        }
        const betAmount = amount as unknown as number;
        const totalBetThisStreet = playerBetThisStreet + betAmount;
        
        if (totalBetThisStreet <= currentBet) {
          throw new Error('Bet/Raise must be higher than current bet');
        }
        
        const actualBetAmount = Math.min(betAmount, player.stack as unknown as number);
        player.collectBet(actualBetAmount as Chips);
        state.pot.totalPot = (state.pot.totalPot as unknown as number + actualBetAmount) as Chips;
        
        // Update betting round
        state.bettingRound.currentBet = (playerBetThisStreet + actualBetAmount) as Chips;
        state.bettingRound.lastRaiseAmount = actualBetAmount as Chips;
        state.bettingRound.lastAggressor = player.uuid;
        
        console.log(`✅ ${player.name} ${actionType.toLowerCase()}ed $${actualBetAmount} (total bet: $${playerBetThisStreet + actualBetAmount})`);
        
        if (actualBetAmount === player.stack as unknown as number) {
          player.allIn();
          console.log(`✅ ${player.name} is all-in`);
        }
        break;
        
      case ActionType.AllIn:
        const allInAmount = player.stack as unknown as number;
        player.collectBet(allInAmount as Chips);
        player.allIn();
        state.pot.totalPot = (state.pot.totalPot as unknown as number + allInAmount) as Chips;
        
        // Update betting if this is a raise
        const newTotalBet = playerBetThisStreet + allInAmount;
        if (newTotalBet > currentBet) {
          state.bettingRound.currentBet = newTotalBet as Chips;
          state.bettingRound.lastRaiseAmount = (newTotalBet - currentBet) as Chips;
          state.bettingRound.lastAggressor = player.uuid;
        }
        
        console.log(`✅ ${player.name} went all-in for $${allInAmount}`);
        break;
    }
  }

  private determineWinners(state: GameStateModel): any[] {
    const activePlayers = state.getActivePlayers();
    
    if (activePlayers.length === 1) {
      // Only one player left, they win everything
      return [{
        playerId: activePlayers[0].uuid,
        amount: state.pot.totalPot,
        handRank: 'Winner by default',
        handDescription: 'Won by elimination'
      }];
    }
    
    // Evaluate hands only if we have 5 community cards (river reached)
    if (state.handState.communityCards.length !== 5) {
      // If not all community cards dealt, split pot (shouldn't happen in normal play)
      const potPerPlayer = (state.pot.totalPot as unknown as number) / activePlayers.length;
      return activePlayers.map(player => ({
        playerId: player.uuid,
        amount: potPerPlayer as Chips,
        handRank: 'Incomplete',
        handDescription: 'Hand incomplete - community cards not fully dealt'
      }));
    }
    
    const handEvaluator = new HandEvaluator();
    const playerHands: Array<{
      playerId: UUID;
      playerName: string;
      handRank: any;
      description: string;
    }> = [];
    
    // Evaluate each player's hand
    for (const player of activePlayers) {
      if (player.hole && player.hole.length === 2) {
        try {
          const handRank = handEvaluator.evaluateHand(player.hole, state.handState.communityCards);
          const description = this.getHandDescription(handRank);
          
          playerHands.push({
            playerId: player.uuid,
            playerName: player.name,
            handRank,
            description
          });
          
          console.log(`🎯 ${player.name}: ${description} (strength: ${handRank.ranking})`);
        } catch (error) {
          console.error(`❌ Error evaluating ${player.name}'s hand:`, error);
          // Give them high card as fallback
          playerHands.push({
            playerId: player.uuid,
            playerName: player.name,
            handRank: { ranking: HandRanking.HighCard, primaryRank: 2, cards: [] },
            description: 'High Card (evaluation error)'
          });
        }
      } else {
        console.error(`❌ ${player.name} has invalid hole cards:`, player.hole);
        // Give them high card as fallback
        playerHands.push({
          playerId: player.uuid,
          playerName: player.name,
          handRank: { ranking: HandRanking.HighCard, primaryRank: 2, cards: [] },
          description: 'High Card (no hole cards)'
        });
      }
    }

    // Sort by hand strength (best first)
    playerHands.sort((a, b) => handEvaluator.compareHands(b.handRank, a.handRank));
    
    // Find winners (players with the best hand)
    const bestHand = playerHands[0];
    const winners = playerHands.filter(hand => 
      handEvaluator.compareHands(hand.handRank, bestHand.handRank) === 0
    );
    
    // Split pot among winners
    const totalPot = state.pot.totalPot as unknown as number;
    const winningsPerPlayer = totalPot / winners.length;
    
    console.log(`🏆 ${winners.length} winner(s) split $${totalPot}:`);
    
    return winners.map(winner => {
      console.log(`  🥇 ${winner.playerName}: ${winner.description} - wins $${winningsPerPlayer}`);
      return {
        playerId: winner.playerId,
        amount: winningsPerPlayer as Chips,
        handRank: winner.handRank.ranking,
        handDescription: winner.description
      };
    });
  }

  private getHandDescription(handRank: any): string {
    const handNames: Record<number, string> = {
      [HandRanking.HighCard]: 'High Card',
      [HandRanking.Pair]: 'Pair',
      [HandRanking.TwoPair]: 'Two Pair',
      [HandRanking.ThreeOfAKind]: 'Three of a Kind',
      [HandRanking.Straight]: 'Straight',
      [HandRanking.Flush]: 'Flush',
      [HandRanking.FullHouse]: 'Full House',
      [HandRanking.FourOfAKind]: 'Four of a Kind',
      [HandRanking.StraightFlush]: 'Straight Flush',
      [HandRanking.RoyalFlush]: 'Royal Flush'
    };
    
    const baseName = handNames[handRank.ranking] || 'Unknown';
    
    // Add specific details for certain hands
    if (handRank.ranking === HandRanking.Pair && handRank.primaryRank) {
      return `${baseName} of ${this.getRankName(handRank.primaryRank)}s`;
    }
    if (handRank.ranking === HandRanking.ThreeOfAKind && handRank.primaryRank) {
      return `${baseName} - ${this.getRankName(handRank.primaryRank)}s`;
    }
    if (handRank.ranking === HandRanking.FourOfAKind && handRank.primaryRank) {
      return `${baseName} - ${this.getRankName(handRank.primaryRank)}s`;
    }
    if (handRank.ranking === HandRanking.HighCard && handRank.primaryRank) {
      return `${baseName} - ${this.getRankName(handRank.primaryRank)} high`;
    }
    
    return baseName;
  }
  
  private getRankName(rankValue: number): string {
    const names: Record<number, string> = {
      2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
      8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
    };
    return names[rankValue] || 'Unknown';
  }

  private distributePot(state: GameStateModel, results: any[]): void {
    // Distribute winnings to players
    for (const result of results) {
      const player = state.getPlayer(result.playerId);
      if (player) {
        const currentStack = player.stack as unknown as number;
        const winnings = result.amount as unknown as number;
        player.setStack((currentStack + winnings) as Chips);
        console.log(`✅ ${player.name} wins $${winnings} (new stack: $${currentStack + winnings})`);
      }
    }
    
    // Reset pot
    state.pot.totalPot = 0 as Chips;
    state.pot.mainPot = 0 as Chips;
    state.pot.sidePots = [];
  }

  private cleanupHand(state: GameStateModel): void {
    // Reset player states for next hand
    for (const player of state.players.values()) {
      player.resetForNewHand();
    }
    
    // Clear community cards
    state.handState.communityCards = [];
  }

  private getNextDealerPosition(state: GameStateModel): any {
    // Move dealer button clockwise
    const activePlayers = state.getActivePlayers();
    if (activePlayers.length === 0) return 0;
    
    const currentDealer = state.handState.dealerPosition;
    return this.getNextSeatIndex(currentDealer, activePlayers);
  }

  private getNextSeatIndex(currentSeatIndex: any, activePlayers: PlayerModel[]): any {
    // Find next active player seat index clockwise
    const sortedPlayers = activePlayers.sort((a, b) => 
      (a.seatIndex as unknown as number) - (b.seatIndex as unknown as number)
    );
    
    const currentIndex = sortedPlayers.findIndex(p => p.seatIndex === currentSeatIndex);
    const nextIndex = (currentIndex + 1) % sortedPlayers.length;
    
    return sortedPlayers[nextIndex]?.seatIndex || 0;
  }

  private getNextPlayerUUID(currentSeatIndex: any, activePlayers: PlayerModel[]): UUID | null {
    // Find next active player UUID clockwise
    const sortedPlayers = activePlayers.sort((a, b) => 
      (a.seatIndex as unknown as number) - (b.seatIndex as unknown as number)
    );
    
    const currentIndex = sortedPlayers.findIndex(p => p.seatIndex === currentSeatIndex);
    const nextIndex = (currentIndex + 1) % sortedPlayers.length;
    
    return sortedPlayers[nextIndex]?.uuid || null;
  }
}