
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository, withErrorHandling } from './base.repo';

export interface PlayerEntity {
  id: string;
  game_id: string;
  user_id: string;
  seat_index: number;
  stack: number;
  current_bet: number;
  hole_cards?: any[];
  status: string;
  has_folded: boolean;
  is_all_in: boolean;
  active: boolean;
  left_at?: string;
  rejoin_token?: string;
  last_action?: string;
  last_action_amount?: number;
  last_action_time?: string;
  total_bet_this_hand: number;
  connection_status: string;
  session_token?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SeatPlayerParams {
  game_id: string;
  user_id: string;
  seat_index: number;
  stack: number;
}

export interface UpdatePlayerParams {
  stack?: number;
  current_bet?: number;
  hole_cards?: any[];
  status?: string;
  has_folded?: boolean;
  is_all_in?: boolean;
  active?: boolean;
  last_action?: string;
  last_action_amount?: number;
  total_bet_this_hand?: number;
  connection_status?: string;
}

export class PlayersRepository extends BaseRepository {
  constructor(client: SupabaseClient) {
    super(client);
  }


  async seatPlayer(params: SeatPlayerParams): Promise<PlayerEntity> {
    // Validate parameters
    await this.validateSeatPlayerParams(params);

    // Check if seat is available
    await this.validateSeatAvailable(params.game_id, params.seat_index);

    // Check if user is already in this game
    await this.validateUserNotInGame(params.game_id, params.user_id);

    const playerData = {
      game_id: params.game_id,
      user_id: params.user_id,
      seat_index: params.seat_index,
      stack: params.stack,
      current_bet: 0,
      status: 'active',
      has_folded: false,
      is_all_in: false,
      active: true,
      total_bet_this_hand: 0,
      connection_status: 'connected',
      rejoin_token: this.generateRejoinToken()
    };

    const result = await this.createEntity<PlayerEntity>('players', playerData);

    if (!result.success) {
      throw new Error(`Failed to seat player: ${result.error}`);
    }

    return result.data!;
  }


  async unseatPlayer(gameId: string, userId: string): Promise<void> {
    const result = await this.withTransaction(async (client) => {
      // Find the player
      const { data: player, error: findError } = await client
        .from('players')
        .select('id, stack, active')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single();

      if (findError || !player) {
        throw new Error('Player not found in game');
      }

      // Mark as inactive instead of deleting (for audit trail)
      const { error: updateError } = await client
        .from('players')
        .update({
          active: false,
          left_at: new Date().toISOString(),
          connection_status: 'disconnected'
        })
        .eq('id', player.id);

      if (updateError) {
        throw new Error(`Failed to unseat player: ${updateError.message}`);
      }

      return true;
    });

    if (!result.success) {
      throw new Error(`Failed to unseat player: ${result.error}`);
    }
  }


  async updateStack(playerId: string, delta: number): Promise<PlayerEntity> {
    const result = await this.withTransaction(async (client) => {
      // Use the stored procedure for atomic stack updates
      const { data, error } = await client.rpc('update_player_state_atomic', {
        p_player_id: playerId,
        p_stack_delta: delta
      });

      if (error) {
        throw new Error(`Stack update failed: ${error.message}`);
      }

      const updateResult = data[0];
      if (!updateResult.success) {
        throw new Error(updateResult.error_msg);
      }

      // Fetch and return the updated player
      const { data: updatedPlayer, error: fetchError } = await client
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch updated player: ${fetchError.message}`);
      }

      return updatedPlayer as PlayerEntity;
    });

    if (!result.success) {
      throw new Error(`Failed to update stack: ${result.error}`);
    }

    return result.data!;
  }


  async updatePlayerState(
    playerId: string,
    updates: UpdatePlayerParams,
    expectedVersion?: number
  ): Promise<PlayerEntity> {
    const result = await this.updateEntity<PlayerEntity>('players', playerId, updates, expectedVersion);

    if (!result.success) {
      throw new Error(`Failed to update player state: ${result.error}`);
    }

    return result.data!;
  }


  async getPlayer(id: string): Promise<PlayerEntity | null> {
    return this.getEntity<PlayerEntity>('players', id);
  }


  async getPlayerByUserAndGame(gameId: string, userId: string): Promise<PlayerEntity | null> {
    const { data, error } = await this.client
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Player not found
      }
      throw new Error(`Failed to get player: ${error.message}`);
    }

    return data as PlayerEntity;
  }


  async getPlayersInGame(gameId: string, activeOnly: boolean = true): Promise<PlayerEntity[]> {
    const filters: Record<string, any> = { game_id: gameId };
    if (activeOnly) {
      filters.active = true;
    }

    return this.listEntities<PlayerEntity>('players', {
      filters,
      orderBy: 'seat_index',
      ascending: true
    });
  }


  async updateConnectionStatus(
    playerId: string,
    status: 'connected' | 'disconnected' | 'reconnecting'
  ): Promise<PlayerEntity> {
    const updates = {
      connection_status: status,
      ...(status === 'disconnected' && { left_at: new Date().toISOString() })
    };

    return this.updatePlayerState(playerId, updates);
  }


  async regenerateRejoinToken(playerId: string): Promise<PlayerEntity> {
    const updates = {
      rejoin_token: this.generateRejoinToken()
    };

    return this.updatePlayerState(playerId, updates);
  }


  async validateRejoinToken(playerId: string, token: string): Promise<boolean> {
    const player = await this.getPlayer(playerId);
    return player?.rejoin_token === token;
  }


  async collectBet(playerId: string, amount: number): Promise<PlayerEntity> {
    return this.withOptimisticLock<PlayerEntity>('players', playerId, async (current) => {
      const newStack = current.stack - amount;
      const newCurrentBet = current.current_bet + amount;
      const newTotalBet = current.total_bet_this_hand + amount;

      if (newStack < 0) {
        throw new Error('Insufficient stack for bet');
      }

      return {
        stack: newStack,
        current_bet: newCurrentBet,
        total_bet_this_hand: newTotalBet,
        is_all_in: newStack === 0,
        last_action_time: new Date().toISOString()
      };
    }).then(result => {
      if (!result.success) {
        throw new Error(`Failed to collect bet: ${result.error}`);
      }
      return result.data!;
    });
  }


  async resetBettingRound(gameId: string): Promise<PlayerEntity[]> {
    const result = await this.withTransaction(async (client) => {
      // Reset current_bet for all active players in the game
      const { data, error } = await client
        .from('players')
        .update({
          current_bet: 0,
          last_action: null,
          last_action_amount: null
        })
        .eq('game_id', gameId)
        .eq('active', true)
        .select();

      if (error) {
        throw new Error(`Failed to reset betting round: ${error.message}`);
      }

      return data as PlayerEntity[];
    });

    if (!result.success) {
      throw new Error(`Failed to reset betting round: ${result.error}`);
    }

    return result.data!;
  }

  private async validateSeatPlayerParams(params: SeatPlayerParams): Promise<void> {
    if (params.seat_index < 0 || params.seat_index > 8) {
      throw new Error('Seat index must be between 0 and 8');
    }

    if (params.stack <= 0) {
      throw new Error('Stack must be positive');
    }
  }

  private async validateSeatAvailable(gameId: string, seatIndex: number): Promise<void> {
    const existingPlayer = await this.listEntities<PlayerEntity>('players', {
      filters: { game_id: gameId, seat_index: seatIndex, active: true },
      limit: 1
    });

    if (existingPlayer.length > 0) {
      throw new Error(`Seat ${seatIndex} is already occupied`);
    }
  }

  private async validateUserNotInGame(gameId: string, userId: string): Promise<void> {
    const existingPlayer = await this.getPlayerByUserAndGame(gameId, userId);
    if (existingPlayer) {
      throw new Error('User is already seated in this game');
    }
  }

  private generateRejoinToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
  }
}

// Legacy function exports for compatibility
export async function seatPlayer(db: SupabaseClient, params: SeatPlayerParams): Promise<PlayerEntity> {
  const repo = new PlayersRepository(db);
  return repo.seatPlayer(params);
}

export async function unseatPlayer(db: SupabaseClient, params: { game_id: string; user_id: string }): Promise<void> {
  const repo = new PlayersRepository(db);
  return repo.unseatPlayer(params.game_id, params.user_id);
}

export async function updateStack(db: SupabaseClient, params: { player_id: string; delta: number }): Promise<PlayerEntity> {
  const repo = new PlayersRepository(db);
  return repo.updateStack(params.player_id, params.delta);
}

// CommonJS exports for existing code
module.exports = { 
  PlayersRepository,
  seatPlayer, 
  unseatPlayer, 
  updateStack 
};
