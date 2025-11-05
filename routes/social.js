/**
 * PokerGeek.ai - Social Features API
 * Handles usernames, friends, profile stats, and notifications
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================
// MIDDLEWARE: AUTH CHECK
// ============================================
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}

// ============================================
// USERNAME ENDPOINTS
// ============================================

/**
 * POST /api/social/username/check
 * Check if username is available
 */
router.post('/username/check', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Validate format (3-20 chars, alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)' 
      });
    }

    // Check availability in database
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const available = !data;
    res.json({ available, username });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

/**
 * POST /api/social/username/set
 * Set username for current user
 */
router.post('/username/set', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    // Validate format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)' 
      });
    }

    // Check if user already has username
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (profile && profile.username) {
      return res.status(400).json({ error: 'Username already set' });
    }

    // Set username
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        username, 
        username_set_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Username already taken' });
      }
      throw error;
    }

    res.json({ success: true, username: data.username });
  } catch (error) {
    console.error('Error setting username:', error);
    res.status(500).json({ error: 'Failed to set username' });
  }
});

/**
 * POST /api/social/username/change
 * Change existing username
 */
router.post('/username/change', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)' 
      });
    }

    // Get current profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, username_change_count, max_username_changes')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if trying to set same username
    if (profile.username === username) {
      return res.status(400).json({ error: 'This is already your username' });
    }

    // ✅ No username change limit - users can change unlimited times
    const changeCount = profile.username_change_count || 0;

    // Check if new username is available
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Log the change to username_changes table
    await supabase
      .from('username_changes')
      .insert({
        user_id: userId,
        old_username: profile.username,
        new_username: username
      });

    // Update username
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        username,
        username_changed_at: new Date().toISOString(),
        username_change_count: changeCount + 1
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Username already taken' });
      }
      throw error;
    }

    res.json({ 
      success: true, 
      username: data.username,
      changes_remaining: 999  // Unlimited
    });
  } catch (error) {
    console.error('Error changing username:', error);
    res.status(500).json({ error: 'Failed to change username' });
  }
});

/**
 * GET /api/social/username/:username
 * Get user profile by username
 */
router.get('/username/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, total_hands_played, total_games_played, win_rate')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching user by username:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ============================================
// PROFILE STATS ENDPOINTS
// ============================================

/**
 * GET /api/social/profile/me
 * Get current user's profile with stats
 */
router.get('/profile/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Get friend count (using existing schema)
    const { count: friendCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    res.json({ ...data, friend_count: friendCount || 0 });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/social/profile/me
 * Update current user's profile
 */
router.patch('/profile/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, avatar_url } = req.body;

    const updates = {};
    if (display_name) updates.display_name = display_name;
    if (avatar_url) updates.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================
// FRIENDS ENDPOINTS
// ============================================

/**
 * GET /api/social/friends
 * Get list of current user's friends
 */
router.get('/friends', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get friendships where user is either requester_id or addressee_id (existing schema)
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    // Get friend IDs
    const friendIds = friendships.map(f => 
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      return res.json([]);
    }

    // Fetch friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', friendIds);

    if (profileError) throw profileError;

    res.json(profiles);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/**
 * POST /api/social/friends/request
 * Send friend request
 */
router.post('/friends/request', requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Find receiver by username
    const { data: receiver, error: receiverError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const receiverId = receiver.id;

    // Can't friend yourself
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot friend yourself' });
    }

    // Check if already friends (existing schema uses requester_id/addressee_id)
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${senderId},addressee_id.eq.${receiverId}),and(requester_id.eq.${receiverId},addressee_id.eq.${senderId})`)
      .eq('status', 'accepted')
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .single();

    if (existingRequest) {
      return res.status(409).json({ error: 'Friend request already sent' });
    }

    // Create friend request
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for receiver
    await supabase
      .from('notifications')
      .insert({
        user_id: receiverId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `You have a new friend request`,
        action_url: '/friends'
      });

    res.json({ success: true, request: data });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * GET /api/social/friends/requests
 * Get pending friend requests (received)
 */
router.get('/friends/requests', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        created_at,
        sender:user_profiles!sender_id(id, username, display_name, avatar_url)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

/**
 * POST /api/social/friends/accept/:requestId
 * Accept friend request
 */
router.post('/friends/accept/:requestId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Get request
    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    // Create friendship using existing schema (requester_id, addressee_id)
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        requester_id: request.sender_id,
        addressee_id: userId,
        status: 'accepted'
      })
      .select()
      .single();

    if (friendshipError) throw friendshipError;

    // Create notification for sender
    await supabase
      .from('notifications')
      .insert({
        user_id: request.sender_id,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: 'Your friend request was accepted',
        action_url: '/friends'
      });

    res.json({ success: true, friendship });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * POST /api/social/friends/reject/:requestId
 * Reject friend request
 */
router.post('/friends/reject/:requestId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

/**
 * DELETE /api/social/friends/:friendId
 * Remove friend
 */
router.delete('/friends/:friendId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    // Delete using existing schema (requester_id/addressee_id)
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

/**
 * GET /api/social/notifications
 * Get notifications for current user
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, unread_only = false } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/social/notifications/:id/read
 * Mark notification as read
 */
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PATCH /api/social/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

/**
 * GET /api/social/notifications/count
 * Get unread notification count
 */
router.get('/notifications/count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

module.exports = router;

