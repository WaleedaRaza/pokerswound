"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisplayService = void 0;
class DisplayService {
    constructor(db) {
        this.db = db;
    }
    async getPlayerDisplayName(userId, gameId) {
        const result = await this.db.query(`
      WITH display_info AS (
        SELECT 
          up.id as user_id,
          up.global_username,
          up.display_name,
          up.is_online,
          up.avatar_url,
          pa_admin.alias as admin_alias,
          pa_user.alias as user_alias
        FROM user_profiles up
        LEFT JOIN player_aliases pa_admin ON (
          pa_admin.user_id = up.id 
          AND pa_admin.game_id = $2 
          AND pa_admin.is_admin_override = true
        )
        LEFT JOIN player_aliases pa_user ON (
          pa_user.user_id = up.id 
          AND pa_user.game_id = $2 
          AND pa_user.is_admin_override = false
        )
        WHERE up.id = $1
      )
      SELECT 
        user_id,
        CASE 
          WHEN admin_alias IS NOT NULL THEN admin_alias
          WHEN user_alias IS NOT NULL THEN user_alias
          WHEN display_name IS NOT NULL THEN display_name
          ELSE global_username
        END as display_name,
        CASE 
          WHEN admin_alias IS NOT NULL THEN 'admin_override'
          WHEN user_alias IS NOT NULL THEN 'game_alias'
          WHEN display_name IS NOT NULL THEN 'display_name'
          ELSE 'username'
        END as display_type,
        is_online,
        avatar_url
      FROM display_info
    `, [userId, gameId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        return result.rows[0];
    }
    async getGamePlayerDisplays(gameId) {
        const result = await this.db.query(`
      WITH game_players AS (
        SELECT DISTINCT user_id 
        FROM room_seats rs
        JOIN games g ON g.room_id = rs.room_id
        WHERE g.id = $1
      ),
      display_info AS (
        SELECT 
          up.id as user_id,
          up.global_username,
          up.display_name,
          up.is_online,
          up.avatar_url,
          pa_admin.alias as admin_alias,
          pa_user.alias as user_alias
        FROM game_players gp
        JOIN user_profiles up ON gp.user_id = up.id
        LEFT JOIN player_aliases pa_admin ON (
          pa_admin.user_id = up.id 
          AND pa_admin.game_id = $1 
          AND pa_admin.is_admin_override = true
        )
        LEFT JOIN player_aliases pa_user ON (
          pa_user.user_id = up.id 
          AND pa_user.game_id = $1 
          AND pa_user.is_admin_override = false
        )
      )
      SELECT 
        user_id,
        CASE 
          WHEN admin_alias IS NOT NULL THEN admin_alias
          WHEN user_alias IS NOT NULL THEN user_alias
          WHEN display_name IS NOT NULL THEN display_name
          ELSE global_username
        END as display_name,
        CASE 
          WHEN admin_alias IS NOT NULL THEN 'admin_override'
          WHEN user_alias IS NOT NULL THEN 'game_alias'
          WHEN display_name IS NOT NULL THEN 'display_name'
          ELSE 'username'
        END as display_type,
        is_online,
        avatar_url
      FROM display_info
    `, [gameId]);
        const displayMap = new Map();
        result.rows.forEach(row => {
            displayMap.set(row.user_id, row);
        });
        return displayMap;
    }
    async setGameAlias(userId, gameId, alias) {
        try {
            if (!/^[a-zA-Z0-9_-]{1,32}$/.test(alias)) {
                return { success: false, error: 'Invalid alias format' };
            }
            const existingResult = await this.db.query(`
        SELECT COUNT(*) FROM player_aliases 
        WHERE game_id = $1 AND alias = $2 AND user_id != $3
      `, [gameId, alias, userId]);
            if (existingResult.rows[0].count > '0') {
                return { success: false, error: 'Alias already taken in this game' };
            }
            await this.db.query(`
        INSERT INTO player_aliases (user_id, game_id, alias, is_admin_override)
        VALUES ($1, $2, $3, false)
        ON CONFLICT (game_id, user_id) 
        DO UPDATE SET alias = $3, updated_at = NOW()
      `, [userId, gameId, alias]);
            return { success: true };
        }
        catch (error) {
            console.error('Error setting game alias:', error);
            return { success: false, error: 'Failed to set game alias' };
        }
    }
}
exports.DisplayService = DisplayService;
