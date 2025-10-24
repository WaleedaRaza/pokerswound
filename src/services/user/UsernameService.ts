import { Pool } from 'pg';

export interface UsernameValidation {
  valid: boolean;
  error?: string;
}

export interface UsernameChangeResult {
  success: boolean;
  newUsername: string;
  error?: string;
}

export class UsernameService {
  constructor(private db: Pool) {}
  
  async validateUsername(username: string): Promise<UsernameValidation> {
    if (username.length < 3 || username.length > 50) {
      return { valid: false, error: 'Username must be 3-50 characters' };
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
    }
    
    const reserved = ['admin', 'moderator', 'system', 'bot', 'poker', 'dealer'];
    if (reserved.includes(username.toLowerCase())) {
      return { valid: false, error: 'This username is reserved' };
    }
    
    const available = await this.checkAvailability(username);
    if (!available) {
      return { valid: false, error: 'Username already taken' };
    }
    
    return { valid: true };
  }
  
  async checkAvailability(username: string): Promise<boolean> {
    const result = await this.db.query(`
      SELECT COUNT(*) FROM user_profiles 
      WHERE global_username = $1
    `, [username]);
    
    return result.rows[0].count === '0';
  }
  
  async changeUsername(
    userId: string, 
    newUsername: string, 
    adminOverride: boolean = false,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UsernameChangeResult> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const validation = await this.validateUsername(newUsername);
      if (!validation.valid) {
        return { success: false, newUsername: '', error: validation.error };
      }
      
      if (!adminOverride) {
        const canChange = await client.query(`
          SELECT can_change_username($1, $2)
        `, [userId, newUsername]);
        
        if (!canChange.rows[0].can_change_username) {
          return { 
            success: false, 
            newUsername: '', 
            error: 'Username change rate limit exceeded' 
          };
        }
      }
      
      const oldUsernameResult = await client.query(`
        SELECT global_username FROM user_profiles WHERE id = $1
      `, [userId]);
      
      const oldUsername = oldUsernameResult.rows[0]?.global_username;
      
      await client.query(`
        UPDATE user_profiles 
        SET global_username = $2, 
            username_changed_at = NOW(),
            username_change_count = username_change_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [userId, newUsername]);
      
      await client.query(`
        INSERT INTO username_changes (user_id, old_username, new_username, changed_at, ip_address, user_agent)
        VALUES ($1, $2, $3, NOW(), $4, $5)
      `, [userId, oldUsername, newUsername, ipAddress, userAgent]);
      
      await client.query('COMMIT');
      
      return { success: true, newUsername };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error changing username:', error);
      return { 
        success: false, 
        newUsername: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      client.release();
    }
  }
  
  async getUsernameHistory(userId: string): Promise<any[]> {
    const result = await this.db.query(`
      SELECT * FROM username_changes 
      WHERE user_id = $1 
      ORDER BY changed_at DESC
      LIMIT 50
    `, [userId]);
    
    return result.rows;
  }
}

