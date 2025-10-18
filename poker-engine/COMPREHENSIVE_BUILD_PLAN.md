# Comprehensive Build Plan: Social Features Integration

## 🎯 **Build Philosophy**

**Core Principle**: Build incrementally, test thoroughly, integrate seamlessly.

**Build Order**: Database → Backend Services → API Layer → Frontend Components → Integration Testing

---

## 📊 **Phase 0: Database Foundation (COMPLETED ✅)**

### **What We Already Have:**
```sql
✅ user_profiles (enhanced with global_username, display_name, user_role)
✅ friendships (requester_id, addressee_id, status)
✅ player_aliases (game_id, user_id, alias, is_admin_override)
✅ username_changes (audit trail)
✅ role_permissions (RBAC system)
✅ user_blocks (blocking system)
✅ conversations & messages (messaging)
✅ All necessary indexes and constraints
```

### **Verification Script:**
```javascript
// scripts/verify-database-schema.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verifySchema() {
  console.log('🔍 Verifying database schema...\n');
  
  // Check required tables
  const requiredTables = [
    'user_profiles',
    'friendships', 
    'player_aliases',
    'username_changes',
    'role_permissions',
    'user_blocks',
    'conversations',
    'messages'
  ];
  
  for (const table of requiredTables) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [table]);
    
    console.log(`${result.rows[0].exists ? '✅' : '❌'} Table: ${table}`);
  }
  
  // Check required functions
  const requiredFunctions = [
    'can_change_username',
    'has_permission',
    'is_user_blocked'
  ];
  
  console.log('\n🔧 Checking functions...\n');
  for (const func of requiredFunctions) {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = $1
      )
    `, [func]);
    
    console.log(`${result.rows[0].exists ? '✅' : '❌'} Function: ${func}`);
  }
  
  await pool.end();
}

verifySchema().catch(console.error);
```

---

## 🏗️ **Phase 1: Backend Services Layer**

### **File Structure:**
```
poker-engine/
├── src/
│   ├── services/
│   │   ├── user/
│   │   │   ├── UserProfileService.ts      ⭐ NEW
│   │   │   ├── UsernameService.ts         ⭐ NEW
│   │   │   └── UserSettingsService.ts     ⭐ NEW
│   │   ├── social/
│   │   │   ├── FriendService.ts           ⭐ NEW
│   │   │   ├── BlockService.ts            ⭐ NEW
│   │   │   └── MessagingService.ts        ⭐ NEW
│   │   ├── game/
│   │   │   ├── DisplayService.ts          ⭐ NEW
│   │   │   ├── PlayerAliasService.ts      ⭐ NEW
│   │   │   └── GameIntegrationService.ts  ⭐ NEW
│   │   └── database/
│   │       └── DatabaseService.ts         ✅ EXISTS (enhance)
│   ├── middleware/
│   │   ├── auth-middleware.ts             ✅ EXISTS (enhance)
│   │   ├── rateLimit.ts                   ⭐ NEW
│   │   └── validation.ts                  ⭐ NEW
│   └── utils/
│       ├── validators.ts                  ✅ EXISTS (enhance)
│       └── helpers.ts                     ✅ EXISTS (enhance)
```

### **1.1: User Profile Service**

```typescript
// src/services/user/UserProfileService.ts
import { Pool } from 'pg';
import { supabase } from '../../config/supabase';

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
  
  // Computed fields
  username_change_count: number;
  max_username_changes: number;
  can_change_username: boolean;
  last_username_change?: Date;
}

export class UserProfileService {
  constructor(private db: Pool) {}
  
  /**
   * Get user profile by ID
   * Integrates with Supabase auth and local database
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Get from database
      const result = await this.db.query(`
        SELECT 
          up.*,
          (SELECT COUNT(*) FROM username_changes WHERE user_id = up.id AND changed_at > NOW() - INTERVAL '30 days') as username_change_count,
          (SELECT MAX(changed_at) FROM username_changes WHERE user_id = up.id) as last_username_change,
          (SELECT can_change_username(up.id, up.global_username)) as can_change_username
        FROM user_profiles up
        WHERE up.id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToProfile(result.rows[0]);
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
  
  /**
   * Get multiple user profiles by IDs
   * Optimized for batch loading
   */
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
  
  /**
   * Create or update user profile
   * Called on first login or when profile is updated
   */
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
  
  /**
   * Update user's online status
   * Called on login/logout/activity
   */
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.db.query(`
      UPDATE user_profiles 
      SET is_online = $2, last_seen = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [userId, isOnline]);
  }
  
  /**
   * Search users by username
   * Used for friend search
   */
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
      chips: parseInt(row.chips),
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
```

### **1.2: Username Service**

```typescript
// src/services/user/UsernameService.ts
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
  
  /**
   * Validate username format and availability
   */
  async validateUsername(username: string): Promise<UsernameValidation> {
    // Format validation
    if (username.length < 3 || username.length > 50) {
      return { valid: false, error: 'Username must be 3-50 characters' };
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
    }
    
    // Reserved words check
    const reserved = ['admin', 'moderator', 'system', 'bot', 'poker', 'dealer'];
    if (reserved.includes(username.toLowerCase())) {
      return { valid: false, error: 'This username is reserved' };
    }
    
    // Availability check
    const available = await this.checkAvailability(username);
    if (!available) {
      return { valid: false, error: 'Username already taken' };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if username is available
   */
  async checkAvailability(username: string): Promise<boolean> {
    const result = await this.db.query(`
      SELECT COUNT(*) FROM user_profiles 
      WHERE global_username = $1
    `, [username]);
    
    return result.rows[0].count === '0';
  }
  
  /**
   * Change user's global username
   * Enforces rate limiting and logs change
   */
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
      
      // Validate username
      const validation = await this.validateUsername(newUsername);
      if (!validation.valid) {
        return { success: false, newUsername: '', error: validation.error };
      }
      
      // Check rate limiting (unless admin override)
      if (!adminOverride) {
        const canChange = await client.query(`
          SELECT can_change_username($1, $2)
        `, [userId, newUsername]);
        
        if (!canChange.rows[0].can_change_username) {
          return { 
            success: false, 
            newUsername: '', 
            error: 'Username change rate limit exceeded. Try again later.' 
          };
        }
      }
      
      // Get old username for audit trail
      const oldUsernameResult = await client.query(`
        SELECT global_username FROM user_profiles WHERE id = $1
      `, [userId]);
      
      const oldUsername = oldUsernameResult.rows[0]?.global_username;
      
      // Update username
      await client.query(`
        UPDATE user_profiles 
        SET global_username = $2, 
            username_changed_at = NOW(),
            username_change_count = username_change_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [userId, newUsername]);
      
      // Log change
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
  
  /**
   * Get username change history for a user
   */
  async getUsernameHistory(userId: string): Promise<any[]> {
    const result = await this.db.query(`
      SELECT * FROM username_changes 
      WHERE user_id = $1 
      ORDER BY changed_at DESC
      LIMIT 50
    `, [userId]);
    
    return result.rows;
  }
  
  /**
   * Admin: Get recent username changes across platform
   */
  async getRecentChanges(limit: number = 100): Promise<any[]> {
    const result = await this.db.query(`
      SELECT uc.*, up.user_role
      FROM username_changes uc
      JOIN user_profiles up ON uc.user_id = up.id
      ORDER BY uc.changed_at DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }
}
```

### **1.3: Friend Service**

```typescript
// src/services/social/FriendService.ts
import { Pool } from 'pg';

export interface Friend {
  id: string;
  user_id: string;
  global_username: string;
  display_name?: string;
  is_online: boolean;
  last_seen: Date;
  friendship_status: 'pending' | 'accepted' | 'blocked';
  friendship_created_at: Date;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  requester_username: string;
  requester_display_name?: string;
  created_at: Date;
}

export class FriendService {
  constructor(private db: Pool) {}
  
  /**
   * Get user's friend list
   * Includes online status and last seen
   */
  async getFriends(userId: string): Promise<Friend[]> {
    const result = await this.db.query(`
      SELECT 
        f.id as friendship_id,
        f.status as friendship_status,
        f.created_at as friendship_created_at,
        CASE 
          WHEN f.requester_id = $1 THEN f.addressee_id
          ELSE f.requester_id
        END as user_id,
        up.global_username,
        up.display_name,
        up.is_online,
        up.last_seen
      FROM friendships f
      JOIN user_profiles up ON (
        CASE 
          WHEN f.requester_id = $1 THEN f.addressee_id = up.id
          ELSE f.requester_id = up.id
        END
      )
      WHERE (f.requester_id = $1 OR f.addressee_id = $1) 
      AND f.status = 'accepted'
      ORDER BY up.is_online DESC, up.last_seen DESC
    `, [userId]);
    
    return result.rows.map(row => ({
      id: row.friendship_id,
      user_id: row.user_id,
      global_username: row.global_username,
      display_name: row.display_name,
      is_online: row.is_online,
      last_seen: new Date(row.last_seen),
      friendship_status: row.friendship_status,
      friendship_created_at: new Date(row.friendship_created_at)
    }));
  }
  
  /**
   * Get pending friend requests for a user
   */
  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    const result = await this.db.query(`
      SELECT 
        f.id,
        f.requester_id,
        up.global_username as requester_username,
        up.display_name as requester_display_name,
        f.created_at
      FROM friendships f
      JOIN user_profiles up ON f.requester_id = up.id
      WHERE f.addressee_id = $1 
      AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      requester_id: row.requester_id,
      requester_username: row.requester_username,
      requester_display_name: row.requester_display_name,
      created_at: new Date(row.created_at)
    }));
  }
  
  /**
   * Send a friend request
   */
  async sendFriendRequest(requesterId: string, addresseeUsername: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find addressee by username
      const addresseeResult = await this.db.query(`
        SELECT id FROM user_profiles WHERE global_username = $1
      `, [addresseeUsername]);
      
      if (addresseeResult.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }
      
      const addresseeId = addresseeResult.rows[0].id;
      
      // Can't friend yourself
      if (requesterId === addresseeId) {
        return { success: false, error: 'Cannot send friend request to yourself' };
      }
      
      // Check if already friends or request exists
      const existingResult = await this.db.query(`
        SELECT * FROM friendships 
        WHERE (requester_id = $1 AND addressee_id = $2) 
        OR (requester_id = $2 AND addressee_id = $1)
      `, [requesterId, addresseeId]);
      
      if (existingResult.rows.length > 0) {
        const status = existingResult.rows[0].status;
        if (status === 'accepted') {
          return { success: false, error: 'Already friends' };
        } else if (status === 'pending') {
          return { success: false, error: 'Friend request already sent' };
        } else if (status === 'blocked') {
          return { success: false, error: 'Cannot send friend request' };
        }
      }
      
      // Check if blocked
      const blockedResult = await this.db.query(`
        SELECT is_user_blocked($1, $2, 'USER')
      `, [addresseeId, requesterId]);
      
      if (blockedResult.rows[0].is_user_blocked) {
        return { success: false, error: 'Cannot send friend request' };
      }
      
      // Create friend request
      await this.db.query(`
        INSERT INTO friendships (requester_id, addressee_id, status)
        VALUES ($1, $2, 'pending')
      `, [requesterId, addresseeId]);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Failed to send friend request' };
    }
  }
  
  /**
   * Accept or reject a friend request
   */
  async respondToFriendRequest(
    requestId: string, 
    userId: string, 
    action: 'accepted' | 'blocked'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.db.query(`
        UPDATE friendships 
        SET status = $3, updated_at = NOW()
        WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
        RETURNING *
      `, [requestId, userId, action]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Friend request not found or already processed' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error responding to friend request:', error);
      return { success: false, error: 'Failed to process friend request' };
    }
  }
  
  /**
   * Remove a friend
   */
  async removeFriend(friendshipId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.db.query(`
        DELETE FROM friendships 
        WHERE id = $1 
        AND (requester_id = $2 OR addressee_id = $2)
        AND status = 'accepted'
        RETURNING *
      `, [friendshipId, userId]);
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Friendship not found' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: 'Failed to remove friend' };
    }
  }
  
  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const result = await this.db.query(`
      SELECT COUNT(*) FROM friendships 
      WHERE ((requester_id = $1 AND addressee_id = $2) 
      OR (requester_id = $2 AND addressee_id = $1))
      AND status = 'accepted'
    `, [userId1, userId2]);
    
    return result.rows[0].count > '0';
  }
}
```

### **1.4: Display Service**

```typescript
// src/services/game/DisplayService.ts
import { Pool } from 'pg';

export interface PlayerDisplay {
  user_id: string;
  display_name: string;
  display_type: 'admin_override' | 'game_alias' | 'display_name' | 'username';
  is_online: boolean;
  avatar_url?: string;
}

export class DisplayService {
  constructor(private db: Pool) {}
  
  /**
   * Get display name for a player in a specific game
   * Follows hierarchy: Admin Override → Game Alias → Display Name → Username
   */
  async getPlayerDisplayName(userId: string, gameId: string): Promise<PlayerDisplay> {
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
  
  /**
   * Get display names for all players in a game
   * Optimized for batch loading
   */
  async getGamePlayerDisplays(gameId: string): Promise<Map<string, PlayerDisplay>> {
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
    
    const displayMap = new Map<string, PlayerDisplay>();
    result.rows.forEach(row => {
      displayMap.set(row.user_id, row);
    });
    
    return displayMap;
  }
  
  /**
   * Set per-game alias for a user
   */
  async setGameAlias(userId: string, gameId: string, alias: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate alias format
      if (!/^[a-zA-Z0-9_-]{1,32}$/.test(alias)) {
        return { success: false, error: 'Invalid alias format. Use 1-32 characters: letters, numbers, hyphens, underscores only.' };
      }
      
      // Check if alias is already taken in this game
      const existingResult = await this.db.query(`
        SELECT COUNT(*) FROM player_aliases 
        WHERE game_id = $1 AND alias = $2 AND user_id != $3
      `, [gameId, alias, userId]);
      
      if (existingResult.rows[0].count > '0') {
        return { success: false, error: 'This alias is already taken in this game' };
      }
      
      // Upsert alias
      await this.db.query(`
        INSERT INTO player_aliases (user_id, game_id, alias, is_admin_override)
        VALUES ($1, $2, $3, false)
        ON CONFLICT (game_id, user_id) 
        DO UPDATE SET alias = $3, updated_at = NOW()
      `, [userId, gameId, alias]);
      
      return { success: true };
    } catch (error) {
      console.error('Error setting game alias:', error);
      return { success: false, error: 'Failed to set game alias' };
    }
  }
  
  /**
   * Admin: Set admin override alias for a player
   */
  async setAdminOverrideAlias(
    adminUserId: string, 
    targetUserId: string, 
    gameId: string, 
    alias: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify admin has permission
      const hasPermission = await this.db.query(`
        SELECT has_permission($1, 'moderate', 'users')
      `, [adminUserId]);
      
      if (!hasPermission.rows[0].has_permission) {
        return { success: false, error: 'Insufficient permissions' };
      }
      
      // Set admin override alias
      await this.db.query(`
        INSERT INTO player_aliases (user_id, game_id, alias, is_admin_override, set_by_user_id)
        VALUES ($1, $2, $3, true, $4)
        ON CONFLICT (game_id, user_id) 
        DO UPDATE SET 
          alias = $3, 
          is_admin_override = true, 
          set_by_user_id = $4,
          updated_at = NOW()
      `, [targetUserId, gameId, alias, adminUserId]);
      
      return { success: true };
    } catch (error) {
      console.error('Error setting admin override alias:', error);
      return { success: false, error: 'Failed to set admin override' };
    }
  }
}
```

---

## 🌐 **Phase 2: API Layer**

### **File Structure:**
```
poker-engine/
├── src/
│   ├── routes/
│   │   ├── user.routes.ts          ⭐ NEW
│   │   ├── friends.routes.ts       ⭐ NEW
│   │   ├── game-display.routes.ts  ⭐ NEW
│   │   └── admin.routes.ts         ⭐ NEW (enhance existing)
```

### **2.1: User Routes**

```typescript
// src/routes/user.routes.ts
import express from 'express';
import { Pool } from 'pg';
import { UserProfileService } from '../services/user/UserProfileService';
import { UsernameService } from '../services/user/UsernameService';
import { authenticateUser } from '../middleware/auth-middleware';
import { rateLimitStrict, rateLimitModerate } from '../middleware/rateLimit';

export function createUserRoutes(db: Pool): express.Router {
  const router = express.Router();
  const userProfileService = new UserProfileService(db);
  const usernameService = new UsernameService(db);
  
  /**
   * GET /api/user/profile
   * Get current user's profile
   */
  router.get('/profile', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await userProfileService.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });
  
  /**
   * PUT /api/user/profile
   * Update user profile (display_name, avatar_url)
   */
  router.put('/profile', authenticateUser, rateLimitModerate, async (req, res) => {
    try {
      const userId = req.user.id;
      const { display_name, avatar_url } = req.body;
      
      const profile = await userProfileService.upsertUserProfile(userId, {
        display_name,
        avatar_url
      });
      
      res.json({ success: true, profile });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });
  
  /**
   * GET /api/user/username/available
   * Check if username is available
   */
  router.get('/username/available', async (req, res) => {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      const validation = await usernameService.validateUsername(username);
      
      res.json({ 
        available: validation.valid,
        error: validation.error
      });
    } catch (error) {
      console.error('Error checking username availability:', error);
      res.status(500).json({ error: 'Failed to check availability' });
    }
  });
  
  /**
   * POST /api/user/username/change
   * Change user's global username
   */
  router.post('/username/change', authenticateUser, rateLimitStrict, async (req, res) => {
    try {
      const userId = req.user.id;
      const { username } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      const result = await usernameService.changeUsername(
        userId, 
        username, 
        false, 
        ipAddress, 
        userAgent
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ 
        success: true, 
        username: result.newUsername 
      });
    } catch (error) {
      console.error('Error changing username:', error);
      res.status(500).json({ error: 'Failed to change username' });
    }
  });
  
  /**
   * GET /api/user/username/history
   * Get username change history for current user
   */
  router.get('/username/history', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const history = await usernameService.getUsernameHistory(userId);
      
      res.json({ history });
    } catch (error) {
      console.error('Error fetching username history:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });
  
  /**
   * GET /api/user/search
   * Search for users by username
   */
  router.get('/search', authenticateUser, async (req, res) => {
    try {
      const { q, limit } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const searchLimit = limit ? parseInt(limit as string) : 20;
      const users = await userProfileService.searchUsers(q, searchLimit);
      
      res.json({ users });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });
  
  return router;
}
```

### **2.2: Friend Routes**

```typescript
// src/routes/friends.routes.ts
import express from 'express';
import { Pool } from 'pg';
import { FriendService } from '../services/social/FriendService';
import { authenticateUser } from '../middleware/auth-middleware';
import { rateLimitModerate } from '../middleware/rateLimit';

export function createFriendRoutes(db: Pool): express.Router {
  const router = express.Router();
  const friendService = new FriendService(db);
  
  /**
   * GET /api/friends
   * Get user's friend list
   */
  router.get('/', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const friends = await friendService.getFriends(userId);
      
      res.json({ friends });
    } catch (error) {
      console.error('Error fetching friends:', error);
      res.status(500).json({ error: 'Failed to fetch friends' });
    }
  });
  
  /**
   * GET /api/friends/requests
   * Get pending friend requests
   */
  router.get('/requests', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const requests = await friendService.getFriendRequests(userId);
      
      res.json({ requests });
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      res.status(500).json({ error: 'Failed to fetch friend requests' });
    }
  });
  
  /**
   * POST /api/friends/request
   * Send a friend request
   */
  router.post('/request', authenticateUser, rateLimitModerate, async (req, res) => {
    try {
      const requesterId = req.user.id;
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }
      
      const result = await friendService.sendFriendRequest(requesterId, username);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true, message: 'Friend request sent' });
    } catch (error) {
      console.error('Error sending friend request:', error);
      res.status(500).json({ error: 'Failed to send friend request' });
    }
  });
  
  /**
   * PUT /api/friends/request/:requestId
   * Accept or reject a friend request
   */
  router.put('/request/:requestId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const { requestId } = req.params;
      const { action } = req.body;
      
      if (!['accepted', 'blocked'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      const result = await friendService.respondToFriendRequest(requestId, userId, action);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true, message: `Friend request ${action}` });
    } catch (error) {
      console.error('Error responding to friend request:', error);
      res.status(500).json({ error: 'Failed to process friend request' });
    }
  });
  
  /**
   * DELETE /api/friends/:friendshipId
   * Remove a friend
   */
  router.delete('/:friendshipId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user.id;
      const { friendshipId } = req.params;
      
      const result = await friendService.removeFriend(friendshipId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true, message: 'Friend removed' });
    } catch (error) {
      console.error('Error removing friend:', error);
      res.status(500).json({ error: 'Failed to remove friend' });
    }
  });
  
  return router;
}
```

### **2.3: Game Display Routes**

```typescript
// src/routes/game-display.routes.ts
import express from 'express';
import { Pool } from 'pg';
import { DisplayService } from '../services/game/DisplayService';
import { authenticateUser } from '../middleware/auth-middleware';
import { rateLimitModerate } from '../middleware/rateLimit';

export function createGameDisplayRoutes(db: Pool): express.Router {
  const router = express.Router();
  const displayService = new DisplayService(db);
  
  /**
   * GET /api/game/:gameId/players
   * Get all player display names for a game
   */
  router.get('/:gameId/players', authenticateUser, async (req, res) => {
    try {
      const { gameId } = req.params;
      const displayMap = await displayService.getGamePlayerDisplays(gameId);
      
      const players = Array.from(displayMap.values());
      
      res.json({ players });
    } catch (error) {
      console.error('Error fetching game players:', error);
      res.status(500).json({ error: 'Failed to fetch game players' });
    }
  });
  
  /**
   * POST /api/game/:gameId/alias
   * Set per-game alias for current user
   */
  router.post('/:gameId/alias', authenticateUser, rateLimitModerate, async (req, res) => {
    try {
      const userId = req.user.id;
      const { gameId } = req.params;
      const { alias } = req.body;
      
      if (!alias) {
        return res.status(400).json({ error: 'Alias is required' });
      }
      
      const result = await displayService.setGameAlias(userId, gameId, alias);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({ success: true, message: 'Game alias set' });
    } catch (error) {
      console.error('Error setting game alias:', error);
      res.status(500).json({ error: 'Failed to set game alias' });
    }
  });
  
  /**
   * GET /api/game/:gameId/player/:userId/display
   * Get display name for a specific player in a game
   */
  router.get('/:gameId/player/:userId/display', authenticateUser, async (req, res) => {
    try {
      const { gameId, userId } = req.params;
      const display = await displayService.getPlayerDisplayName(userId, gameId);
      
      res.json({ display });
    } catch (error) {
      console.error('Error fetching player display:', error);
      res.status(500).json({ error: 'Failed to fetch player display' });
    }
  });
  
  return router;
}
```

### **2.4: Middleware - Rate Limiting**

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiting for sensitive operations
 * (username changes, password resets)
 */
export const rateLimitStrict = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Moderate rate limiting for normal operations
 * (profile updates, friend requests)
 */
export const rateLimitModerate = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Relaxed rate limiting for read operations
 * (fetching profiles, searching users)
 */
export const rateLimitRelaxed = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please wait a moment',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### **2.5: Integration into Main Server**

```typescript
// src/sophisticated-engine-server.ts (add these routes)

// Import route creators
import { createUserRoutes } from './routes/user.routes';
import { createFriendRoutes } from './routes/friends.routes';
import { createGameDisplayRoutes } from './routes/game-display.routes';

// ... existing imports and setup ...

// Register new routes
app.use('/api/user', createUserRoutes(pool));
app.use('/api/friends', createFriendRoutes(pool));
app.use('/api/game', createGameDisplayRoutes(pool));

// ... rest of server setup ...
```

---

## 🎨 **Phase 3: Frontend Components**

### **File Structure:**
```
poker-engine/
├── public/
│   ├── js/
│   │   ├── components/
│   │   │   ├── UsernameManager.js       ⭐ NEW
│   │   │   ├── FriendSystem.js          ⭐ NEW
│   │   │   ├── GameDisplayManager.js    ⭐ NEW
│   │   │   └── UserProfile.js           ⭐ NEW
│   │   ├── services/
│   │   │   ├── ApiService.js            ⭐ NEW
│   │   │   ├── WebSocketService.js      ✅ EXISTS (enhance)
│   │   │   └── StateManager.js          ⭐ NEW
│   │   └── utils/
│   │       ├── validators.js            ⭐ NEW
│   │       └── formatters.js            ⭐ NEW
│   ├── css/
│   │   ├── user-profile.css             ⭐ NEW
│   │   ├── friend-system.css            ⭐ NEW
│   │   └── game-display.css             ⭐ NEW
│   └── poker.html                       ✅ EXISTS (enhance)
```

### **3.1: API Service (Centralized API Calls)**

```javascript
// public/js/services/ApiService.js
class ApiService {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }
  
  async call(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call failed: ${endpoint}`, error);
      throw error;
    }
  }
  
  // User API
  async getUserProfile() {
    return this.call('/user/profile');
  }
  
  async updateProfile(data) {
    return this.call('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async checkUsernameAvailable(username) {
    return this.call(`/user/username/available?username=${encodeURIComponent(username)}`);
  }
  
  async changeUsername(username) {
    return this.call('/user/username/change', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  }
  
  async getUsernameHistory() {
    return this.call('/user/username/history');
  }
  
  async searchUsers(query, limit = 20) {
    return this.call(`/user/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
  
  // Friend API
  async getFriends() {
    return this.call('/friends');
  }
  
  async getFriendRequests() {
    return this.call('/friends/requests');
  }
  
  async sendFriendRequest(username) {
    return this.call('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  }
  
  async respondToFriendRequest(requestId, action) {
    return this.call(`/friends/request/${requestId}`, {
      method: 'PUT',
      body: JSON.stringify({ action })
    });
  }
  
  async removeFriend(friendshipId) {
    return this.call(`/friends/${friendshipId}`, {
      method: 'DELETE'
    });
  }
  
  // Game Display API
  async getGamePlayers(gameId) {
    return this.call(`/game/${gameId}/players`);
  }
  
  async setGameAlias(gameId, alias) {
    return this.call(`/game/${gameId}/alias`, {
      method: 'POST',
      body: JSON.stringify({ alias })
    });
  }
  
  async getPlayerDisplay(gameId, userId) {
    return this.call(`/game/${gameId}/player/${userId}/display`);
  }
}

// Export singleton instance
const apiService = new ApiService();
```

### **3.2: State Manager (Centralized State)**

```javascript
// public/js/services/StateManager.js
class StateManager {
  constructor() {
    this.state = {
      currentUser: null,
      friends: [],
      friendRequests: [],
      gameDisplays: new Map(),
      isOnline: navigator.onLine
    };
    
    this.listeners = new Map();
    this.setupOnlineDetection();
  }
  
  setState(key, value) {
    this.state[key] = value;
    this.notifyListeners(key, value);
  }
  
  getState(key) {
    return this.state[key];
  }
  
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  notifyListeners(key, value) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => callback(value));
    }
  }
  
  setupOnlineDetection() {
    window.addEventListener('online', () => {
      this.setState('isOnline', true);
      console.log('🟢 Connection restored');
    });
    
    window.addEventListener('offline', () => {
      this.setState('isOnline', false);
      console.log('🔴 Connection lost');
    });
  }
}

// Export singleton instance
const stateManager = new StateManager();
```

### **3.3: Username Manager Component**

```javascript
// public/js/components/UsernameManager.js
class UsernameManager {
  constructor() {
    this.currentProfile = null;
    this.changeModal = null;
  }
  
  async initialize() {
    try {
      const { profile } = await apiService.getUserProfile();
      this.currentProfile = profile;
      stateManager.setState('currentUser', profile);
      this.render();
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }
  
  render() {
    const container = document.getElementById('usernameManager');
    if (!container) return;
    
    const canChange = this.currentProfile.can_change_username;
    const changesLeft = this.currentProfile.max_username_changes - this.currentProfile.username_change_count;
    
    container.innerHTML = `
      <div class="username-card">
        <div class="username-section">
          <label>Global Username</label>
          <div class="username-display">
            <span class="username-value">@${this.currentProfile.global_username}</span>
            <button 
              class="btn btn-sm ${canChange ? 'btn-primary' : 'btn-disabled'}" 
              onclick="usernameManager.showChangeModal()"
              ${canChange ? '' : 'disabled'}
              title="${canChange ? 'Change username' : 'Rate limit reached'}">
              ✏️ Change
            </button>
          </div>
          <div class="username-info">
            <small>Changes remaining: ${changesLeft}/${this.currentProfile.max_username_changes}</small>
          </div>
        </div>
        
        <div class="display-name-section">
          <label>Display Name (Optional)</label>
          <div class="display-name-input">
            <input 
              type="text" 
              id="displayNameInput" 
              value="${this.currentProfile.display_name || ''}" 
              placeholder="Friendly name"
              maxlength="50">
            <button class="btn btn-success btn-sm" onclick="usernameManager.updateDisplayName()">
              💾 Save
            </button>
          </div>
          <small>This is shown alongside your username</small>
        </div>
        
        <div class="username-history">
          <button class="btn btn-sm btn-secondary" onclick="usernameManager.showHistory()">
            📜 View Change History
          </button>
        </div>
      </div>
    `;
  }
  
  showChangeModal() {
    if (!this.currentProfile.can_change_username) {
      showStatus('❌ Username change rate limit reached', 'error');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal modal-active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Change Username</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>New Username</label>
            <input 
              type="text" 
              id="newUsernameInput" 
              placeholder="Enter new username"
              maxlength="50"
              pattern="[a-zA-Z0-9_-]+">
            <div id="usernameValidation" class="validation-message"></div>
          </div>
          <div class="warning-box">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>Username must be 3-50 characters</li>
              <li>Only letters, numbers, hyphens, and underscores</li>
              <li>Changes remaining: ${this.currentProfile.max_username_changes - this.currentProfile.username_change_count}</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="usernameManager.submitUsernameChange()" id="submitUsernameBtn" disabled>
            💾 Change Username
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.changeModal = modal;
    
    // Real-time validation
    const input = document.getElementById('newUsernameInput');
    input.addEventListener('input', debounce(() => this.validateUsername(), 500));
  }
  
  async validateUsername() {
    const input = document.getElementById('newUsernameInput');
    const validation = document.getElementById('usernameValidation');
    const submitBtn = document.getElementById('submitUsernameBtn');
    const username = input.value.trim();
    
    if (username.length < 3) {
      validation.innerHTML = '';
      submitBtn.disabled = true;
      return;
    }
    
    try {
      const { available, error } = await apiService.checkUsernameAvailable(username);
      
      if (available) {
        validation.innerHTML = '<span class="validation-success">✅ Available</span>';
        submitBtn.disabled = false;
      } else {
        validation.innerHTML = `<span class="validation-error">❌ ${error || 'Already taken'}</span>`;
        submitBtn.disabled = true;
      }
    } catch (error) {
      validation.innerHTML = '<span class="validation-error">❌ Error checking availability</span>';
      submitBtn.disabled = true;
    }
  }
  
  async submitUsernameChange() {
    const input = document.getElementById('newUsernameInput');
    const username = input.value.trim();
    
    try {
      await apiService.changeUsername(username);
      showStatus('✅ Username changed successfully!', 'success');
      this.changeModal.remove();
      await this.initialize();
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
  
  async updateDisplayName() {
    const input = document.getElementById('displayNameInput');
    const displayName = input.value.trim();
    
    try {
      await apiService.updateProfile({ display_name: displayName });
      showStatus('✅ Display name updated!', 'success');
      await this.initialize();
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
  
  async showHistory() {
    try {
      const { history } = await apiService.getUsernameHistory();
      
      const modal = document.createElement('div');
      modal.className = 'modal modal-active';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Username Change History</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
          </div>
          <div class="modal-body">
            <div class="history-list">
              ${history.length > 0 ? history.map(entry => `
                <div class="history-item">
                  <div class="history-change">
                    <span class="old-username">${entry.old_username || 'Initial'}</span>
                    <span class="arrow">→</span>
                    <span class="new-username">${entry.new_username}</span>
                  </div>
                  <div class="history-date">${formatDate(entry.changed_at)}</div>
                </div>
              `).join('') : '<p class="empty-state">No username changes yet</p>'}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
}

// Initialize
const usernameManager = new UsernameManager();
```

---

## 🔄 **Phase 4: WebSocket Integration**

### **4.1: Real-Time Updates**

```javascript
// Enhance existing WebSocket connection in poker.html

// Friend status updates
socket.on('friend_status_update', (data) => {
  console.log('👥 Friend status update:', data);
  
  // Update state
  const friends = stateManager.getState('friends') || [];
  const friendIndex = friends.findIndex(f => f.user_id === data.user_id);
  
  if (friendIndex !== -1) {
    friends[friendIndex].is_online = data.is_online;
    friends[friendIndex].last_seen = new Date(data.last_seen);
    stateManager.setState('friends', friends);
  }
  
  // Update UI if friend system is open
  if (window.friendSystem) {
    friendSystem.updateFriendStatus(data.user_id, data.is_online);
  }
});

// Username change notifications
socket.on('username_changed', (data) => {
  console.log('✏️ Username changed:', data);
  
  // Update current user if it's them
  if (data.user_id === currentUser?.id) {
    usernameManager.initialize();
  }
  
  // Update game displays
  if (gameDisplayManager && currentGame) {
    gameDisplayManager.updatePlayerUsername(data.user_id, data.new_username);
  }
});

// Friend request received
socket.on('friend_request_received', (data) => {
  console.log('📨 Friend request received:', data);
  
  showStatus(`👥 ${data.requester_username} sent you a friend request!`, 'info');
  
  // Update friend requests count
  if (window.friendSystem) {
    friendSystem.loadFriendRequests();
  }
});

// Friend request accepted
socket.on('friend_request_accepted', (data) => {
  console.log('✅ Friend request accepted:', data);
  
  showStatus(`👥 ${data.addressee_username} accepted your friend request!`, 'success');
  
  // Reload friend list
  if (window.friendSystem) {
    friendSystem.loadFriends();
  }
});
```

---

## 🧪 **Phase 5: Testing & Integration**

### **5.1: Integration Test Script**

```javascript
// tests/integration/social-features.test.js
const { Pool } = require('pg');
const { UserProfileService } = require('../../src/services/user/UserProfileService');
const { UsernameService } = require('../../src/services/user/UsernameService');
const { FriendService } = require('../../src/services/social/FriendService');
const { DisplayService } = require('../../src/services/game/DisplayService');

describe('Social Features Integration', () => {
  let db;
  let userProfileService;
  let usernameService;
  let friendService;
  let displayService;
  
  beforeAll(async () => {
    db = new Pool({ connectionString: process.env.DATABASE_URL });
    userProfileService = new UserProfileService(db);
    usernameService = new UsernameService(db);
    friendService = new FriendService(db);
    displayService = new DisplayService(db);
  });
  
  afterAll(async () => {
    await db.end();
  });
  
  describe('Username Management', () => {
    test('should create user profile', async () => {
      const userId = 'test-user-1';
      const profile = await userProfileService.upsertUserProfile(userId, {
        username: 'testuser',
        display_name: 'Test User'
      });
      
      expect(profile.global_username).toBe('testuser');
      expect(profile.display_name).toBe('Test User');
    });
    
    test('should validate username format', async () => {
      const validation = await usernameService.validateUsername('test_user123');
      expect(validation.valid).toBe(true);
      
      const invalidValidation = await usernameService.validateUsername('test user');
      expect(invalidValidation.valid).toBe(false);
    });
    
    test('should change username with rate limiting', async () => {
      const userId = 'test-user-1';
      
      const result = await usernameService.changeUsername(userId, 'newusername123');
      expect(result.success).toBe(true);
      
      // Should fail due to rate limiting
      const result2 = await usernameService.changeUsername(userId, 'anotherusername');
      expect(result2.success).toBe(false);
    });
  });
  
  describe('Friend System', () => {
    test('should send friend request', async () => {
      const user1 = 'test-user-1';
      const user2Username = 'testuser2';
      
      const result = await friendService.sendFriendRequest(user1, user2Username);
      expect(result.success).toBe(true);
    });
    
    test('should accept friend request', async () => {
      // Setup: Get pending request
      const user2 = 'test-user-2';
      const requests = await friendService.getFriendRequests(user2);
      
      if (requests.length > 0) {
        const requestId = requests[0].id;
        const result = await friendService.respondToFriendRequest(requestId, user2, 'accepted');
        expect(result.success).toBe(true);
      }
    });
    
    test('should get friend list', async () => {
      const user1 = 'test-user-1';
      const friends = await friendService.getFriends(user1);
      
      expect(Array.isArray(friends)).toBe(true);
    });
  });
  
  describe('Display Service', () => {
    test('should get player display name hierarchy', async () => {
      const userId = 'test-user-1';
      const gameId = 'test-game-1';
      
      const display = await displayService.getPlayerDisplayName(userId, gameId);
      expect(display.display_name).toBeDefined();
      expect(display.display_type).toBeDefined();
    });
    
    test('should set game alias', async () => {
      const userId = 'test-user-1';
      const gameId = 'test-game-1';
      const alias = 'TheShark';
      
      const result = await displayService.setGameAlias(userId, gameId, alias);
      expect(result.success).toBe(true);
    });
  });
});
```

---

## 📋 **Phase 6: Deployment Checklist**

### **Pre-Deployment:**
```
✅ Database schema verified
✅ All migrations run successfully
✅ Backend services tested
✅ API endpoints tested
✅ Frontend components tested
✅ WebSocket events tested
✅ Rate limiting configured
✅ Error handling implemented
✅ Logging configured
✅ Performance optimized
```

### **Deployment Steps:**
```
1. Backup database
2. Run migrations on production
3. Deploy backend code
4. Deploy frontend code
5. Test all features in production
6. Monitor for errors
7. Roll back if necessary
```

---

## 🎯 **Success Metrics**

### **Technical Metrics:**
- API response time < 200ms
- Database query time < 50ms
- WebSocket latency < 100ms
- Zero constraint violations
- 99.9% uptime

### **User Metrics:**
- Friend request acceptance rate > 60%
- Username change usage > 20%
- Display name adoption > 50%
- User satisfaction score > 4.5/5

---

This comprehensive plan ensures all layers of your stack work together seamlessly while maintaining scalability and performance.
