/**
 * GameEngine - Domain layer wrapper around GameStateMachine
 * Captures snapshots and separates concerns
 */

import { GameStateMachine, GameAction, StateTransitionResult } from '../../core/engine/game-state-machine';
import { GameStateModel } from '../../core/models/game-state';
import type { IEventBus } from '../../common/interfaces/IEventBus';

export interface DomainResult {
  success: boolean;
  newState: GameStateModel;
  preChangeSnapshot: any;
  outcomes: any;
  error?: string;
}

export class GameEngine {
  private stateMachine: GameStateMachine;

  constructor(randomFn: () => number = Math.random, eventBus?: IEventBus) {
    this.stateMachine = new GameStateMachine(randomFn, eventBus);
  }

  processAction(state: GameStateModel, action: GameAction): DomainResult {
    // Capture pre-change snapshot
    const preChangeSnapshot = this.captureSnapshot(state);
    
    // Process through state machine
    const result = this.stateMachine.processAction(state, action);
    
    // Extract outcomes
    const outcomes = this.extractOutcomes(result);
    
    return {
      success: result.success,
      newState: result.newState,
      preChangeSnapshot,
      outcomes,
      error: result.error
    };
  }

  private captureSnapshot(state: GameStateModel): any {
    return {
      pot: state.pot.totalPot,
      players: Array.from(state.players.values()).map(p => ({
        id: p.uuid,
        stack: p.stack,
        isAllIn: p.isAllIn,
        betThisStreet: p.betThisStreet
      })),
      currentStreet: state.currentStreet
    };
  }

  private extractOutcomes(result: StateTransitionResult): any {
    const handCompleted = result.events.find(e => e.type === 'HAND_COMPLETED');
    if (handCompleted) {
      return {
        type: 'HAND_COMPLETED',
        winners: handCompleted.data.winners,
        pot: handCompleted.data.preDistributionSnapshot?.potAmount || 0
      };
    }
    return null;
  }
}

