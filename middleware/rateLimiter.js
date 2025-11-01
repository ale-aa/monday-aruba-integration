/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting to prevent API abuse
 * Uses in-memory store for simplicity (not suitable for distributed systems)
 * For production with multiple servers, consider Redis
 */

/**
 * In-memory store for rate limit tracking
 * Structure: { key: { count: number, resetTime: timestamp } }
 */
const requestStore = new Map();

/**
 * Clean up expired entries every 60 seconds
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (data.resetTime < now) {
      requestStore.delete(key);
    }
  }
}, 60000);

/**
 * Get client identifier (IP address, userId, etc.)
 * @param {Request} req - Express request object
 * @returns {string} Unique client identifier
 */
function getClientId(req) {
  // Try to get user ID from JWT (if authenticated)
  if (req.monday && req.monday.userId) {
    return `user_${req.monday.userId}`;
  }

  // Fall back to IP address
  return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * Create a rate limiter with configurable limits
 * @param {object} options - Configuration options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} options.message - Error message
 * @param {number} options.statusCode - HTTP status code (default: 429)
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 100, // 100 requests per minute
    message = 'Too many requests, please try again later',
    statusCode = 429
  } = options;

  return (req, res, next) => {
    const clientId = getClientId(req);
    const now = Date.now();
    const requestKey = `${clientId}:${req.path}`;

    // Get or create client's rate limit data
    let clientData = requestStore.get(requestKey);

    if (!clientData || clientData.resetTime < now) {
      // Reset rate limit
      clientData = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      clientData.count++;
    }

    // Update store
    requestStore.set(requestKey, clientData);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientData.count));
    res.setHeader('X-RateLimit-Reset', clientData.resetTime);

    // Check if limit exceeded
    if (clientData.count > max) {
      return res.status(statusCode).json({
        success: false,
        error: 'Rate limit exceeded',
        message: message,
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    next();
  };
}

/**
 * Preset rate limiters for different endpoints
 */

const emailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 emails per hour
  message: 'Email limit exceeded. Maximum 100 emails per hour per user.'
});

const authorizationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 authorization attempts per 15 minutes
  message: 'Too many authorization attempts. Please try again in 15 minutes.'
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute (general API limit)
  message: 'Too many requests. Please try again later.'
});

const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute (very strict)
  message: 'Too many requests from this IP, please try again after an hour'
});

/**
 * Redis-backed rate limiter for distributed systems
 * Use this for production with multiple server instances
 *
 * @param {object} options - Configuration options
 * @param {object} options.redisClient - Redis client instance
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @returns {Function} Express middleware
 */
function createRedisRateLimiter(options = {}) {
  const {
    redisClient,
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests'
  } = options;

  if (!redisClient) {
    console.warn('Redis client not provided, falling back to memory-based rate limiter');
    return createRateLimiter({ windowMs, max, message });
  }

  return async (req, res, next) => {
    const clientId = getClientId(req);
    const requestKey = `ratelimit:${clientId}:${req.path}`;
    const windowEnd = Date.now() + windowMs;

    try {
      // Increment counter and set expiration
      const count = await redisClient.incr(requestKey);

      if (count === 1) {
        // First request in this window, set expiration
        await redisClient.pexpire(requestKey, windowMs);
      }

      // Get remaining TTL
      const ttl = await redisClient.pttl(requestKey);

      // Set headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', windowEnd);

      if (count > max) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: message,
          retryAfter: Math.ceil(ttl / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // On error, let request through but log it
      next();
    }
  };
}

/**
 * Middleware for debugging rate limits
 * Shows current rate limit status
 */
function rateLimitDebug(req, res, next) {
  const clientId = getClientId(req);
  const requestKey = `${clientId}:${req.path}`;
  const clientData = requestStore.get(requestKey);

  if (clientData) {
    const remaining = Math.max(0, 100 - clientData.count);
    console.log(`[RateLimit] Client: ${clientId}, Endpoint: ${req.path}, Requests: ${clientData.count}, Remaining: ${remaining}`);
  }

  next();
}

/**
 * Bypass rate limiting for specific routes
 * Useful for health checks and public endpoints
 */
function bypassRateLimiter(req, res, next) {
  // This middleware does nothing - it's a placeholder
  // Use it on routes you want to exclude from rate limiting
  next();
}

module.exports = {
  createRateLimiter,
  createRedisRateLimiter,
  emailLimiter,
  authorizationLimiter,
  apiLimiter,
  strictLimiter,
  rateLimitDebug,
  bypassRateLimiter,
  getClientId
};
