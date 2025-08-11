// Advanced API rate limiting and request optimization
import CacheService from "../utils/redis.service";

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (request: any) => string;
    onLimitReached?: (request: any) => void;
}

interface RequestMetrics {
    timestamp: number;
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    userAgent: string;
    ip: string;
    userId?: string;
}

interface ApiQuota {
    userId: string;
    planType: 'free' | 'basic' | 'premium' | 'enterprise';
    dailyLimit: number;
    monthlyLimit: number;
    requestsToday: number;
    requestsThisMonth: number;
    resetDaily: string;
    resetMonthly: string;
}

interface RequestOptimization {
    enableCompression: boolean;
    enableCaching: boolean;
    enableBatching: boolean;
    maxBatchSize: number;
    compressionThreshold: number;
}

export class AdvancedApiService {
    private static instance: AdvancedApiService;
    private cache: CacheService;
    private requestMetrics: RequestMetrics[] = [];
    private rateLimitConfigs: Map<string, RateLimitConfig> = new Map();
    private optimizationSettings: RequestOptimization;

    private constructor() {
        this.cache = CacheService.getInstance();
        this.optimizationSettings = {
            enableCompression: true,
            enableCaching: true,
            enableBatching: true,
            maxBatchSize: 10,
            compressionThreshold: 1024 // 1KB
        };
        this.setupDefaultRateLimits();
    }

    public static getInstance(): AdvancedApiService {
        if (!AdvancedApiService.instance) {
            AdvancedApiService.instance = new AdvancedApiService();
        }
        return AdvancedApiService.instance;
    }

    /**
     * Rate Limiting System
     */
    private setupDefaultRateLimits(): void {
        // Different rate limits for different endpoints
        this.rateLimitConfigs.set('/api/auth/*', {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 10,
            keyGenerator: (req) => `auth:${req.ip}:${req.headers['user-agent']}`
        });

        this.rateLimitConfigs.set('/api/staking/*', {
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 30,
            keyGenerator: (req) => `staking:${req.userId || req.ip}`
        });

        this.rateLimitConfigs.set('/api/ai/*', {
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 10,
            keyGenerator: (req) => `ai:${req.userId || req.ip}`
        });

        this.rateLimitConfigs.set('/api/*', {
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 100,
            keyGenerator: (req) => `general:${req.userId || req.ip}`
        });
    }

    public async checkRateLimit(endpoint: string, request: any): Promise<{ allowed: boolean; remainingRequests: number; resetTime: number }> {
        try {
            const config = this.findRateLimitConfig(endpoint);
            if (!config) {
                return { allowed: true, remainingRequests: -1, resetTime: 0 };
            }

            const key = config.keyGenerator ? config.keyGenerator(request) : `${endpoint}:${request.ip}`;
            const cacheKey = `ratelimit:${key}`;
            
            const currentWindow = Math.floor(Date.now() / config.windowMs);
            const windowKey = `${cacheKey}:${currentWindow}`;

            const currentCount = parseInt(await this.cache.get(windowKey) || '0');
            
            if (currentCount >= config.maxRequests) {
                if (config.onLimitReached) {
                    config.onLimitReached(request);
                }
                
                const resetTime = (currentWindow + 1) * config.windowMs;
                return { 
                    allowed: false, 
                    remainingRequests: 0, 
                    resetTime 
                };
            }

            // Increment counter
            const newCount = currentCount + 1;
            await this.cache.set(windowKey, newCount.toString(), Math.ceil(config.windowMs / 1000));

            return {
                allowed: true,
                remainingRequests: config.maxRequests - newCount,
                resetTime: (currentWindow + 1) * config.windowMs
            };
        } catch (error) {
            console.error('Rate limit check failed:', error);
            return { allowed: true, remainingRequests: -1, resetTime: 0 };
        }
    }

    private findRateLimitConfig(endpoint: string): RateLimitConfig | null {
        // Find the most specific matching config
        const sortedConfigs = Array.from(this.rateLimitConfigs.entries())
            .sort(([a], [b]) => b.length - a.length);

        for (const [pattern, config] of sortedConfigs) {
            if (this.matchesPattern(endpoint, pattern)) {
                return config;
            }
        }

        return null;
    }

    private matchesPattern(endpoint: string, pattern: string): boolean {
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        
        return new RegExp(`^${regexPattern}$`).test(endpoint);
    }

    /**
     * API Quota Management
     */
    public async checkApiQuota(userId: string, planType: ApiQuota['planType']): Promise<{ allowed: boolean; quota: ApiQuota }> {
        try {
            const quotaKey = `quota:${userId}`;
            let quota = await this.getOrCreateQuota(userId, planType);

            // Check if we need to reset daily/monthly counters
            quota = await this.resetQuotaIfNeeded(quota);

            const dailyAllowed = quota.requestsToday < quota.dailyLimit;
            const monthlyAllowed = quota.requestsThisMonth < quota.monthlyLimit;

            if (dailyAllowed && monthlyAllowed) {
                quota.requestsToday++;
                quota.requestsThisMonth++;
                await this.cache.set(quotaKey, JSON.stringify(quota), 86400 * 32); // Cache for 32 days
            }

            return {
                allowed: dailyAllowed && monthlyAllowed,
                quota
            };
        } catch (error) {
            console.error('Quota check failed:', error);
            // Fail open for better user experience
            return {
                allowed: true,
                quota: await this.getOrCreateQuota(userId, planType)
            };
        }
    }

    private async getOrCreateQuota(userId: string, planType: ApiQuota['planType']): Promise<ApiQuota> {
        const quotaKey = `quota:${userId}`;
        const cached = await this.cache.get(quotaKey);

        if (cached) {
            return JSON.parse(cached) as ApiQuota;
        }

        // Create new quota based on plan type
        const limits = this.getPlanLimits(planType);
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const quota: ApiQuota = {
            userId,
            planType,
            dailyLimit: limits.daily,
            monthlyLimit: limits.monthly,
            requestsToday: 0,
            requestsThisMonth: 0,
            resetDaily: tomorrow.toISOString(),
            resetMonthly: nextMonth.toISOString()
        };

        await this.cache.set(quotaKey, JSON.stringify(quota), 86400 * 32);
        return quota;
    }

    private getPlanLimits(planType: ApiQuota['planType']): { daily: number; monthly: number } {
        const limits = {
            free: { daily: 100, monthly: 1000 },
            basic: { daily: 1000, monthly: 10000 },
            premium: { daily: 5000, monthly: 50000 },
            enterprise: { daily: 50000, monthly: 500000 }
        };

        return limits[planType];
    }

    private async resetQuotaIfNeeded(quota: ApiQuota): Promise<ApiQuota> {
        const now = new Date();
        let updated = false;

        // Reset daily if needed
        if (now > new Date(quota.resetDaily)) {
            quota.requestsToday = 0;
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            quota.resetDaily = tomorrow.toISOString();
            updated = true;
        }

        // Reset monthly if needed
        if (now > new Date(quota.resetMonthly)) {
            quota.requestsThisMonth = 0;
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            quota.resetMonthly = nextMonth.toISOString();
            updated = true;
        }

        if (updated) {
            await this.cache.set(`quota:${quota.userId}`, JSON.stringify(quota), 86400 * 32);
        }

        return quota;
    }

    /**
     * Request Analytics and Monitoring
     */
    public recordRequestMetrics(metrics: RequestMetrics): void {
        this.requestMetrics.push(metrics);

        // Keep only last 10000 requests in memory
        if (this.requestMetrics.length > 10000) {
            this.requestMetrics = this.requestMetrics.slice(-10000);
        }

        // Async store in cache for persistence
        this.storeMetricsAsync(metrics);
    }

    private async storeMetricsAsync(metrics: RequestMetrics): Promise<void> {
        try {
            const key = `metrics:${metrics.timestamp}:${Math.random().toString(36).substr(2, 9)}`;
            await this.cache.set(key, JSON.stringify(metrics), 86400 * 7); // Keep for 7 days
        } catch (error) {
            console.error('Failed to store metrics:', error);
        }
    }

    public async getApiAnalytics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
        try {
            const cacheKey = `analytics:api:${timeframe}`;
            
            return await this.cache.getOrSet(cacheKey, async () => {
                const now = Date.now();
                const timeframes = {
                    hour: 60 * 60 * 1000,
                    day: 24 * 60 * 60 * 1000,
                    week: 7 * 24 * 60 * 60 * 1000,
                    month: 30 * 24 * 60 * 60 * 1000
                };

                const cutoff = now - timeframes[timeframe];
                const recentMetrics = this.requestMetrics.filter(m => m.timestamp > cutoff);

                return this.analyzeMetrics(recentMetrics);
            }, 300); // Cache for 5 minutes
        } catch (error) {
            console.error('Failed to get API analytics:', error);
            return null;
        }
    }

    private analyzeMetrics(metrics: RequestMetrics[]): any {
        if (metrics.length === 0) {
            return {
                totalRequests: 0,
                averageResponseTime: 0,
                errorRate: 0,
                topEndpoints: [],
                statusCodes: {},
                requestsPerHour: []
            };
        }

        const totalRequests = metrics.length;
        const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
        const errorRequests = metrics.filter(m => m.statusCode >= 400).length;
        const errorRate = (errorRequests / totalRequests) * 100;

        // Group by endpoint
        const endpointCounts = metrics.reduce((acc, m) => {
            acc[m.endpoint] = (acc[m.endpoint] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topEndpoints = Object.entries(endpointCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count }));

        // Group by status code
        const statusCodes = metrics.reduce((acc, m) => {
            acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        // Requests per hour
        const requestsPerHour = this.groupByHour(metrics);

        return {
            totalRequests,
            averageResponseTime: Math.round(averageResponseTime),
            errorRate: Math.round(errorRate * 100) / 100,
            topEndpoints,
            statusCodes,
            requestsPerHour
        };
    }

    private groupByHour(metrics: RequestMetrics[]): any[] {
        const hourlyData = metrics.reduce((acc, m) => {
            const hour = new Date(m.timestamp).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        return Array.from({ length: 24 }, (_, hour) => ({
            hour,
            requests: hourlyData[hour] || 0
        }));
    }

    /**
     * Request Optimization
     */
    public shouldCompress(contentLength: number, contentType: string): boolean {
        if (!this.optimizationSettings.enableCompression) return false;
        
        const compressibleTypes = [
            'application/json',
            'text/html',
            'text/css',
            'text/javascript',
            'application/javascript'
        ];

        return contentLength > this.optimizationSettings.compressionThreshold &&
               compressibleTypes.some(type => contentType.includes(type));
    }

    public async getCachedResponse(key: string): Promise<any | null> {
        if (!this.optimizationSettings.enableCaching) return null;
        
        try {
            const cached = await this.cache.get(`response:${key}`);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to get cached response:', error);
            return null;
        }
    }

    public async setCachedResponse(key: string, response: any, ttl: number = 300): Promise<void> {
        if (!this.optimizationSettings.enableCaching) return;
        
        try {
            await this.cache.set(`response:${key}`, JSON.stringify(response), ttl);
        } catch (error) {
            console.error('Failed to cache response:', error);
        }
    }

    public canBatchRequest(requests: any[]): boolean {
        return this.optimizationSettings.enableBatching && 
               requests.length <= this.optimizationSettings.maxBatchSize;
    }

    /**
     * Security Features
     */
    public async detectAnomalousActivity(userId: string, endpoint: string): Promise<boolean> {
        try {
            const recentRequests = this.requestMetrics.filter(m => 
                m.userId === userId && 
                m.timestamp > Date.now() - 60000 // Last minute
            );

            // Check for rapid requests
            if (recentRequests.length > 50) {
                console.warn(`⚠️ Rapid requests detected for user ${userId}`);
                return true;
            }

            // Check for unusual endpoint patterns
            const uniqueEndpoints = new Set(recentRequests.map(m => m.endpoint)).size;
            if (uniqueEndpoints > 20) {
                console.warn(`⚠️ Unusual endpoint pattern detected for user ${userId}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to detect anomalous activity:', error);
            return false;
        }
    }

    public async blockSuspiciousIP(ip: string, reason: string, duration: number = 3600): Promise<void> {
        try {
            const blockKey = `blocked:ip:${ip}`;
            const blockData = {
                reason,
                blockedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + duration * 1000).toISOString()
            };

            await this.cache.set(blockKey, JSON.stringify(blockData), duration);
            console.warn(`🚫 IP ${ip} blocked: ${reason}`);
        } catch (error) {
            console.error('Failed to block IP:', error);
        }
    }

    public async isIPBlocked(ip: string): Promise<boolean> {
        try {
            const blockKey = `blocked:ip:${ip}`;
            const blocked = await this.cache.get(blockKey);
            return blocked !== null;
        } catch (error) {
            console.error('Failed to check IP block status:', error);
            return false;
        }
    }

    /**
     * Performance Monitoring
     */
    public getPerformanceInsights(): any {
        const metrics = this.requestMetrics.slice(-1000); // Last 1000 requests
        
        if (metrics.length === 0) return null;

        const responseTimes = metrics.map(m => m.responseTime);
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        
        const sortedTimes = responseTimes.sort((a, b) => a - b);
        const p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
        const p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

        const slowRequests = metrics.filter(m => m.responseTime > 1000).length;
        const slowRequestPercentage = (slowRequests / metrics.length) * 100;

        return {
            averageResponseTime: Math.round(avgResponseTime),
            p95ResponseTime: Math.round(p95ResponseTime),
            p99ResponseTime: Math.round(p99ResponseTime),
            slowRequestPercentage: Math.round(slowRequestPercentage * 100) / 100,
            totalRequests: metrics.length
        };
    }

    public updateOptimizationSettings(settings: Partial<RequestOptimization>): void {
        this.optimizationSettings = { ...this.optimizationSettings, ...settings };
        console.log('🔧 API optimization settings updated');
    }
}

export default AdvancedApiService;
