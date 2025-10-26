"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStatesRepository = void 0;
const game_state_1 = require("../../../core/models/game-state");
class GameStatesRepository {
    constructor(db) {
        this.db = db;
    }
    async create(gameId, roomId, initialState, hostUserId) {
        const query = `
      INSERT INTO game_states (
        id, room_id, host_user_id, status, current_state, 
        version, hand_number, dealer_position, total_pot,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        NOW(), NOW()
      )
    `;
        const values = [
            gameId,
            roomId,
            hostUserId,
            initialState.status,
            initialState,
            1,
            initialState.handState.handNumber,
            initialState.handState.dealerPosition,
            initialState.pot.totalPot
        ];
        await this.db.query(query, values);
    }
    async findById(gameId) {
        const result = await this.db.query('SELECT * FROM game_states WHERE id = $1', [gameId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const snapshot = row.current_state;
        return game_state_1.GameStateModel.fromSnapshot(snapshot);
    }
    async findByRoomId(roomId) {
        const result = await this.db.query('SELECT * FROM game_states WHERE room_id = $1 AND status IN ($2, $3) ORDER BY created_at DESC LIMIT 1', [roomId, 'waiting', 'active']);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const snapshot = row.current_state;
        return game_state_1.GameStateModel.fromSnapshot(snapshot);
    }
    async updateGameStateAtomic(gameId, expectedVersion, updates) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const lockCheck = await client.query('SELECT version FROM game_states WHERE id = $1 FOR UPDATE', [gameId]);
            if (lockCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error(`Game ${gameId} not found`);
            }
            const currentVersion = lockCheck.rows[0].version;
            if (currentVersion !== expectedVersion) {
                await client.query('ROLLBACK');
                return false;
            }
            const setClauses = ['version = version + 1', 'updated_at = NOW()'];
            const values = [gameId, expectedVersion];
            let paramIndex = 3;
            if (updates.status !== undefined) {
                setClauses.push(`status = $${paramIndex++}`);
                values.push(updates.status);
            }
            if (updates.current_state !== undefined) {
                setClauses.push(`current_state = $${paramIndex++}`);
                values.push(updates.current_state);
            }
            if (updates.hand_number !== undefined) {
                setClauses.push(`hand_number = $${paramIndex++}`);
                values.push(updates.hand_number);
            }
            if (updates.dealer_position !== undefined) {
                setClauses.push(`dealer_position = $${paramIndex++}`);
                values.push(updates.dealer_position);
            }
            if (updates.total_pot !== undefined) {
                setClauses.push(`total_pot = $${paramIndex++}`);
                values.push(updates.total_pot);
            }
            const updateQuery = `
        UPDATE game_states 
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND version = $2
      `;
            await client.query(updateQuery, values);
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async saveSnapshot(gameId, snapshot) {
        await this.db.query(`UPDATE game_states 
       SET current_state = $1, 
           status = $2,
           hand_number = $3,
           dealer_position = $4,
           total_pot = $5,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $6`, [
            snapshot,
            snapshot.status,
            snapshot.handState.handNumber,
            snapshot.handState.dealerPosition,
            snapshot.pot.totalPot,
            gameId
        ]);
    }
    async findActiveGamesByUserId(userId) {
        const result = await this.db.query(`SELECT * FROM game_states 
       WHERE status IN ('waiting', 'active', 'paused')
       AND (
         host_user_id = $1 
         OR current_state->'players' @> $2::jsonb
       )
       ORDER BY updated_at DESC`, [userId, JSON.stringify([{ id: userId }])]);
        return result.rows.map(row => game_state_1.GameStateModel.fromSnapshot(row.current_state));
    }
    async listActiveGames(limit = 50) {
        const result = await this.db.query(`SELECT 
        id,
        room_id,
        host_user_id, 
        status, 
        current_state->'config'->>'maxPlayers' as max_players,
        current_state->'config'->'blinds'->>'small' as small_blind,
        current_state->'config'->'blinds'->>'big' as big_blind,
        jsonb_array_length(
          COALESCE(current_state->'players', '[]'::jsonb)
        ) as player_count,
        created_at
       FROM game_states 
       WHERE status IN ('waiting', 'active')
       ORDER BY created_at DESC
       LIMIT $1`, [limit]);
        return result.rows.map(row => ({
            id: row.id,
            roomId: row.room_id,
            status: row.status,
            playerCount: parseInt(row.player_count),
            maxPlayers: parseInt(row.max_players),
            smallBlind: parseInt(row.small_blind),
            bigBlind: parseInt(row.big_blind),
            hostUserId: row.host_user_id,
            createdAt: row.created_at
        }));
    }
    async delete(gameId) {
        await this.db.query(`UPDATE game_states 
       SET status = 'deleted', updated_at = NOW()
       WHERE id = $1`, [gameId]);
    }
    async hardDelete(gameId) {
        await this.db.query('DELETE FROM game_states WHERE id = $1', [gameId]);
    }
}
exports.GameStatesRepository = GameStatesRepository;
