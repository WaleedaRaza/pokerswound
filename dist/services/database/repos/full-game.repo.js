"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullGameRepository = void 0;
class FullGameRepository {
    constructor(db) {
        this.db = db;
    }
    async createGame(data) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const gamesResult = await client.query(`INSERT INTO games (
          room_id, game_type, small_blind, big_blind, ante, 
          status, started_at
        ) VALUES ($1, $2, $3, $4, $5, 'WAITING', NOW())
        RETURNING id`, [data.roomId, data.gameType, data.smallBlind, data.bigBlind, data.ante]);
            const gameUuid = gamesResult.rows[0].id;
            await client.query(`INSERT INTO game_states (
          id, room_id, host_user_id, status, current_state, 
          hand_number, total_pot, version
        ) VALUES ($1, $2, $3, 'waiting', $4, 0, 0, 1)`, [data.gameId, data.roomId, data.hostUserId, JSON.stringify(data.initialState)]);
            await client.query(`UPDATE rooms 
         SET current_game_id = $1, game_id = $2, status = 'ACTIVE'
         WHERE id = $3`, [gameUuid, data.gameId, data.roomId]);
            await client.query('COMMIT');
            return { gameUuid, gameTextId: data.gameId };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async startHand(data) {
        const result = await this.db.query(`INSERT INTO hands (
        game_id, hand_number, dealer_seat, small_blind_seat, big_blind_seat,
        status, current_street, pot_total, deck_state
      ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', 'PREFLOP', 0, $6)
      RETURNING id`, [
            data.gameUuid, data.handNumber, data.dealerSeat,
            data.smallBlindSeat, data.bigBlindSeat, JSON.stringify(data.deckState)
        ]);
        return result.rows[0].id;
    }
    async recordAction(data) {
        await this.db.query(`INSERT INTO actions (
        hand_id, game_id, user_id, action_type, amount, street,
        seat_index, pot_before, pot_after, sequence_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            data.handId, data.gameUuid, data.userId, data.actionType, data.amount,
            data.street, data.seatIndex, data.potBefore, data.potAfter, data.sequenceNumber
        ]);
    }
    async recordChipTransaction(data) {
        await this.db.query(`INSERT INTO chips_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        room_id, game_id, hand_id, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            data.userId, data.transactionType, data.amount,
            data.balanceBefore, data.balanceAfter,
            data.roomId, data.gameUuid, data.handId, data.description
        ]);
    }
    async completeHand(data) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            await client.query(`INSERT INTO hand_history (
          game_id, room_id, hand_number, pot_size, community_cards,
          winners, player_actions, final_stacks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                data.gameTextId, data.roomId, data.handNumber, data.potSize,
                JSON.stringify(data.communityCards), JSON.stringify(data.winners),
                JSON.stringify(data.playerActions), JSON.stringify(data.finalStacks)
            ]);
            await client.query(`UPDATE hands 
         SET status = 'COMPLETED', ended_at = NOW(), 
             pot_total = $1, community_cards = $2
         WHERE id = $3`, [data.potSize, JSON.stringify(data.communityCards), data.handId]);
            for (const playerResult of data.playerResults) {
                await client.query(`INSERT INTO player_hand_history (
            user_id, game_id, hand_id, room_id, hand_number, seat_index,
            hole_cards, final_hand_rank, final_hand_description,
            pot_contribution, pot_winnings, net_hand_result,
            hand_ended_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`, [
                    playerResult.userId, data.gameTextId, data.handId, data.roomId,
                    data.handNumber, playerResult.seatIndex,
                    JSON.stringify(playerResult.holeCards),
                    playerResult.finalHandRank, playerResult.finalHandDescription,
                    playerResult.potContribution, playerResult.potWinnings, playerResult.netResult
                ]);
                await client.query(`INSERT INTO player_statistics (user_id, total_hands_played, total_hands_won, updated_at)
           VALUES ($1, 1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             total_hands_played = player_statistics.total_hands_played + 1,
             total_hands_won = player_statistics.total_hands_won + $2,
             last_hand_played_at = NOW(),
             updated_at = NOW()`, [playerResult.userId, playerResult.netResult > 0 ? 1 : 0]);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async addPlayerToGame(data) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            await client.query(`INSERT INTO players (game_id, user_id, seat_index, stack, status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')`, [data.gameUuid, data.userId, data.seatIndex, data.buyInAmount]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.FullGameRepository = FullGameRepository;
