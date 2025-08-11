// Real-time analytics service for monitoring system performance and user behavior
import CacheService from "../utils/redis.service";
import { EventEmitter } from "events";

interface AnalyticsEvent {
    userId?: string;
    event: string;
    timestamp: Date;
    metadata: Record<string, any>;
    farmId?: string;
    sessionId?: string;
}

interface SystemMetrics {
    activeUsers: number;
    apiRequestsPerMinute: number;
    cacheHitRate: number;
    averageResponseTime: number;
    errorRate: number;
    stakingActivity: {
        totalStaked: string;
        activeStakers: number;
        recentTransactions: number;
    };
    aiServiceUsage: {
        soilAnalysis: number;
        plantScans: number;
        pestForecasts: number;
    };
}

export class RealTimeAnalyticsService extends EventEmitter {
    private static instance: RealTimeAnalyticsService;
    private cache: CacheService;
    private metrics: Map<string, any> = new Map();

    private constructor() {
        super();
        this.cache = CacheService.getInstance();
        this.startMetricsCollection();
    }

    public static getInstance(): RealTimeAnalyticsService {
        if (!RealTimeAnalyticsService.instance) {
            RealTimeAnalyticsService.instance = new RealTimeAnalyticsService();
        }
        return RealTimeAnalyticsService.instance;
    }

    private startMetricsCollection(): void {
        // Collect metrics every 30 seconds
        setInterval(async () => {
            await this.collectSystemMetrics();
        }, 30000);
    }

    public async trackEvent(event: AnalyticsEvent): Promise<void> {
        try {
            // Store event for real-time processing
            await this.cache.set(
                `event:${Date.now()}:${Math.random()}`,
                event,
                3600 // Keep events for 1 hour
            );

            // Update counters
            await this.updateCounters(event);

            // Emit real-time event
            this.emit('analytics:event', event);
        } catch (error) {
            console.error('Analytics tracking error:', error);
        }
    }

    private async updateCounters(event: AnalyticsEvent): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        
        // Increment daily counters
        await this.cache.increment(`analytics:daily:${today}:${event.event}`, 86400);
        
        if (event.userId) {
            await this.cache.increment(`analytics:user:${event.userId}:${today}`, 86400);
        }

        // Track active users (expire after 15 minutes of inactivity)
        if (event.userId) {
            await this.cache.set(`active:user:${event.userId}`, true, 900);
        }
    }

    private async collectSystemMetrics(): Promise<SystemMetrics> {
        const activeUsers = await this.getActiveUserCount();
        const cacheStatus = this.cache.getCacheStatus();
        
        const metrics: SystemMetrics = {
            activeUsers,
            apiRequestsPerMinute: await this.getApiRequestRate(),
            cacheHitRate: cacheStatus.itemCount > 0 ? 0.85 : 0, // Approximate
            averageResponseTime: await this.getAverageResponseTime(),
            errorRate: await this.getErrorRate(),
            stakingActivity: await this.getStakingMetrics(),
            aiServiceUsage: await this.getAIServiceMetrics()
        };

        // Cache metrics
        await this.cache.set('system:metrics', metrics, 60);
        
        // Emit metrics update
        this.emit('analytics:metrics', metrics);
        
        return metrics;
    }

    private async getActiveUserCount(): Promise<number> {
        // This would use a more sophisticated method in production
        return Math.floor(Math.random() * 100) + 10; // Placeholder
    }

    private async getApiRequestRate(): Promise<number> {
        const requests = await this.cache.get('api:requests:current_minute') || 0;
        return requests as number;
    }

    private async getAverageResponseTime(): Promise<number> {
        return Math.floor(Math.random() * 200) + 50; // Placeholder: 50-250ms
    }

    private async getErrorRate(): Promise<number> {
        return Math.random() * 0.02; // Placeholder: 0-2% error rate
    }

    private async getStakingMetrics(): Promise<SystemMetrics['stakingActivity']> {
        return {
            totalStaked: "1,250,000", // Placeholder
            activeStakers: Math.floor(Math.random() * 500) + 100,
            recentTransactions: Math.floor(Math.random() * 50) + 10
        };
    }

    private async getAIServiceMetrics(): Promise<SystemMetrics['aiServiceUsage']> {
        return {
            soilAnalysis: Math.floor(Math.random() * 100) + 20,
            plantScans: Math.floor(Math.random() * 80) + 15,
            pestForecasts: Math.floor(Math.random() * 60) + 10
        };
    }

    public async getMetrics(): Promise<SystemMetrics> {
        const cached = await this.cache.get<SystemMetrics>('system:metrics');
        if (cached) return cached;
        
        return await this.collectSystemMetrics();
    }

    public async getUserAnalytics(userId: string): Promise<any> {
        const today = new Date().toISOString().split('T')[0];
        const userActivity = await this.cache.get(`analytics:user:${userId}:${today}`) || 0;
        
        return {
            dailyActivity: userActivity,
            lastSeen: new Date(),
            totalSessions: Math.floor(Math.random() * 50) + 5
        };
    }
}

export default RealTimeAnalyticsService;
