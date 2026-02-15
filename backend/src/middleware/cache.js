import { cacheService } from '../config/redis.js';

/**
 * Middleware to cache GET requests
 * @param {number} ttl - Time to live in seconds (optional)
 * @param {function} keyGenerator - Function to generate cache key from req (optional)
 * @returns {function} - Express middleware
 */
export const cacheMiddleware = (ttl = null, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : `cache:${req.originalUrl || req.url}:user:${req.user?.id || 'anonymous'}`;

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = (data) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Error caching response:', err);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Middleware to invalidate cache on data mutation
 * @param {string|string[]|function} patterns - Cache patterns to invalidate
 * @returns {function} - Express middleware
 */
export const invalidateCache = (patterns) => {
  return async (req, res, next) => {
    // Store original json/send methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Function to invalidate cache patterns
    const invalidate = async () => {
      try {
        const patternsToInvalidate = typeof patterns === 'function' 
          ? patterns(req) 
          : Array.isArray(patterns) 
            ? patterns 
            : [patterns];

        for (const pattern of patternsToInvalidate) {
          await cacheService.delPattern(pattern);
          console.log(`🗑️ Cache invalidated: ${pattern}`);
        }
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    };

    // Override response methods
    res.json = function(data) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidate();
      }
      return originalJson(data);
    };

    res.send = function(data) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidate();
      }
      return originalSend(data);
    };

    next();
  };
};

/**
 * Generate cache key for signalements
 */
export const signalementCacheKey = (req) => {
  const userId = req.user?.id || 'anonymous';
  const role = req.user?.role || 'none';
  const village = req.user?.village || 'none';
  const query = JSON.stringify(req.query);
  return `cache:signalements:user:${userId}:role:${role}:village:${village}:query:${query}`;
};

/**
 * Generate cache key for analytics
 */
export const analyticsCacheKey = (req) => {
  const userId = req.user?.id || 'anonymous';
  const role = req.user?.role || 'none';
  const village = req.user?.village || 'none';
  const query = JSON.stringify(req.query);
  return `cache:analytics:user:${userId}:role:${role}:village:${village}:query:${query}`;
};

/**
 * Generate cache key for villages
 */
export const villageCacheKey = (req) => {
  return `cache:villages:all`;
};

export default cacheMiddleware;
