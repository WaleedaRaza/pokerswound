
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository, withErrorHandling } from './base.repo';

export interface GameEntity {
  id: string;
  small_blind: number;
  big_blind: number;
  max_players: number;
  status: string;
  current_state: Record<string, any>;
  entropy_seed?: string;
  dealer_position: number;
  hand_number: number;
  total_pot: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateGameParams {
  small_blind: number;
  big_blind: number;
  max_players: number;
  status?: string;
  entropy_seed?: string;
}

export interface UpdateGameStateParams {
  current_state?: Record<string, any>;
  status?: string;
  total_pot?: number;
  dealer_position?: number;
  hand_number?: number;
}

export class GamesRepository extends BaseRepository {
  constructor(client: SupabaseClient) {
    super(client);
  }


  async createGame(params: CreateGameParams): Promise<GameEntity> {
    // Validate parameters
    await this.validateCreateGameParams(params);

    const gameData = {
      small_blind: params.small_blind,
      big_blind: params.big_blind,
      max_players: params.max_players,
      status: params.status || 'WAITING',
      current_state: {},
      entropy_seed: params.entropy_seed || this.generateEntropySeed(),
      dealer_position: 0,
      hand_number: 0,
      total_pot: 0
    };

    const result = await this.createEntity<GameEntity>('games', gameData);

    if (!result.success) {
      throw new Error(`Failed to create game: ${result.error}`);
    }

    return result.data!;
  }


  async getGame(id: string, expectedVersion?: number): Promise<GameEntity | null> {
    return this.getEntity<GameEntity>('games', id, expectedVersion);
  }


  async updateGameState(
    id: string, 
    updates: UpdateGameStateParams, 
    expectedVersion?: number
  ): Promise<GameEntity> {
    const result = await this.updateEntity<GameEntity>('games', id, updates, expectedVersion);

    if (!result.success) {
      throw new Error(`Failed to update game state: ${result.error}`);
    }

    return result.data!;
  }


  async updateGameStateAtomic(
    id: string,
    expectedVersion: number,
    updates: UpdateGameStateParams
  ): Promise<GameEntity> {
    const result = await this.withTransaction(async (client) => {
      // Use the stored procedure for atomic updates
      const { data, error } = await client.rpc('update_game_state_atomic', {
        p_game_id: id,
        p_expected_version: expectedVersion,
        p_updates: updates
      });

      if (error) {
        throw new Error(`Atomic update failed: ${error.message}`);
      }

      const updateResult = data[0];
      if (!updateResult.success) {
        throw new Error(updateResult.error_msg);
      }

      // Fetch and return the updated game
      const { data: updatedGame, error: fetchError } = await client
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch updated game: ${fetchError.message}`);
      }

      return updatedGame as GameEntity;
    });

    if (!result.success) {
      throw new Error(`Atomic game update failed: ${result.error}`);
    }

    return result.data!;
  }


  async incrementGameVersion(id: string): Promise<GameEntity> {
    return this.withOptimisticLock<GameEntity>('games', id, async (current) => {
      return {
        version: current.version + 1,
        updated_at: new Date().toISOString()
      };
    }).then(result => {
      if (!result.success) {
        throw new Error(`Failed to increment game version: ${result.error}`);
      }
      return result.data!;
    });
  }


  async listActiveGames(limit: number = 50, offset: number = 0): Promise<GameEntity[]> {
    return this.listEntities<GameEntity>('games', {
      filters: { status: 'WAITING' },
      orderBy: 'created_at',
      ascending: false,
      limit,
      offset
    });
  }


  async getGamesByStatus(status: string): Promise<GameEntity[]> {
    return this.listEntities<GameEntity>('games', {
      filters: { status },
      orderBy: 'created_at',
      ascending: false
    });
  }


  async deleteGame(id: string, expectedVersion?: number): Promise<void> {
    const result = await this.deleteEntity('games', id, expectedVersion);

    if (!result.success) {
      throw new Error(`Failed to delete game: ${result.error}`);
    }
  }

  private async validateCreateGameParams(params: CreateGameParams): Promise<void> {
    if (params.small_blind <= 0) {
      throw new Error('Small blind must be positive');
    }
    
    if (params.big_blind <= params.small_blind) {
      throw new Error('Big blind must be greater than small blind');
    }
    
    if (params.max_players < 2 || params.max_players > 9) {
      throw new Error('Max players must be between 2 and 9');
    }

    const validStatuses = ['WAITING', 'ACTIVE', 'PAUSED', 'COMPLETED'];
    if (params.status && !validStatuses.includes(params.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  private generateEntropySeed(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }
}

// Legacy function exports for compatibility
export async function createGame(db: SupabaseClient, params: CreateGameParams): Promise<GameEntity> {
  const repo = new GamesRepository(db);
  return repo.createGame(params);
}

export async function getGame(db: SupabaseClient, id: string): Promise<GameEntity | null> {
  const repo = new GamesRepository(db);
  return repo.getGame(id);
}

export async function incrementGameVersion(db: SupabaseClient, id: string): Promise<GameEntity> {
  const repo = new GamesRepository(db);
  return repo.incrementGameVersion(id);
}

// CommonJS exports for existing code
module.exports = { 
  GamesRepository,
  createGame, 
  getGame, 
  incrementGameVersion 
};
