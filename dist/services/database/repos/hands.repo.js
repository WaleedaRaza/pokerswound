"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandsRepository = void 0;
exports.startHand = startHand;
exports.setToAct = setToAct;
exports.advanceStreet = advanceStreet;
const base_repo_1 = require("./base.repo");
class HandsRepository extends base_repo_1.BaseRepository {
    constructor(client) {
        super(client);
    }
    async startHand(params) {
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
        const result = await this.createEntity('hands', handData);
        if (!result.success) {
            throw new Error(`Failed to start hand: ${result.error}`);
        }
        return result.data;
    }
    async setToAct(handId, playerId) {
        const result = await this.updateEntity('hands', handId, {
            to_act_player_id: playerId
        });
        if (!result.success) {
            throw new Error(`Failed to set to act: ${result.error}`);
        }
        return result.data;
    }
    async advanceStreet(handId, nextStreet) {
        const result = await this.updateEntity('hands', handId, {
            current_street: nextStreet
        });
        if (!result.success) {
            throw new Error(`Failed to advance street: ${result.error}`);
        }
        return result.data;
    }
    async updateCommunityCards(handId, cards) {
        const result = await this.updateEntity('hands', handId, {
            community_cards: cards
        });
        if (!result.success) {
            throw new Error(`Failed to update community cards: ${result.error}`);
        }
        return result.data;
    }
    async endHand(handId) {
        const result = await this.updateEntity('hands', handId, {
            ended_at: new Date().toISOString(),
            to_act_player_id: null
        });
        if (!result.success) {
            throw new Error(`Failed to end hand: ${result.error}`);
        }
        return result.data;
    }
    async getHand(id) {
        return this.getEntity('hands', id);
    }
    async getCurrentHand(gameId) {
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
                return null;
            }
            throw new Error(`Failed to get current hand: ${error.message}`);
        }
        return data;
    }
    async validateStartHandParams(params) {
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
        const game = await this.getEntity('games', params.game_id);
        if (!game) {
            throw new Error('Game not found');
        }
    }
}
exports.HandsRepository = HandsRepository;
async function startHand(db, params) {
    const repo = new HandsRepository(db);
    return repo.startHand(params);
}
async function setToAct(db, params) {
    const repo = new HandsRepository(db);
    return repo.setToAct(params.hand_id, params.player_id);
}
async function advanceStreet(db, params) {
    const repo = new HandsRepository(db);
    return repo.advanceStreet(params.hand_id, params.next_street);
}
module.exports = {
    HandsRepository,
    startHand,
    setToAct,
    advanceStreet
};
