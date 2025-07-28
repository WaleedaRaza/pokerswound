import { GameState, GamePhase, PlayerState, PlayerAction, GameAction, GameResult } from './types';
import { HandEvaluator } from '../hand-eval/evaluator';
import { HandRank } from '../hand-eval/types';
import { Card } from '../deck/types';

export class GameStateMachine {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = initialState;
  }

  /**
   * Gets the current game state
   */
  getState(): GameState {
    return { ...this.state };
  }

  /**
   * Processes a player action and updates the game state
   */
  processAction(action: GameAction): GameState {
    switch (action.type) {
      case 'player_action':
        return this.processPlayerAction(action);
      case 'phase_change':
        return this.processPhaseChange(action);
      case 'player_join':
        return this.processPlayerJoin(action);
      case 'player_leave':
        return this.processPlayerLeave(action);
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Processes a player's poker action (fold, call, raise, etc.)
   */
  private processPlayerAction(action: GameAction): GameState {
    if (!action.playerId || !action.action) {
      throw new Error('Player action requires playerId and action');
    }

    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) {
      throw new Error(`Player ${action.playerId} not found`);
    }

    if (player.id !== this.state.currentPlayerId) {
      throw new Error(`Not ${player.id}'s turn`);
    }

    // Update player state based on action
    this.updatePlayerState(player, action.action, action.amount);

    // Add to hand history
    this.state.handHistory.push({
      playerId: action.playerId,
      action: action.action,
      amount: action.amount,
      timestamp: action.timestamp,
      phase: this.state.phase
    });

    // Move to next player or next phase
    this.advanceGame();

    return this.getState();
  }

  /**
   * Updates a player's state based on their action
   */
  private updatePlayerState(player: PlayerState, action: PlayerAction, amount?: number): void {
    switch (action) {
      case PlayerAction.FOLD:
        player.isFolded = true;
        player.isActive = false;
        break;

      case PlayerAction.CHECK:
        // Check is only valid if no bet to call
        if (this.state.currentBet > player.currentBet) {
          throw new Error('Cannot check when there is a bet to call');
        }
        break;

      case PlayerAction.CALL:
        const callAmount = this.state.currentBet - player.currentBet;
        if (callAmount > player.chips) {
          // All-in
          player.isAllIn = true;
          player.currentBet += player.chips;
          this.state.pot += player.chips;
          player.chips = 0;
        } else {
          player.chips -= callAmount;
          player.currentBet += callAmount;
          this.state.pot += callAmount;
        }
        break;

      case PlayerAction.BET:
      case PlayerAction.RAISE:
        if (!amount || amount <= this.state.currentBet) {
          throw new Error('Bet/raise amount must be greater than current bet');
        }
        if (amount > player.chips) {
          throw new Error('Insufficient chips for bet/raise');
        }
        
        player.chips -= amount;
        player.currentBet += amount;
        this.state.pot += amount;
        this.state.currentBet = player.currentBet;
        this.state.minRaise = amount - this.state.currentBet;
        break;

      case PlayerAction.ALL_IN:
        player.isAllIn = true;
        this.state.pot += player.chips;
        player.currentBet += player.chips;
        player.chips = 0;
        if (player.currentBet > this.state.currentBet) {
          this.state.currentBet = player.currentBet;
        }
        break;
    }

    player.lastAction = action;
    player.lastActionAmount = amount;
    this.state.lastActionTime = Date.now();
  }

  /**
   * Advances the game to the next player or phase
   */
  private advanceGame(): void {
    const activePlayers = this.state.players.filter(p => !p.isFolded && p.isActive);
    
    if (activePlayers.length <= 1) {
      // Game is over, move to showdown
      this.state.phase = GamePhase.SHOWDOWN;
      return;
    }

    // Check if betting round is complete
    const allBetsEqual = activePlayers.every(p => p.currentBet === this.state.currentBet || p.isAllIn);
    
    if (allBetsEqual) {
      // Move to next phase
      this.advancePhase();
    } else {
      // Move to next player
      this.moveToNextPlayer();
    }
  }

  /**
   * Advances the game to the next phase
   */
  private advancePhase(): void {
    switch (this.state.phase) {
      case GamePhase.PREFLOP:
        this.state.phase = GamePhase.FLOP;
        this.dealCommunityCards(3); // Flop
        break;
      case GamePhase.FLOP:
        this.state.phase = GamePhase.TURN;
        this.dealCommunityCards(1); // Turn
        break;
      case GamePhase.TURN:
        this.state.phase = GamePhase.RIVER;
        this.dealCommunityCards(1); // River
        break;
      case GamePhase.RIVER:
        this.state.phase = GamePhase.SHOWDOWN;
        break;
      default:
        throw new Error(`Cannot advance from phase: ${this.state.phase}`);
    }

    // Reset betting for new phase
    this.resetBetting();
  }

  /**
   * Deals community cards (to be implemented with deck integration)
   */
  private dealCommunityCards(count: number): void {
    // TODO: Integrate with deck manager to deal actual cards
    console.log(`Dealing ${count} community cards`);
  }

  /**
   * Resets betting for a new phase
   */
  private resetBetting(): void {
    this.state.currentBet = 0;
    this.state.minRaise = this.state.bigBlindAmount;
    this.state.players.forEach(player => {
      player.currentBet = 0;
    });
  }

  /**
   * Moves to the next active player
   */
  private moveToNextPlayer(): void {
    const currentIndex = this.state.players.findIndex(p => p.id === this.state.currentPlayerId);
    let nextIndex = (currentIndex + 1) % this.state.players.length;
    
    // Find next active player
    while (this.state.players[nextIndex].isFolded || !this.state.players[nextIndex].isActive) {
      nextIndex = (nextIndex + 1) % this.state.players.length;
    }
    
    this.state.currentPlayerId = this.state.players[nextIndex].id;
  }

  /**
   * Processes a phase change action
   */
  private processPhaseChange(action: GameAction): GameState {
    if (action.phase) {
      this.state.phase = action.phase;
    }
    return this.getState();
  }

  /**
   * Processes a player joining the game
   */
  private processPlayerJoin(action: GameAction): GameState {
    // TODO: Implement player join logic
    return this.getState();
  }

  /**
   * Processes a player leaving the game
   */
  private processPlayerLeave(action: GameAction): GameState {
    // TODO: Implement player leave logic
    return this.getState();
  }

  /**
   * Determines the winner(s) of the current hand
   */
  determineWinners(): GameResult {
    if (this.state.phase !== GamePhase.SHOWDOWN) {
      throw new Error('Cannot determine winners before showdown');
    }

    const activePlayers = this.state.players.filter(p => !p.isFolded);
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      return {
        winners: [{
          playerId: activePlayers[0].id,
          amount: this.state.pot,
          hand: { rank: HandRank.HIGH_CARD, cards: [], kickers: [], score: 0, description: 'Last player standing' },
          position: 1
        }],
        handEvaluations: {},
        potDistribution: [{
          playerId: activePlayers[0].id,
          amount: this.state.pot,
          reason: 'winner'
        }],
        handHistory: this.state.handHistory
      };
    }

    // Evaluate all active players' hands
    const handEvaluations: Record<string, any> = {};
    const playerHands = activePlayers.map(player => {
      try {
        // Convert player cards to engine format
        const holeCards = player.holeCards || [];
        const hand = HandEvaluator.evaluateHand(holeCards, this.state.communityCards);
        handEvaluations[player.id] = hand;
        
        return {
          playerId: player.id,
          holeCards,
          hand
        };
      } catch (error) {
        console.error(`Error evaluating hand for player ${player.id}:`, error);
        return {
          playerId: player.id,
          holeCards: player.holeCards || [],
          hand: { rank: HandRank.HIGH_CARD, cards: [], kickers: [], score: 0, description: 'Invalid hand' }
        };
      }
    });

    // Rank hands and determine winners
    const rankings = HandEvaluator.rankHands(
      playerHands.map(ph => ({ playerId: ph.playerId, holeCards: ph.holeCards })),
      this.state.communityCards
    );

    // Group players by position (handle ties)
    const winnersByPosition = new Map<number, typeof rankings>();
    rankings.forEach(ranking => {
      if (!winnersByPosition.has(ranking.position)) {
        winnersByPosition.set(ranking.position, []);
      }
      winnersByPosition.get(ranking.position)!.push(ranking);
    });

    // Calculate pot distribution
    const potDistribution: Array<{ playerId: string; amount: number; reason: string }> = [];
    let remainingPot = this.state.pot;

    // Distribute pot starting from winners (position 1)
    for (let position = 1; position <= winnersByPosition.size; position++) {
      const winners = winnersByPosition.get(position);
      if (!winners || remainingPot <= 0) break;

      const amountPerWinner = Math.floor(remainingPot / winners.length);
      const remainder = remainingPot % winners.length;

      winners.forEach((winner, index) => {
        const amount = amountPerWinner + (index < remainder ? 1 : 0);
        if (amount > 0) {
          potDistribution.push({
            playerId: winner.playerId,
            amount,
            reason: position === 1 ? 'winner' : `position_${position}`
          });
        }
      });

      remainingPot = 0; // All pot distributed
    }

    return {
      winners: rankings.filter(r => r.position === 1).map(r => ({
        playerId: r.playerId,
        amount: potDistribution.filter(pd => pd.playerId === r.playerId).reduce((sum, pd) => sum + pd.amount, 0),
        hand: r.hand,
        position: r.position
      })),
      handEvaluations,
      potDistribution,
      handHistory: this.state.handHistory
    };
  }
} 