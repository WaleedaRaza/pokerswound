"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendService = void 0;
class FriendService {
    constructor(db) {
        this.db = db;
    }
    async getFriends(userId) {
        const result = await this.db.query(`
      SELECT 
        f.id as friendship_id,
        f.status as friendship_status,
        f.created_at as friendship_created_at,
        CASE 
          WHEN f.requester_id = $1 THEN f.addressee_id
          ELSE f.requester_id
        END as user_id,
        up.username,
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
            username: row.username,
            display_name: row.display_name,
            is_online: row.is_online,
            last_seen: new Date(row.last_seen),
            friendship_status: row.friendship_status,
            friendship_created_at: new Date(row.friendship_created_at)
        }));
    }
    async getFriendRequests(userId) {
        const result = await this.db.query(`
      SELECT 
        f.id,
        f.requester_id,
        up.username as requester_username,
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
    async sendFriendRequest(requesterId, addresseeUsername) {
        try {
            const addresseeResult = await this.db.query(`
        SELECT id FROM user_profiles WHERE username = $1
      `, [addresseeUsername]);
            if (addresseeResult.rows.length === 0) {
                return { success: false, error: 'User not found' };
            }
            const addresseeId = addresseeResult.rows[0].id;
            if (requesterId === addresseeId) {
                return { success: false, error: 'Cannot send friend request to yourself' };
            }
            const existingResult = await this.db.query(`
        SELECT * FROM friendships 
        WHERE (requester_id = $1 AND addressee_id = $2) 
        OR (requester_id = $2 AND addressee_id = $1)
      `, [requesterId, addresseeId]);
            if (existingResult.rows.length > 0) {
                const status = existingResult.rows[0].status;
                if (status === 'accepted') {
                    return { success: false, error: 'Already friends' };
                }
                else if (status === 'pending') {
                    return { success: false, error: 'Friend request already sent' };
                }
            }
            const blockedResult = await this.db.query(`
        SELECT is_user_blocked($1, $2, 'USER')
      `, [addresseeId, requesterId]);
            if (blockedResult.rows[0].is_user_blocked) {
                return { success: false, error: 'Cannot send friend request' };
            }
            await this.db.query(`
        INSERT INTO friendships (requester_id, addressee_id, status)
        VALUES ($1, $2, 'pending')
      `, [requesterId, addresseeId]);
            return { success: true };
        }
        catch (error) {
            console.error('Error sending friend request:', error);
            return { success: false, error: 'Failed to send friend request' };
        }
    }
    async respondToFriendRequest(requestId, userId, action) {
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
        }
        catch (error) {
            console.error('Error responding to friend request:', error);
            return { success: false, error: 'Failed to process friend request' };
        }
    }
    async removeFriend(friendshipId, userId) {
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
        }
        catch (error) {
            console.error('Error removing friend:', error);
            return { success: false, error: 'Failed to remove friend' };
        }
    }
}
exports.FriendService = FriendService;
