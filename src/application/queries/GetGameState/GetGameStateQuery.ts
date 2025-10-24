/**
 * GetGameState Query
 */

import type { IQuery } from '../../../common/interfaces/IQueryBus';
import type { GameStateModel } from '../../../core/models/game-state';

export class GetGameStateQuery implements IQuery<GameStateModel | null> {
  readonly queryName = 'GetGameState';

  constructor(public readonly gameId: string) {}
}

