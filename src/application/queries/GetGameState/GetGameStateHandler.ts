/**
 * GetGameState Query Handler
 */

import type { IQueryHandler } from '../../../common/interfaces/IQueryBus';
import { GetGameStateQuery } from './GetGameStateQuery';
import type { GameStateModel } from '../../../core/models/game-state';

export class GetGameStateHandler implements IQueryHandler<GetGameStateQuery, GameStateModel | null> {
  constructor(
    private gameStateProvider: (gameId: string) => GameStateModel | undefined
  ) {}

  async handle(query: GetGameStateQuery): Promise<GameStateModel | null> {
    const gameState = this.gameStateProvider(query.gameId);
    return gameState || null;
  }
}

