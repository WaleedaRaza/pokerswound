"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionsRepository = void 0;
exports.appendAction = appendAction;
exports.listActionsByHand = listActionsByHand;
const base_repo_1 = require("./base.repo");
class ActionsRepository extends base_repo_1.BaseRepository {
    constructor(client) {
        super(client);
    }
    async appendAction(params) {
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
            const { data, error } = await client
                .from('game_actions')
                .insert([actionData])
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to append action: ${error.message}`);
            }
            return data;
        });
        if (!result.success) {
            throw new Error(`Failed to append action: ${result.error}`);
        }
        return result.data;
    }
    async listActionsByHand(handId) {
        return this.listEntities('game_actions', {
            filters: { hand_id: handId },
            orderBy: 'seq',
            ascending: true
        });
    }
    async validateActionParams(params) {
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
        const actionsRequiringAmount = ['BET', 'RAISE', 'CALL', 'SMALL_BLIND', 'BIG_BLIND', 'ANTE'];
        if (actionsRequiringAmount.includes(params.action)) {
            if (params.amount === undefined || params.amount === null || params.amount < 0) {
                throw new Error(`Action ${params.action} requires a valid amount`);
            }
        }
        const actionsNotRequiringAmount = ['FOLD', 'CHECK', 'ALL_IN'];
        if (actionsNotRequiringAmount.includes(params.action) && params.amount !== undefined && params.amount !== null) {
            throw new Error(`Action ${params.action} should not have an amount`);
        }
    }
}
exports.ActionsRepository = ActionsRepository;
ActionsRepository.VALID_ACTIONS = [
    'FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN',
    'SMALL_BLIND', 'BIG_BLIND', 'ANTE'
];
ActionsRepository.VALID_STREETS = [
    'PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'
];
async function appendAction(db, params) {
    const repo = new ActionsRepository(db);
    return repo.appendAction(params);
}
async function listActionsByHand(db, handId) {
    const repo = new ActionsRepository(db);
    return repo.listActionsByHand(handId);
}
module.exports = {
    ActionsRepository,
    appendAction,
    listActionsByHand
};
