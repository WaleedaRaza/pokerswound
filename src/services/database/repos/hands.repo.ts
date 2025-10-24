
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository, withErrorHandling } from './base.repo';

export interface HandEntity {
  id: string;
  game_id: string;
  hand_no: number;
  dealer_btn: number;
  sb_pos: number;
  bb_pos: number;
  current_street: string;
  to_act_player_id?: string;
  started_at: string;
  ended_at?: string;
  deck_seed?: string;
  community_cards: any[];
  pot_structure: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface StartHandParams {
  game_id: string;
  hand_no: number;
  dealer_btn: number;
  sb_pos: number;
  bb_pos: number;
  current_street: string;
  deck_seed?: string;
}

export class HandsRepository extends BaseRepository {
  constructor(client: SupabaseClient) {
    super(client);
  }


  async startHand(params: StartHandParams): Promise<HandEntity> {
    // Validate parameters
    await this.validateStartHandParams(params);

    const handData = {
      game_id: params.game_id,
      hand_no: params.hand_no,
      dealer_btn: params.dealer_btn,
      sb_pos: params.sb_pos,
      bb_pos: params.bb_pos,
      current_street: params.current_street,
      deck_seed: params.deck_seed || null,
      community_cards: [],
      pot_structure: {},
      started_at: new Date().toISOString()
    };

    const result = await this.createEntity<HandEntity>('hands', handData);

    if (!result.success) {
      throw new Error(`Failed to start hand: ${result.error}`);
    }

    return result.data!;
  }


  async setToAct(handId: string, playerId: string): Promise<HandEntity> {
    const result = await this.updateEntity<HandEntity>('hands', handId, {
      to_act_player_id: playerId
    });

    if (!result.success) {
      throw new Error(`Failed to set to act: ${result.error}`);
    }

    return result.data!;
  }


  async advanceStreet(handId: string, nextStreet: string): Promise<HandEntity> {
    const result = await this.updateEntity<HandEntity>('hands', handId, {
      current_street: nextStreet
    });

    if (!result.success) {
      throw new Error(`Failed to advance street: ${result.error}`);
    }

    return result.data!;
  }


  async updateCommunityCards(handId: string, cards: any[]): Promise<HandEntity> {
    const result = await this.updateEntity<HandEntity>('hands', handId, {
      community_cards: cards
    });

    if (!result.success) {
      throw new Error(`Failed to update community cards: ${result.error}`);
    }

    return result.data!;
  }


  async endHand(handId: string): Promise<HandEntity> {
    const result = await this.updateEntity<HandEntity>('hands', handId, {
      ended_at: new Date().toISOString(),
      to_act_player_id: null
    });

    if (!result.success) {
      throw new Error(`Failed to end hand: ${result.error}`);
    }

    return result.data!;
  }


  async getHand(id: string): Promise<HandEntity | null> {
    return this.getEntity<HandEntity>('hands', id);
  }


  async getCurrentHand(gameId: string): Promise<HandEntity | null> {
    const { data, error } = await this.client
      .from('hands')
      .select('*')
      .eq('game_id', gameId)
      .is('ended_at', null)
      .order('hand_no', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No current hand
      }
      throw new Error(`Failed to get current hand: ${error.message}`);
    }

    return data as HandEntity;
  }

  private async validateStartHandParams(params: StartHandParams): Promise<void> {
    if (params.hand_no < 0) {
      throw new Error('Hand number must be non-negative');
    }

    if (params.dealer_btn < 0 || params.dealer_btn > 8) {
      throw new Error('Dealer button position must be between 0 and 8');
    }

    if (params.sb_pos < 0 || params.sb_pos > 8) {
      throw new Error('Small blind position must be between 0 and 8');
    }

    if (params.bb_pos < 0 || params.bb_pos > 8) {
      throw new Error('Big blind position must be between 0 and 8');
    }

    const validStreets = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
    if (!validStreets.includes(params.current_street)) {
      throw new Error(`Invalid street: ${params.current_street}`);
    }

    // Validate that game exists
    const game = await this.getEntity('games', params.game_id);
    if (!game) {
      throw new Error('Game not found');
    }
  }
}

// Legacy function exports for compatibility
export async function startHand(db: SupabaseClient, params: StartHandParams): Promise<HandEntity> {
  const repo = new HandsRepository(db);
  return repo.startHand(params);
}

export async function setToAct(db: SupabaseClient, params: { hand_id: string; player_id: string }): Promise<HandEntity> {
  const repo = new HandsRepository(db);
  return repo.setToAct(params.hand_id, params.player_id);
}

export async function advanceStreet(db: SupabaseClient, params: { hand_id: string; next_street: string }): Promise<HandEntity> {
  const repo = new HandsRepository(db);
  return repo.advanceStreet(params.hand_id, params.next_street);
}

// CommonJS exports for existing code
module.exports = { 
  HandsRepository,
  startHand, 
  setToAct, 
  advanceStreet 
};
