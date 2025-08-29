
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository, withErrorHandling } from './base.repo';

export interface ActionEntity {
  id: string;
  game_id: string;
  hand_id?: string;
  player_id?: string;
  action: string;
  street: string;
  amount?: number;
  seq: number;
  created_at: string;
}

export interface AppendActionParams {
  game_id: string;
  hand_id?: string;
  player_id?: string;
  action: string;
  street: string;
  amount?: number;
}

export class ActionsRepository extends BaseRepository {
  private static readonly VALID_ACTIONS = [
    'FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN',
    'SMALL_BLIND', 'BIG_BLIND', 'ANTE'
  ];

  private static readonly VALID_STREETS = [
    'PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'
  ];

  constructor(client: SupabaseClient) {
    super(client);
  }


  async appendAction(params: AppendActionParams): Promise<ActionEntity> {
    // Validate parameters
    await this.validateActionParams(params);

    const actionData = {
      game_id: params.game_id,
      hand_id: params.hand_id || null,
      player_id: params.player_id || null,
      action: params.action,
      street: params.street,
      amount: params.amount ?? null
    };

    const result = await this.withTransaction(async (client) => {
      // Validate that hand exists if hand_id provided
      if (params.hand_id) {
        const { data: hand, error: handError } = await client
          .from('hands')
          .select('id, game_id')
          .eq('id', params.hand_id)
          .single();

        if (handError || !hand) {
          throw new Error('Hand not found');
        }

        if (hand.game_id !== params.game_id) {
          throw new Error('Hand does not belong to this game');
        }
      }

      // Validate that player exists and belongs to game if player_id provided
      if (params.player_id) {
        const { data: player, error: playerError } = await client
          .from('players')
          .select('id, game_id, active')
          .eq('id', params.player_id)
          .single();

        if (playerError || !player) {
          throw new Error('Player not found');
        }

        if (player.game_id !== params.game_id) {
          throw new Error('Player does not belong to this game');
        }

        if (!player.active) {
          throw new Error('Player is not active in this game');
        }
      }

      // Insert the action (seq will be auto-generated)
      const { data, error } = await client
        .from('game_actions')
        .insert([actionData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to append action: ${error.message}`);
      }

      return data as ActionEntity;
    });

    if (!result.success) {
      throw new Error(`Failed to append action: ${result.error}`);
    }

    return result.data!;
  }


  async listActionsByHand(handId: string): Promise<ActionEntity[]> {
    return this.listEntities<ActionEntity>('game_actions', {
      filters: { hand_id: handId },
      orderBy: 'seq',
      ascending: true
    });
  }

  private async validateActionParams(params: AppendActionParams): Promise<void> {
    if (!params.game_id) {
      throw new Error('Game ID is required');
    }

    if (!params.action) {
      throw new Error('Action is required');
    }

    if (!ActionsRepository.VALID_ACTIONS.includes(params.action)) {
      throw new Error(`Invalid action: ${params.action}. Must be one of: ${ActionsRepository.VALID_ACTIONS.join(', ')}`);
    }

    if (!params.street) {
      throw new Error('Street is required');
    }

    if (!ActionsRepository.VALID_STREETS.includes(params.street)) {
      throw new Error(`Invalid street: ${params.street}. Must be one of: ${ActionsRepository.VALID_STREETS.join(', ')}`);
    }

    // Validate amount for actions that require it
    const actionsRequiringAmount = ['BET', 'RAISE', 'CALL', 'SMALL_BLIND', 'BIG_BLIND', 'ANTE'];
    if (actionsRequiringAmount.includes(params.action)) {
      if (params.amount === undefined || params.amount === null || params.amount < 0) {
        throw new Error(`Action ${params.action} requires a valid amount`);
      }
    }

    // Validate that amount is not provided for actions that don't need it
    const actionsNotRequiringAmount = ['FOLD', 'CHECK', 'ALL_IN'];
    if (actionsNotRequiringAmount.includes(params.action) && params.amount !== undefined && params.amount !== null) {
      throw new Error(`Action ${params.action} should not have an amount`);
    }
  }
}

// Legacy function exports for compatibility
export async function appendAction(db: SupabaseClient, params: AppendActionParams): Promise<ActionEntity> {
  const repo = new ActionsRepository(db);
  return repo.appendAction(params);
}

export async function listActionsByHand(db: SupabaseClient, handId: string): Promise<ActionEntity[]> {
  const repo = new ActionsRepository(db);
  return repo.listActionsByHand(handId);
}

// CommonJS exports for existing code
module.exports = { 
  ActionsRepository,
  appendAction, 
  listActionsByHand 
};
