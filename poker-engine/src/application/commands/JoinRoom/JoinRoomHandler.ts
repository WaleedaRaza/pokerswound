/**
 * JoinRoom Command Handler
 */

import type { ICommandHandler } from '../../../common/interfaces/ICommandBus';
import { JoinRoomCommand } from './JoinRoomCommand';
import { GameStateMachine } from '../../../core/engine/game-state-machine';
import type { GameStateModel } from '../../../core/models/game-state';

export interface JoinRoomResult {
  success: boolean;
  newState?: GameStateModel;
  error?: string;
}

export class JoinRoomHandler implements ICommandHandler<JoinRoomCommand, JoinRoomResult> {
  constructor(
    private stateMachine: GameStateMachine,
    private gameStateProvider: (gameId: string) => GameStateModel | undefined
  ) {}

  async handle(command: JoinRoomCommand): Promise<JoinRoomResult> {
    const gameState = this.gameStateProvider(command.gameId);
    
    if (!gameState) {
      return {
        success: false,
        error: 'Game not found'
      };
    }

    const result = this.stateMachine.processAction(gameState, {
      type: 'PLAYER_JOIN',
      playerId: command.playerId,
      playerName: command.playerName,
      seatNumber: command.seatNumber,
      buyIn: command.buyIn
    });

    return {
      success: result.success,
      newState: result.newState,
      error: result.error
    };
  }
}

