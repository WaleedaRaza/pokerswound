/**
 * GetRoomInfo Query Handler
 */

import type { IQueryHandler } from '../../../common/interfaces/IQueryBus';
import { GetRoomInfoQuery, RoomInfo } from './GetRoomInfoQuery';
import type { GameStateModel } from '../../../core/models/game-state';

export class GetRoomInfoHandler implements IQueryHandler<GetRoomInfoQuery, RoomInfo | null> {
  constructor(
    private gameStateStore: Map<string, GameStateModel>
  ) {}

  async handle(query: GetRoomInfoQuery): Promise<RoomInfo | null> {
    // Find game by roomId
    let gameState: GameStateModel | undefined;
    for (const [gameId, state] of this.gameStateStore) {
      if ((state as any).roomId === query.roomId) {
        gameState = state;
        break;
      }
    }

    if (!gameState) {
      return null;
    }

    const activePlayers = gameState.getActivePlayers();
    
    return {
      roomId: query.roomId,
      gameId: gameState.id,
      playerCount: activePlayers.length,
      maxPlayers: (gameState as any).maxPlayers || 9,
      smallBlind: (gameState as any).smallBlind || 10,
      bigBlind: (gameState as any).bigBlind || 20,
      status: gameState.status as any
    };
  }
}

