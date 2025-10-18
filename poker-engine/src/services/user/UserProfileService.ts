import { Pool } from 'pg';

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  global_username: string;
  display_name?: string;
  user_role: 'user' | 'admin' | 'god';
  is_online: boolean;
  last_seen: Date;
  chips: number;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
  username_change_count: number;
  max_username_changes: number;
  can_change_username: boolean;
  last_username_change?: Date;
}

export class UserProfileService {
  constructor(private db: Pool) {}
  
  async getUserProfile(userId: string): Promise<UserProfile | null> {
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
      
      if (result.rows.length === 0) return null;
      
      return this.mapRowToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
  
  async getUserProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
    if (userIds.length === 0) return new Map();
    
    const result = await this.db.query(`
      SELECT 
        up.*,
        (SELECT COUNT(*) FROM username_changes WHERE user_id = up.id AND changed_at > NOW() - INTERVAL '30 days') as username_change_count
      FROM user_profiles up
      WHERE up.id = ANY($1)
    `, [userIds]);
    
    const profileMap = new Map<string, UserProfile>();
    result.rows.forEach(row => {
      profileMap.set(row.id, this.mapRowToProfile(row));
    });
    
    return profileMap;
  }
  
  async upsertUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
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
  
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.db.query(`
      UPDATE user_profiles 
      SET is_online = $2, last_seen = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [userId, isOnline]);
  }
  
  async searchUsers(query: string, limit: number = 20): Promise<UserProfile[]> {
    const result = await this.db.query(`
      SELECT * FROM user_profiles
      WHERE global_username ILIKE $1
      OR display_name ILIKE $1
      LIMIT $2
    `, [`%${query}%`, limit]);
    
    return result.rows.map(row => this.mapRowToProfile(row));
  }
  
  private mapRowToProfile(row: any): UserProfile {
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

