/**
 * IDEMPOTENCY MIDDLEWARE - Day 2 Weapon
 * Ensures every action happens EXACTLY ONCE
 */

/**
 * Middleware that enforces idempotency for all mutation endpoints
 * Requires X-Idempotency-Key header
 */
async function withIdempotency(req, res, next) {
  // Only apply to mutation methods
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    return next();
  }

  const key = req.headers['x-idempotency-key'];
  
  if (!key) {
    return res.status(400).json({ 
      error: 'X-Idempotency-Key header required for mutations',
      message: 'Please include a unique X-Idempotency-Key header with your request'
    });
  }

  // Get user ID (from auth or request body)
  const userId = req.user?.id || req.body?.user_id || req.body?.userId;
  
  if (!userId) {
    return res.status(400).json({ 
      error: 'User identification required',
      message: 'Request must include authenticated user or user_id in body'
    });
  }

  try {
    // Check if this request was already processed
    const dbV2 = req.app.locals.dbV2;
    if (!dbV2) {
      console.error('❌ dbV2 not initialized!');
      return next(); // Fallback to normal processing
    }

    const existing = await dbV2.checkIdempotency(key, userId);
    
    if (existing) {
      console.log(`♻️  Idempotent request detected: ${key} for user ${userId}`);
      
      // Return the cached response
      return res.status(existing.status || 200).json(existing);
    }

    // Not processed yet - continue but capture response
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let statusCode = 200;

    // Capture status code
    res.status = function(code) {
      statusCode = code;
      return originalStatus(code);
    };

    // Override json to capture and store result
    res.json = async function(data) {
      try {
        // Extract roomId from various sources
        const roomId = req.params.roomId || 
                      req.body?.roomId || 
                      req.body?.room_id ||
                      data?.roomId ||
                      data?.room?.id;

        // Store the response for future idempotent requests
        await dbV2.storeIdempotency(
          key, 
          userId, 
          req.path, 
          { ...data, status: statusCode },
          roomId
        );
        
        console.log(`✅ Stored idempotent response for key: ${key}`);
      } catch (error) {
        console.error('Failed to store idempotency:', error);
        // Don't fail the request if idempotency storage fails
      }

      return originalJson(data);
    };

    next();
  } catch (error) {
    console.error('Idempotency middleware error:', error);
    // Don't block request on middleware errors
    next();
  }
}

/**
 * Apply idempotency to specific routes
 */
function applyIdempotency(router) {
  // Apply to all POST routes in this router
  router.use(withIdempotency);
  return router;
}

module.exports = {
  withIdempotency,
  applyIdempotency
};
