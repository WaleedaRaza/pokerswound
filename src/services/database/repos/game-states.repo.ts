import { Pool, PoolClient } from 'pg';
import { GameStateModel } from '../../../core/models/game-state';

// Internal snapshot type from GameStateModel.toSnapshot()
interface InternalGameSnapshot {
  id: string;
  status: string;
  configuration: any;
  players: any[];
  handState: any;
  currentStreet: string;
  bettingRound: any;
  pot: any;
  timing: any;
  actionHistory: any[];
  toAct: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * GameStatesRepository - Database persistence for GameStateModel
 * 
 * Provides atomic updates with optimistic locking using version numbers.
 * Ensures consistency in concurrent environments via database transactions.
 * Links game state to the rooms (lobby) system.
 */
export class GameStatesRepository {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Create a new game state record
   * 
   * @param gameId - Unique game identifier
   * @param roomId - Room ID from lobby system (nullable for standalone games)
   * @param initialState - Initial game state snapshot
   * @param hostUserId - User who created the game
   */
  async create(
    gameId: string, 
    roomId: string | null, 
    initialState: InternalGameSnapshot, 
    hostUserId: string
  ): Promise<void> {
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
      1, // initial version
      initialState.handState.handNumber,
      initialState.handState.dealerPosition,
      initialState.pot.totalPot
    ];

    await this.db.query(query, values);
  }

  /**
   * Find game state by ID and reconstruct GameStateModel
   */
  async findById(gameId: string): Promise<GameStateModel | null> {
    const result = await this.db.query(
      'SELECT * FROM game_states WHERE id = $1',
      [gameId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const snapshot: InternalGameSnapshot = row.current_state;
    
    return GameStateModel.fromSnapshot(snapshot);
  }

  /**
   * Find game state by room ID
   */
  async findByRoomId(roomId: string): Promise<GameStateModel | null> {
    const result = await this.db.query(
      'SELECT * FROM game_states WHERE room_id = $1 AND status IN ($2, $3) ORDER BY created_at DESC LIMIT 1',
      [roomId, 'waiting', 'active']
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const snapshot: InternalGameSnapshot = row.current_state;
    
    return GameStateModel.fromSnapshot(snapshot);
  }

  /**
   * Update game state with optimistic locking
   * 
   * @param gameId - Game identifier
   * @param expectedVersion - Expected current version (for concurrency control)
   * @param updates - Partial updates to apply
   * @returns true if update succeeded, false if version mismatch (stale state)
   */
  async updateGameStateAtomic(
    gameId: string, 
    expectedVersion: number, 
    updates: {
      status?: string;
      current_state?: InternalGameSnapshot;
      hand_number?: number;
      dealer_position?: number;
      total_pot?: number;
    }
  ): Promise<boolean> {
    const client: PoolClient = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Optimistic locking check
      const lockCheck = await client.query(
        'SELECT version FROM game_states WHERE id = $1 FOR UPDATE',
        [gameId]
      );

      if (lockCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Game ${gameId} not found`);
      }

      const currentVersion = lockCheck.rows[0].version;
      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        return false; // Version mismatch - stale state
      }

      // Build dynamic UPDATE query
      const setClauses: string[] = ['version = version + 1', 'updated_at = NOW()'];
      const values: any[] = [gameId, expectedVersion];
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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Save complete game snapshot (for periodic snapshots or game end)
   */
  async saveSnapshot(gameId: string, snapshot: InternalGameSnapshot): Promise<void> {
    await this.db.query(
      `UPDATE game_states 
       SET current_state = $1, 
           status = $2,
           hand_number = $3,
           dealer_position = $4,
           total_pot = $5,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $6`,
      [
        snapshot,
        snapshot.status,
        snapshot.handState.handNumber,
        snapshot.handState.dealerPosition,
        snapshot.pot.totalPot,
        gameId
      ]
    );
  }

  /**
   * Find all active game states for a user
   */
  async findActiveGamesByUserId(userId: string): Promise<GameStateModel[]> {
    const result = await this.db.query(
      `SELECT * FROM game_states 
       WHERE status IN ('waiting', 'active', 'paused')
       AND (
         host_user_id = $1 
         OR current_state->'players' @> $2::jsonb
       )
       ORDER BY updated_at DESC`,
      [userId, JSON.stringify([{ id: userId }])]
    );

    return result.rows.map(row => 
      GameStateModel.fromSnapshot(row.current_state)
    );
  }

  /**
   * List all active game states (for lobby)
   */
  async listActiveGames(limit: number = 50): Promise<Array<{
    id: string;
    roomId: string | null;
    status: string;
    playerCount: number;
    maxPlayers: number;
    smallBlind: number;
    bigBlind: number;
    hostUserId: string;
    createdAt: Date;
  }>> {
    const result = await this.db.query(
      `SELECT 
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
       LIMIT $1`,
      [limit]
    );

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

  /**
   * Delete game state (soft delete - mark as 'deleted')
   */
  async delete(gameId: string): Promise<void> {
    await this.db.query(
      `UPDATE game_states 
       SET status = 'deleted', updated_at = NOW()
       WHERE id = $1`,
      [gameId]
    );
  }

  /**
   * Hard delete game state (use sparingly, mainly for cleanup)
   */
  async hardDelete(gameId: string): Promise<void> {
    await this.db.query('DELETE FROM game_states WHERE id = $1', [gameId]);
  }
}

