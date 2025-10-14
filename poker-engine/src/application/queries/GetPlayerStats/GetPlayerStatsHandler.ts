/**
 * GetPlayerStats Query Handler
 */

import type { IQueryHandler } from '../../../common/interfaces/IQueryBus';
import { GetPlayerStatsQuery, PlayerStats } from './GetPlayerStatsQuery';

export class GetPlayerStatsHandler implements IQueryHandler<GetPlayerStatsQuery, PlayerStats | null> {
  constructor(
    // In a real app, this would be a database repository
    private statsStore: Map<string, PlayerStats>
  ) {}

  async handle(query: GetPlayerStatsQuery): Promise<PlayerStats | null> {
    const stats = this.statsStore.get(query.playerId);
    
    if (!stats) {
      // Return default stats if player not found
      return {
        playerId: query.playerId,
        handsPlayed: 0,
        handsWon: 0,
        totalChipsWon: 0,
        totalChipsLost: 0,
        biggestPot: 0,
        currentStreak: 0
      };
    }

    return stats;
  }
}

