# Redis Cache Setup and Testing Guide

## Overview
This project now includes Redis caching to improve API performance and reduce database load.

## Prerequisites
- Docker installed on your system
- Node.js and npm installed

## Setup Instructions

### 1. Start Redis with Docker

Start the Redis container using Docker Compose:

```bash
docker-compose up -d redis
```

Verify Redis is running:

```bash
docker ps | findstr redis
```

### 2. Install Dependencies

Navigate to the backend directory and install Redis dependencies:

```bash
cd backend
npm install
```

### 3. Configure Environment

Add Redis configuration to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_CACHE_TTL=3600
```

### 4. Start the Backend Server

```bash
npm run dev
```

You should see:
```
✅ Redis client connected
✅ Redis client ready
✓ Server running on port 5000
```

## Testing Redis Cache

### Test 1: Unit Tests
Run the Redis unit tests:

```bash
node tests/testRedisUnit.js
```

This will test basic Redis operations like:
- Set and Get
- Expiration
- Delete operations
- Pattern matching
- Complex object serialization

### Test 2: Integration Tests
Run the comprehensive PowerShell test script:

```powershell
.\tests\testRedisCache.ps1
```

This tests:
- Cache hits and misses
- Response time improvements
- Cache invalidation
- Different endpoints (villages, analytics, signalements)

### Test 3: Manual Testing

1. **Check Redis connection:**
   ```bash
   docker exec sos_supbots_redis redis-cli PING
   ```
   Should return: `PONG`

2. **Monitor cache in real-time:**
   ```bash
   docker exec -it sos_supbots_redis redis-cli MONITOR
   ```
   Then make API requests to see cache operations

3. **View all cached keys:**
   ```bash
   docker exec sos_supbots_redis redis-cli KEYS "cache:*"
   ```

4. **Check cache statistics:**
   ```bash
   docker exec sos_supbots_redis redis-cli INFO stats
   ```

5. **Clear all cache:**
   ```bash
   docker exec sos_supbots_redis redis-cli FLUSHALL
   ```

## Cached Endpoints

### Villages
- `GET /api/villages` - Cached for 30 minutes
- `GET /api/villages/:id` - Cached for 30 minutes
- `GET /api/villages/:id/statistics` - Cached for 10 minutes

### Signalements
- `GET /api/signalements` - Cached for 2 minutes
- `GET /api/signalements/my-deadlines` - Cached for 1 minute
- `GET /api/signalements/:id` - Cached for 5 minutes

### Analytics
- `GET /api/analytics` - Cached for 5 minutes
- `GET /api/analytics/heatmap` - Cached for 10 minutes
- `GET /api/analytics/village-ratings` - Cached for 10 minutes

## Cache Invalidation

Cache is automatically invalidated when:
- Creating a new signalement (POST)
- Updating a signalement (PUT)
- Deleting a signalement (DELETE)
- Assigning a signalement
- Creating or updating villages

Patterns invalidated:
- `cache:signalements:*` - All signalement caches
- `cache:analytics:*` - All analytics caches
- `cache:villages:*` - All village caches

## Performance Monitoring

### Check Cache Hit Rate

Look for these log messages in the server output:
- `✅ Cache HIT: cache:...` - Data served from cache
- `❌ Cache MISS: cache:...` - Data fetched from database

### Measure Response Times

Use the PowerShell test script to compare:
- First request (cache miss)
- Subsequent requests (cache hit)

Expected improvements:
- 30-70% faster response times for cached data
- Reduced database load
- Better scalability

## Troubleshooting

### Redis not connecting
1. Check if Docker is running: `docker ps`
2. Check Redis logs: `docker logs sos_supbots_redis`
3. Restart Redis: `docker-compose restart redis`

### Cache not working
1. Check server logs for Redis connection errors
2. Verify environment variables are set correctly
3. Check Redis is accessible: `docker exec sos_supbots_redis redis-cli PING`

### Clear stuck cache
```bash
docker exec sos_supbots_redis redis-cli FLUSHALL
```

## Docker Commands Reference

```bash
# Start Redis
docker-compose up -d redis

# Stop Redis
docker-compose stop redis

# View Redis logs
docker logs -f sos_supbots_redis

# Access Redis CLI
docker exec -it sos_supbots_redis redis-cli

# Remove Redis container
docker-compose down redis

# Remove Redis data volume
docker volume rm sos_supbots_hackforhope_redis_data
```

## Cache Key Patterns

The caching system uses these key patterns:

```
cache:signalements:user:{userId}:role:{role}:village:{villageId}:query:{query}
cache:analytics:user:{userId}:role:{role}:village:{villageId}:query:{query}
cache:villages:all
cache:{originalUrl}:user:{userId}
```

This ensures user-specific, role-based, and village-scoped caching.

## Production Considerations

1. **Redis Password**: Set `REDIS_PASSWORD` in production
2. **TTL Tuning**: Adjust cache TTL based on data volatility
3. **Memory Limit**: Configure Redis maxmemory in docker-compose.yml
4. **Persistence**: Redis is configured with AOF persistence
5. **Monitoring**: Use Redis INFO commands to monitor performance

## Next Steps

- Monitor cache performance in production
- Adjust TTL values based on usage patterns
- Consider Redis Cluster for high availability
- Implement cache warming strategies for frequently accessed data
- Add cache metrics to monitoring dashboard
