/**
 * ProcessPlayerAction Command Handler
 */

import type { ICommandHandler } from '../../../common/interfaces/ICommandBus';
import { ProcessPlayerActionCommand } from './ProcessPlayerActionCommand';
import { GameStateMachine } from '../../../core/engine/game-state-machine';
import type { GameStateModel } from '../../../core/models/game-state';

export interface ProcessPlayerActionResult {
  success: boolean;
  newState: GameStateModel;
  error?: string;
}

export class ProcessPlayerActionHandler implements ICommandHandler<ProcessPlayerActionCommand, ProcessPlayerActionResult> {
  constructor(
    private stateMachine: GameStateMachine,
    private gameStateProvider: (gameId: string) => GameStateModel | undefined
  ) {}

  async handle(command: ProcessPlayerActionCommand): Promise<ProcessPlayerActionResult> {
    const gameState = this.gameStateProvider(command.gameId);
    
    if (!gameState) {
      return {
        success: false,
        newState: null as any,
        error: 'Game not found'
      };
    }

    const result = this.stateMachine.processAction(gameState, {
      type: 'PLAYER_ACTION',
      playerId: command.playerId,
      actionType: command.actionType,
      amount: command.amount
    });

    return {
      success: result.success,
      newState: result.newState,
      error: result.error
    };
  }
}

