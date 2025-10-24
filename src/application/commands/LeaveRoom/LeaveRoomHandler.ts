/**
 * LeaveRoom Command Handler
 */

import type { ICommandHandler } from '../../../common/interfaces/ICommandBus';
import { LeaveRoomCommand } from './LeaveRoomCommand';
import { GameStateMachine } from '../../../core/engine/game-state-machine';
import type { GameStateModel } from '../../../core/models/game-state';

export interface LeaveRoomResult {
  success: boolean;
  newState?: GameStateModel;
  error?: string;
}

export class LeaveRoomHandler implements ICommandHandler<LeaveRoomCommand, LeaveRoomResult> {
  constructor(
    private stateMachine: GameStateMachine,
    private gameStateProvider: (gameId: string) => GameStateModel | undefined
  ) {}

  async handle(command: LeaveRoomCommand): Promise<LeaveRoomResult> {
    const gameState = this.gameStateProvider(command.gameId);
    
    if (!gameState) {
      return {
        success: false,
        error: 'Game not found'
      };
    }

    const result = this.stateMachine.processAction(gameState, {
      type: 'PLAYER_LEAVE',
      playerId: command.playerId
    });

    return {
      success: result.success,
      newState: result.newState,
      error: result.error
    };
  }
}

