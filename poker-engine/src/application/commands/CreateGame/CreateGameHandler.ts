/**
 * CreateGame Command Handler
 */

import type { ICommandHandler } from '../../../common/interfaces/ICommandBus';
import { CreateGameCommand } from './CreateGameCommand';
import { GameStateModel } from '../../../core/models/game-state';
import type { UUID, Chips } from '../../../types/common.types';

export interface CreateGameResult {
  success: boolean;
  gameId: string;
  gameState?: GameStateModel;
  error?: string;
}

export class CreateGameHandler implements ICommandHandler<CreateGameCommand, CreateGameResult> {
  constructor(
    private gameStateStore: Map<string, GameStateModel>
  ) {}

  async handle(command: CreateGameCommand): Promise<CreateGameResult> {
    try {
      const gameId = this.generateGameId();
      const { roomId, smallBlind, bigBlind, maxPlayers = 9, buyIn = 1000 } = command.options;

      // Create initial game state
      const gameState = new GameStateModel({
        id: gameId,
        configuration: {
          smallBlind,
          bigBlind,
          ante: 0 as Chips,
          maxPlayers,
          minPlayers: 2,
          turnTimeLimit: 30,
          timebankSeconds: 60,
          autoMuckLosingHands: false,
          allowRabbitHunting: false
        }
      });

      // Store game state
      this.gameStateStore.set(gameId, gameState);

      return {
        success: true,
        gameId,
        gameState
      };
    } catch (error) {
      return {
        success: false,
        gameId: '',
        error: (error as Error).message
      };
    }
  }

  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

