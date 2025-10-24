import type { UUID, Chips } from '../../types/common.types';
import { ActionType, Street } from '../../types/common.types';
import { GameStateModel, GameStatus } from '../models/game-state';
import { GameStateMachine, type GameAction, type StateTransitionResult } from './game-state-machine';
import { BettingEngine } from './betting-engine';
import { PotManager } from './pot-manager';
import { HandEvaluator } from './hand-evaluator';

export interface RoundResult {
  success: boolean;
  gameState: GameStateModel;
  events: any[];
  error?: string;
}

export interface PlayerAction {
  playerId: UUID;
  actionType: ActionType;
  amount?: Chips;
  timestamp?: number;
}

/**
 * Round Manager
 * Orchestrates the complete hand lifecycle using the game state machine
 */
export class RoundManager {
  private readonly stateMachine: GameStateMachine;
  private readonly bettingEngine: BettingEngine;
  private readonly potManager: PotManager;
  private readonly handEvaluator: HandEvaluator;

  constructor(randomFn: () => number = Math.random) {
    this.stateMachine = new GameStateMachine(randomFn);
    this.bettingEngine = new BettingEngine();
    this.potManager = new PotManager();
    this.handEvaluator = new HandEvaluator();
  }

  /**
   * Start a new round/hand
   */
  public async startNewRound(gameState: GameStateModel): Promise<RoundResult> {
    try {
      // Validate we can start a new round
      if (!gameState.canStartHand()) {
        throw new Error('Cannot start new round: insufficient players or invalid state');
      }

      // Reset pot manager for new hand
      this.potManager.reset();

      // Use state machine to start the hand
      const result = this.stateMachine.processAction(gameState, {
        type: 'START_HAND'
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to start hand');
      }

      return {
        success: true,
        gameState: result.newState,
        events: result.events
      };

    } catch (error) {
      return {
        success: false,
        gameState,
        events: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Process a player action
   */
  public async processPlayerAction(
    gameState: GameStateModel,
    action: PlayerAction
  ): Promise<RoundResult> {
    try {
      // Validate the action first
      const validation = this.validatePlayerAction(gameState, action);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid action');
      }

      // Apply any adjustments from validation
      const adjustedAmount = validation.adjustedAmount || action.amount;
      const isAllIn = validation.isAllIn || false;

      // Process the action through state machine
      const result = this.stateMachine.processAction(gameState, {
        type: 'PLAYER_ACTION',
        playerId: action.playerId,
        actionType: action.actionType,
        amount: adjustedAmount,
        metadata: { isAllIn }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to process action');
      }

      // Update pot manager
      this.updatePotFromAction(action.playerId, action.actionType, adjustedAmount);

      return {
        success: true,
        gameState: result.newState,
        events: result.events
      };

    } catch (error) {
      return {
        success: false,
        gameState,
        events: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Advance to the next street
   */
  public async advanceStreet(gameState: GameStateModel): Promise<RoundResult> {
    try {
      // Check if we can advance
      if (!gameState.isBettingRoundComplete()) {
        throw new Error('Cannot advance street: betting round not complete');
      }

      const result = this.stateMachine.processAction(gameState, {
        type: 'ADVANCE_STREET'
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to advance street');
      }

      return {
        success: true,
        gameState: result.newState,
        events: result.events
      };

    } catch (error) {
      return {
        success: false,
        gameState,
        events: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Complete the hand and determine winners
   */
  public async completeHand(gameState: GameStateModel): Promise<RoundResult> {
    try {
      // Determine winners using hand evaluator
      const winners = this.determineWinners(gameState);

      // Distribute the pot
      const potDistribution = this.distributePot(gameState, winners);

      // Update player stacks
      this.updatePlayerStacks(gameState, potDistribution);

      // Use state machine to end the hand
      const result = this.stateMachine.processAction(gameState, {
        type: 'END_HAND',
        metadata: { winners, potDistribution }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete hand');
      }

      return {
        success: true,
        gameState: result.newState,
        events: result.events
      };

    } catch (error) {
      return {
        success: false,
        gameState,
        events: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Get legal actions for a player
   */
  public getLegalActions(gameState: GameStateModel, playerId: UUID): ActionType[] {
    try {
      // Check if it's the player's turn
      if (gameState.toAct !== playerId) {
        return [];
      }

      const player = gameState.getPlayer(playerId);
      if (!player || player.hasFolded || player.isAllIn) {
        return [];
      }

      // Use betting engine to determine legal actions
      return this.bettingEngine.getLegalActions(
        playerId,
        gameState as any, // Type conversion for existing betting engine
        gameState.bettingRound.currentBet,
        gameState.bettingRound.minRaise
      );

    } catch (error) {
      console.error('Error getting legal actions:', error);
      return [];
    }
  }

  /**
   * Check if the round is complete
   */
  public isRoundComplete(gameState: GameStateModel): boolean {
    return gameState.isHandComplete() || 
           gameState.status === GameStatus.COMPLETED ||
           gameState.getActivePlayers().length <= 1;
  }

  /**
   * Get current betting information
   */
  public getBettingInfo(gameState: GameStateModel): {
    currentBet: Chips;
    minRaise: Chips;
    pot: Chips;
    toAct: UUID | null;
    timeRemaining?: number;
  } {
    return {
      currentBet: gameState.bettingRound.currentBet,
      minRaise: gameState.bettingRound.minRaise,
      pot: gameState.pot.totalPot,
      toAct: gameState.toAct,
      timeRemaining: this.calculateTimeRemaining(gameState)
    };
  }

  /**
   * Validate a player action
   */
  private validatePlayerAction(
    gameState: GameStateModel,
    action: PlayerAction
  ): any {
    const player = gameState.getPlayer(action.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Use existing betting engine validation
    return this.bettingEngine.validateAction(
      {
        playerUuid: action.playerId,
        actionType: action.actionType,
        amount: action.amount
      },
      gameState as any, // Type conversion for existing betting engine
      gameState.bettingRound.currentBet,
      gameState.bettingRound.minRaise
    );
  }

  /**
   * Update pot manager based on player action
   */
  private updatePotFromAction(
    playerId: UUID,
    actionType: ActionType,
    amount?: Chips
  ): void {
    if (!amount || (amount as unknown as number) <= 0) {
      return; // No contribution to pot
    }

    const isAllIn = actionType === ActionType.AllIn;
    this.potManager.addContribution(playerId, amount, isAllIn);
  }

  /**
   * Determine winners using hand evaluator
   */
  private determineWinners(gameState: GameStateModel): any[] {
    const activePlayers = gameState.getActivePlayers();
    const communityCards = gameState.handState.communityCards;

    if (activePlayers.length === 1) {
      // Only one player left - they win by default
      return [{
        playerId: activePlayers[0].uuid,
        amount: gameState.pot.totalPot,
        handRank: null,
        handDescription: 'Won by elimination'
      }];
    }

    // Evaluate all hands at showdown
    const playerHands = activePlayers
      .filter(p => !p.hasFolded)
      .map(p => ({
        playerUuid: p.uuid,
        hole: p.holeCards,
        handRank: this.handEvaluator.evaluateHand(p.holeCards, communityCards)
      }));

    // Use hand evaluator to find winners
    const result = this.handEvaluator.findWinners(playerHands);

    return result.winners.map(playerId => ({
      playerId,
      amount: 0, // Will be calculated in pot distribution
      handRank: result.handRank,
      handDescription: this.getHandDescription(result.handRank)
    }));
  }

  /**
   * Distribute pot among winners
   */
  private distributePot(gameState: GameStateModel, winners: any[]): any[] {
    // Create winner shares for pot manager
    const winnerShares = new Map<string, any[]>();
    
    // For now, assume main pot only (simplified)
    winnerShares.set('main', winners);

    // Use pot manager to distribute
    return this.potManager.distributePots(winnerShares);
  }

  /**
   * Update player stacks after pot distribution
   */
  private updatePlayerStacks(gameState: GameStateModel, distributions: any[]): void {
    for (const distribution of distributions) {
      const player = gameState.getPlayer(distribution.playerUuid);
      if (player) {
        const currentStack = player.stack as unknown as number;
        const newStack = currentStack + (distribution.amount as unknown as number);
        player.setStack(newStack as Chips);
      }
    }
  }

  /**
   * Calculate time remaining for current action
   */
  private calculateTimeRemaining(gameState: GameStateModel): number | undefined {
    if (!gameState.timing.actionStartTime) {
      return undefined;
    }

    const elapsed = Date.now() - gameState.timing.actionStartTime;
    const remaining = (gameState.timing.turnTimeLimit * 1000) - elapsed;
    
    return Math.max(0, Math.floor(remaining / 1000));
  }

  /**
   * Get human-readable hand description
   */
  private getHandDescription(handRank: any): string {
    // This would use the hand evaluator's description functionality
    return handRank?.description || 'High card';
  }

  /**
   * Reset pot manager for new hand
   */
  public resetPotManager(): void {
    this.potManager.reset();
  }

  /**
   * Get current pot breakdown
   */
  public getPotBreakdown(): any {
    return this.potManager.getPotBreakdown();
  }

  /**
   * Get total pot amount
   */
  public getTotalPot(): Chips {
    return this.potManager.getTotalPot();
  }
}
