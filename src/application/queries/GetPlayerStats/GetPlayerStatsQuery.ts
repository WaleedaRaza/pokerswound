/**
 * GetPlayerStats Query
 */

import type { IQuery } from '../../../common/interfaces/IQueryBus';
import type { UUID } from '../../../types/common.types';

export interface PlayerStats {
  playerId: UUID;
  handsPlayed: number;
  handsWon: number;
  totalChipsWon: number;
  totalChipsLost: number;
  biggestPot: number;
  currentStreak: number;
}

export class GetPlayerStatsQuery implements IQuery<PlayerStats | null> {
  readonly queryName = 'GetPlayerStats';

  constructor(public readonly playerId: UUID) {}
}

