# Redis Setup Guide for Agent Middleware

## Overview

Redis is required for the Agent Middleware system to provide:
- **Caching**: 24-hour TTL for extraction results
- **Rate Limiting**: Per-API-key and global rate limits
- **Performance**: Sub-100ms cache retrieval

## Deployment Options

### Option 1: Upstash Redis (Recommended for Vercel)

Upstash provides serverless Redis with:
- Pay-per-request pricing
- Global replication
- Automatic scaling
- No connection limits
- REST API support

#### Setup Steps

1. **Create Account**
   - Go to [console.upstash.com](https://console.upstash.com)
   - Sign up with GitHub or email

2. **Create Database**
   - Click "Create Database"
   - Choose region (closest to your Vercel deployment)
   - Select "Global" for multi-region replication (optional)
   - Click "Create"

3. **Get Connection URL**
   - Click on your database
   - Copy the "Redis URL" (format: `redis://default:password@region.upstash.io:port`)
   - Add to environment variables:

   ```bash
   REDIS_URL=redis://default:your-password@us1-example-12345.upstash.io:12345
   ```

4. **Configure TLS (Optional)**
   - Upstash supports TLS by default
   - Use `rediss://` prefix for explicit TLS:

   ```bash
   REDIS_URL=rediss://default:your-password@us1-example-12345.upstash.io:12345
   ```

5. **Test Connection**
   ```bash
   # Using redis-cli
   redis-cli -u $REDIS_URL ping
   # Should return: PONG
   ```

#### Pricing

- **Free Tier**: 10,000 commands/day
- **Pay-as-you-go**: $0.20 per 100K commands
- **Pro**: Starting at $10/month

For Agent Middleware:
- Cache hit: 1 command (GET)
- Cache miss: 2 commands (GET + SET)
- Estimated: 50K-100K commands/day for moderate traffic

### Option 2: Redis Cloud (Managed Redis)

Redis Cloud provides fully managed Redis with:
- High availability
- Automatic backups
- Advanced features (modules, clustering)
- 24/7 support

#### Setup Steps

1. **Create Account**
   - Go to [redis.com/try-free](https://redis.com/try-free)
   - Sign up for free tier

2. **Create Database**
   - Click "New Database"
   - Choose cloud provider (AWS, GCP, Azure)
   - Select region
   - Choose plan (Free: 30MB, Paid: 100MB+)

3. **Get Connection Details**
   - Copy endpoint, port, and password
   - Format connection URL:

   ```bash
   REDIS_URL=redis://default:your-password@redis-12345.cloud.redislabs.com:12345
   ```

4. **Configure Security**
   - Enable TLS/SSL
   - Whitelist IP addresses (if needed)
   - Set password complexity

#### Pricing

- **Free Tier**: 30MB storage
- **Essentials**: Starting at $5/month (100MB)
- **Pro**: Starting at $50/month (1GB)

### Option 3: Self-Hosted Redis

For full control and cost optimization:

#### Docker Deployment

```bash
# Create docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    container_name: agent-middleware-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass your-secure-password
    restart: unless-stopped

volumes:
  redis-data:
EOF

# Start Redis
docker-compose up -d

# Test connection
docker exec -it agent-middleware-redis redis-cli -a your-secure-password ping
```

Connection URL:
```bash
REDIS_URL=redis://:your-secure-password@localhost:6379
```

#### Ubuntu/Debian Installation

```bash
# Install Redis
sudo apt-get update
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password
requirepass your-secure-password

# Enable persistence
appendonly yes
appendfsync everysec

# Restart Redis
sudo systemctl restart redis-server

# Test connection
redis-cli -a your-secure-password ping
```

#### macOS Installation

```bash
# Install Redis
brew install redis

# Start Redis
brew services start redis

# Configure password
redis-cli
> CONFIG SET requirepass your-secure-password
> AUTH your-secure-password
> CONFIG REWRITE

# Test connection
redis-cli -a your-secure-password ping
```

#### Production Configuration

For production self-hosted Redis:

```conf
# /etc/redis/redis.conf

# Bind to specific interface
bind 127.0.0.1

# Set password
requirepass your-secure-password

# Enable persistence
appendonly yes
appendfsync everysec

# Set memory limit
maxmemory 2gb
maxmemory-policy allkeys-lru

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# Enable logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Set max connections
maxclients 10000
```

## Configuration for Agent Middleware

### Connection Settings

The Agent Middleware uses `ioredis` for Redis connections:

```typescript
// lib/engine/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

### Environment Variables

```bash
# Required
REDIS_URL=redis://default:password@host:port

# Optional (for advanced configuration)
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=2000
REDIS_CONNECT_TIMEOUT=10000
```

### Cache Key Structure

The system uses namespaced keys:

```
agent:wrap:{sha256-hash-of-url}
```

Example:
```
agent:wrap:a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
```

### TTL Configuration

Cache entries expire after 24 hours (86400 seconds):

```typescript
// lib/engine/cache.ts
const CACHE_TTL = 86400; // 24 hours
await redis.setex(key, CACHE_TTL, JSON.stringify(data));
```

## Monitoring

### Redis Metrics

Monitor these key metrics:

```bash
# Memory usage
redis-cli -u $REDIS_URL INFO memory

# Hit rate
redis-cli -u $REDIS_URL INFO stats | grep keyspace

# Connected clients
redis-cli -u $REDIS_URL INFO clients

# Commands per second
redis-cli -u $REDIS_URL INFO stats | grep instantaneous_ops_per_sec
```

### Key Metrics to Track

1. **Cache Hit Rate**: Target 70%+
   ```bash
   redis-cli -u $REDIS_URL INFO stats | grep keyspace_hits
   redis-cli -u $REDIS_URL INFO stats | grep keyspace_misses
   ```

2. **Memory Usage**: Monitor for capacity
   ```bash
   redis-cli -u $REDIS_URL INFO memory | grep used_memory_human
   ```

3. **Evictions**: Should be minimal
   ```bash
   redis-cli -u $REDIS_URL INFO stats | grep evicted_keys
   ```

4. **Connection Count**: Monitor for leaks
   ```bash
   redis-cli -u $REDIS_URL INFO clients | grep connected_clients
   ```

### Alerting

Set up alerts for:
- Memory usage > 80%
- Cache hit rate < 50%
- Connection failures
- High eviction rate

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Redis

**Solutions**:
```bash
# Test connection
redis-cli -u $REDIS_URL ping

# Check Redis is running
redis-cli -u $REDIS_URL INFO server

# Verify credentials
redis-cli -h host -p port -a password ping

# Check network connectivity
telnet host port
```

### Memory Issues

**Problem**: Redis running out of memory

**Solutions**:
```bash
# Check memory usage
redis-cli -u $REDIS_URL INFO memory

# Check eviction policy
redis-cli -u $REDIS_URL CONFIG GET maxmemory-policy

# Set eviction policy
redis-cli -u $REDIS_URL CONFIG SET maxmemory-policy allkeys-lru

# Increase memory limit
redis-cli -u $REDIS_URL CONFIG SET maxmemory 2gb
```

### Performance Issues

**Problem**: Slow cache operations

**Solutions**:
```bash
# Check latency
redis-cli -u $REDIS_URL --latency

# Check slow queries
redis-cli -u $REDIS_URL SLOWLOG GET 10

# Monitor commands
redis-cli -u $REDIS_URL MONITOR
```

### Data Persistence Issues

**Problem**: Data lost after restart

**Solutions**:
```bash
# Enable AOF persistence
redis-cli -u $REDIS_URL CONFIG SET appendonly yes

# Check persistence status
redis-cli -u $REDIS_URL INFO persistence

# Force save
redis-cli -u $REDIS_URL BGSAVE
```

## Security Best Practices

### 1. Authentication

Always use password authentication:

```bash
# Set strong password
redis-cli CONFIG SET requirepass "your-very-strong-password-here"
```

### 2. Network Security

Restrict access:

```conf
# Bind to specific interface
bind 127.0.0.1

# Or use firewall rules
sudo ufw allow from your-app-server-ip to any port 6379
```

### 3. TLS/SSL

Enable encryption for production:

```bash
# Upstash: Use rediss:// prefix
REDIS_URL=rediss://default:password@host:port

# Self-hosted: Configure TLS in redis.conf
tls-port 6380
tls-cert-file /path/to/cert.pem
tls-key-file /path/to/key.pem
tls-ca-cert-file /path/to/ca.pem
```

### 4. Disable Dangerous Commands

```conf
# redis.conf
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command SHUTDOWN ""
```

### 5. Regular Backups

```bash
# Manual backup
redis-cli -u $REDIS_URL BGSAVE

# Automated backups (cron)
0 2 * * * redis-cli -u $REDIS_URL BGSAVE
```

## Performance Optimization

### 1. Connection Pooling

Use connection pooling for better performance:

```typescript
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});
```

### 2. Pipeline Commands

Batch multiple commands:

```typescript
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
const results = await pipeline.exec();
```

### 3. Memory Optimization

Configure eviction policy:

```bash
# LRU eviction for cache use case
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Set appropriate memory limit
redis-cli CONFIG SET maxmemory 2gb
```

### 4. Persistence Tuning

Balance durability and performance:

```conf
# Faster but less durable
appendfsync everysec

# Slower but more durable
appendfsync always

# Fastest but least durable
appendfsync no
```

## Capacity Planning

### Estimating Memory Requirements

For Agent Middleware:

```
Average cache entry size: ~50KB (compact format)
Cache entries per day: 10,000 URLs
Total memory needed: 10,000 × 50KB = 500MB
With overhead (30%): 650MB
Recommended: 1GB minimum
```

### Scaling Guidelines

| Traffic Level | Requests/Day | Cache Entries | Memory Needed | Recommendation |
|---------------|--------------|---------------|---------------|----------------|
| Low | 1,000 | 1,000 | 100MB | Free tier |
| Medium | 10,000 | 10,000 | 1GB | Paid tier |
| High | 100,000 | 50,000 | 5GB | Dedicated instance |
| Very High | 1,000,000+ | 200,000+ | 20GB+ | Redis Cluster |

## Migration

### Migrating to Upstash

```bash
# Export data from old Redis
redis-cli -u $OLD_REDIS_URL --rdb dump.rdb

# Import to Upstash (contact support for large datasets)
# Or let cache rebuild naturally over 24 hours
```

### Zero-Downtime Migration

1. Set up new Redis instance
2. Update `REDIS_URL` in environment
3. Deploy new version
4. Old cache expires naturally
5. Decommission old Redis after 24 hours

## Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Upstash Documentation](https://docs.upstash.com/redis)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
