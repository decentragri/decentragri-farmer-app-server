// Simple cache service with in-memory fallback and Redis support
// TODO: Install ioredis package for production Redis support

interface CacheItem {
    value: any;
    expiry: number;
}

export class CacheService {
    private static instance: CacheService;
    private memoryCache: Map<string, CacheItem> = new Map();
    private useRedis: boolean = false;
    private redisInitialized: boolean = false;
    private connectionAttempted: boolean = false;
    // private redis: any; // Will be initialized when Redis is available

    private constructor() {
        // Try to initialize Redis connection if available
        this.initializeRedis();
        
        // Clean up expired items every 5 minutes
        setInterval(() => {
            this.cleanupExpired();
        }, 5 * 60 * 1000);
    }

    private async initializeRedis(): Promise<void> {
        if (this.connectionAttempted) return;
        this.connectionAttempted = true;

        try {
            // Check if Redis environment variables are available
            const { KEYDB_HOST, KEYDB_PORT, KEYDB_PASSWORD } = await import('./constants');
            
            if (!KEYDB_HOST) {
                console.log('ℹ️  Cache Service: No Redis configuration found, using in-memory cache');
                console.log('💡 Tip: Set KEYDB_HOST environment variable to enable Redis caching');
                this.useRedis = false;
                return;
            }

            // TODO: Uncomment when ioredis is installed
            // try {
            //     const Redis = require('ioredis');
            //     this.redis = new Redis({
            //         host: KEYDB_HOST,
            //         port: KEYDB_PORT || 6379,
            //         password: KEYDB_PASSWORD,
            //         retryDelayOnFailover: 100,
            //         maxRetriesPerRequest: 3,
            //         lazyConnect: true,
            //         connectTimeout: 5000,
            //         commandTimeout: 5000,
            //     });

            //     // Test connection
            //     await this.redis.ping();
            //     this.useRedis = true;
            //     this.redisInitialized = true;
            //     console.log('✅ Cache Service: Connected to Redis successfully');
            // } catch (redisError: any) {
            //     console.log('⚠️  Cache Service: Redis connection failed, falling back to in-memory cache');
            //     console.log(`   Error: ${redisError.message}`);
            //     console.log('💡 Tip: Install ioredis package and ensure Redis is running');
            //     this.useRedis = false;
            //     if (this.redis) {
            //         this.redis.disconnect();
            //     }
            // }

            // For now, just log that Redis support is not yet implemented
            console.log('⚠️  Cache Service: Redis support not yet implemented, using in-memory cache');
            console.log('💡 Tip: Install ioredis package and uncomment Redis code in redis.service.ts');
            this.useRedis = false;

        } catch (error: any) {
            console.log('⚠️  Cache Service: Failed to initialize Redis, using in-memory cache');
            console.log(`   Error: ${error.message}`);
            this.useRedis = false;
        }
    }

    private cleanupExpired(): void {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, item] of this.memoryCache.entries()) {
            if (item.expiry < now) {
                this.memoryCache.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 Cache Service: Cleaned up ${cleanedCount} expired items from memory cache`);
        }
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    public getCacheStatus(): { type: string; connected: boolean; itemCount: number } {
        return {
            type: this.useRedis ? 'Redis' : 'In-Memory',
            connected: this.useRedis && this.redisInitialized,
            itemCount: this.memoryCache.size
        };
    }

    /**
     * Set a value in cache with optional TTL (time to live)
     * @param key Cache key
     * @param value Value to cache (will be JSON stringified)
     * @param ttlSeconds TTL in seconds (default: 300 = 5 minutes)
     */
    public async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        try {
            if (this.useRedis && this.redisInitialized) {
                // TODO: Redis implementation
                // const serializedValue = JSON.stringify(value);
                // await this.redis.setex(key, ttlSeconds, serializedValue);
            } else {
                // In-memory implementation
                const expiry = Date.now() + (ttlSeconds * 1000);
                this.memoryCache.set(key, { value, expiry });
            }
        } catch (error: any) {
            console.error('❌ Cache set error:', error.message);
            // Graceful degradation - don't throw, just log
        }
    }

    /**
     * Get a value from cache
     * @param key Cache key
     * @returns Parsed value or null if not found
     */
    public async get<T = any>(key: string): Promise<T | null> {
        try {
            if (this.useRedis && this.redisInitialized) {
                // TODO: Redis implementation
                // const value = await this.redis.get(key);
                // if (value === null) return null;
                // return JSON.parse(value) as T;
                return null;
            } else {
                // In-memory implementation
                const item = this.memoryCache.get(key);
                if (!item) return null;
                
                if (item.expiry < Date.now()) {
                    this.memoryCache.delete(key);
                    return null;
                }
                
                return item.value as T;
            }
        } catch (error: any) {
            console.error('❌ Cache get error:', error.message);
            return null;
        }
    }

    /**
     * Delete a key from cache
     * @param key Cache key
     */
    public async del(key: string): Promise<void> {
        try {
            if (this.useRedis && this.redisInitialized) {
                // TODO: Redis implementation
                // await this.redis.del(key);
            } else {
                this.memoryCache.delete(key);
            }
        } catch (error: any) {
            console.error('❌ Cache delete error:', error.message);
        }
    }

    /**
     * Delete multiple keys matching a pattern
     * @param pattern Pattern to match (e.g., "user:*", "staking:*")
     */
    public async delPattern(pattern: string): Promise<void> {
        try {
            if (this.useRedis && this.redisInitialized) {
                // TODO: Redis implementation
                // const keys = await this.redis.keys(pattern);
                // if (keys.length > 0) {
                //     await this.redis.del(...keys);
                // }
            } else {
                // In-memory implementation with simple pattern matching
                const regex = new RegExp(pattern.replace('*', '.*'));
                const keysToDelete: string[] = [];
                
                for (const key of this.memoryCache.keys()) {
                    if (regex.test(key)) {
                        keysToDelete.push(key);
                    }
                }
                
                keysToDelete.forEach(key => this.memoryCache.delete(key));
            }
        } catch (error: any) {
            console.error('❌ Cache delete pattern error:', error.message);
        }
    }

    /**
     * Check if a key exists in cache
     * @param key Cache key
     */
    public async exists(key: string): Promise<boolean> {
        try {
            if (this.useRedis && this.redisInitialized) {
                // TODO: Redis implementation
                // const result = await this.redis.exists(key);
                // return result === 1;
                return false;
            } else {
                const item = this.memoryCache.get(key);
                if (!item) return false;
                
                if (item.expiry < Date.now()) {
                    this.memoryCache.delete(key);
                    return false;
                }
                
                return true;
            }
        } catch (error: any) {
            console.error('❌ Cache exists error:', error.message);
            return false;
        }
    }

    /**
     * Get or set pattern - if key doesn't exist, execute function and cache result
     * @param key Cache key
     * @param fetchFunction Function to execute if cache miss
     * @param ttlSeconds TTL in seconds
     */
    public async getOrSet<T>(
        key: string, 
        fetchFunction: () => Promise<T>, 
        ttlSeconds: number = 300
    ): Promise<T> {
        try {
            // Try to get from cache first
            const cachedValue = await this.get<T>(key);
            if (cachedValue !== null) {
                return cachedValue;
            }

            // Cache miss - execute function
            const freshValue = await fetchFunction();
            
            // Cache the result (don't await to avoid blocking)
            this.set(key, freshValue, ttlSeconds).catch(error => {
                console.error('❌ Background cache set failed:', error.message);
            });
            
            return freshValue;
        } catch (error: any) {
            console.error('❌ Cache getOrSet error:', error.message);
            // Fallback to direct execution
            try {
                return await fetchFunction();
            } catch (funcError: any) {
                console.error('❌ Function execution failed:', funcError.message);
                throw funcError;
            }
        }
    }

    /**
     * Increment a numeric value in cache
     * @param key Cache key
     * @param ttlSeconds TTL for the key if it doesn't exist
     */
    public async increment(key: string, ttlSeconds: number = 300): Promise<number> {
        try {
            if (this.useRedis && this.redisInitialized) {
                // TODO: Redis implementation
                // const value = await this.redis.incr(key);
                // if (value === 1) {
                //     await this.redis.expire(key, ttlSeconds);
                // }
                // return value;
                return 1;
            } else {
                const item = this.memoryCache.get(key);
                let value = 1;
                
                if (item && item.expiry > Date.now()) {
                    value = (item.value as number) + 1;
                }
                
                const expiry = Date.now() + (ttlSeconds * 1000);
                this.memoryCache.set(key, { value, expiry });
                return value;
            }
        } catch (error: any) {
            console.error('❌ Cache increment error:', error.message);
            return 0;
        }
    }

    /**
     * Close Redis connection and clear memory cache
     */
    public async disconnect(): Promise<void> {
        try {
            if (this.useRedis && this.redisInitialized) {
                // TODO: Redis implementation
                // await this.redis.quit();
                console.log('✅ Cache Service: Redis connection closed');
            }
            this.memoryCache.clear();
            console.log('✅ Cache Service: Memory cache cleared');
        } catch (error: any) {
            console.error('❌ Cache disconnect error:', error.message);
        }
    }
}

export default CacheService;
