"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileService = void 0;
class UserProfileService {
    constructor(db) {
        this.db = db;
    }
    async getUserProfile(userId) {
        try {
            const result = await this.db.query(`
        SELECT 
          up.*,
          (SELECT COUNT(*) FROM username_changes WHERE user_id = up.id AND changed_at > NOW() - INTERVAL '30 days') as username_change_count,
          (SELECT MAX(changed_at) FROM username_changes WHERE user_id = up.id) as last_username_change,
          (SELECT can_change_username(up.id, up.global_username)) as can_change_username
        FROM user_profiles up
        WHERE up.id = $1
      `, [userId]);
            if (result.rows.length === 0)
                return null;
            return this.mapRowToProfile(result.rows[0]);
        }
        catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }
    async getUserProfiles(userIds) {
        if (userIds.length === 0)
            return new Map();
        const result = await this.db.query(`
      SELECT 
        up.*,
        (SELECT COUNT(*) FROM username_changes WHERE user_id = up.id AND changed_at > NOW() - INTERVAL '30 days') as username_change_count
      FROM user_profiles up
      WHERE up.id = ANY($1)
    `, [userIds]);
        const profileMap = new Map();
        result.rows.forEach(row => {
            profileMap.set(row.id, this.mapRowToProfile(row));
        });
        return profileMap;
    }
    async upsertUserProfile(userId, data) {
        const { username, display_name, avatar_url } = data;
        const result = await this.db.query(`
      INSERT INTO user_profiles (id, username, global_username, display_name, avatar_url)
      VALUES ($1, $2, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE($3, user_profiles.display_name),
        avatar_url = COALESCE($4, user_profiles.avatar_url),
        updated_at = NOW()
      RETURNING *
    `, [userId, username, display_name, avatar_url]);
        return this.mapRowToProfile(result.rows[0]);
    }
    async updateOnlineStatus(userId, isOnline) {
        await this.db.query(`
      UPDATE user_profiles 
      SET is_online = $2, last_seen = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [userId, isOnline]);
    }
    async searchUsers(query, limit = 20) {
        const result = await this.db.query(`
      SELECT * FROM user_profiles
      WHERE global_username ILIKE $1
      OR display_name ILIKE $1
      LIMIT $2
    `, [`%${query}%`, limit]);
        return result.rows.map(row => this.mapRowToProfile(row));
    }
    mapRowToProfile(row) {
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            global_username: row.global_username,
            display_name: row.display_name,
            user_role: row.user_role,
            is_online: row.is_online,
            last_seen: new Date(row.last_seen),
            chips: parseInt(row.chips || 0),
            avatar_url: row.avatar_url,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            username_change_count: parseInt(row.username_change_count || 0),
            max_username_changes: parseInt(row.max_username_changes || 3),
            can_change_username: row.can_change_username || false,
            last_username_change: row.last_username_change ? new Date(row.last_username_change) : undefined
        };
    }
}
exports.UserProfileService = UserProfileService;
