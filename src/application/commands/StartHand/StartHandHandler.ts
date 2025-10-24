/**
 * StartHand Command Handler
 */

import type { ICommandHandler } from '../../../common/interfaces/ICommandBus';
import { StartHandCommand } from './StartHandCommand';
import { GameStateMachine } from '../../../core/engine/game-state-machine';
import type { GameStateModel } from '../../../core/models/game-state';

export interface StartHandResult {
  success: boolean;
  newState?: GameStateModel;
  error?: string;
}

export class StartHandHandler implements ICommandHandler<StartHandCommand, StartHandResult> {
  constructor(
    private stateMachine: GameStateMachine,
    private gameStateProvider: (gameId: string) => GameStateModel | undefined
  ) {}

  async handle(command: StartHandCommand): Promise<StartHandResult> {
    const gameState = this.gameStateProvider(command.gameId);
    
    if (!gameState) {
      return {
        success: false,
        error: 'Game not found'
      };
    }

    const result = this.stateMachine.processAction(gameState, {
      type: 'START_HAND'
    });

    return {
      success: result.success,
      newState: result.newState,
      error: result.error
    };
  }
}

