// Advanced rate limiting and security middleware
import CacheService from "../utils/redis.service";
import { createHash } from "crypto";

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (ip: string, userId?: string) => string;
}

interface SecurityMetrics {
    suspiciousIPs: Set<string>;
    blockedRequests: number;
    anomalousPatterns: number;
}

export class AdvancedSecurityService {
    private static instance: AdvancedSecurityService;
    private cache: CacheService;
    private securityMetrics: SecurityMetrics;

    private constructor() {
        this.cache = CacheService.getInstance();
        this.securityMetrics = {
            suspiciousIPs: new Set(),
            blockedRequests: 0,
            anomalousPatterns: 0
        };
    }

    public static getInstance(): AdvancedSecurityService {
        if (!AdvancedSecurityService.instance) {
            AdvancedSecurityService.instance = new AdvancedSecurityService();
        }
        return AdvancedSecurityService.instance;
    }

    /**
     * Advanced rate limiting with adaptive thresholds
     */
    public async checkRateLimit(
        ip: string, 
        userId?: string, 
        endpoint?: string,
        config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
    ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
        const key = this.generateRateLimitKey(ip, userId, endpoint);
        const window = Math.floor(Date.now() / config.windowMs);
        const windowKey = `rate_limit:${key}:${window}`;

        try {
            const currentCount = await this.cache.increment(windowKey, config.windowMs / 1000);
            const remaining = Math.max(0, config.maxRequests - currentCount);
            const resetTime = (window + 1) * config.windowMs;

            const allowed = currentCount <= config.maxRequests;

            if (!allowed) {
                await this.handleRateLimitExceeded(ip, userId, endpoint);
            }

            return {
                allowed,
                remaining,
                resetTime
            };
        } catch (error) {
            console.error('Rate limit check failed:', error);
            // Fail open for availability
            return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs };
        }
    }

    private generateRateLimitKey(ip: string, userId?: string, endpoint?: string): string {
        const components = [ip];
        if (userId) components.push(`user:${userId}`);
        if (endpoint) components.push(`endpoint:${endpoint}`);
        return createHash('md5').update(components.join('|')).digest('hex');
    }

    private async handleRateLimitExceeded(ip: string, userId?: string, endpoint?: string): Promise<void> {
        this.securityMetrics.blockedRequests++;
        
        // Track suspicious IPs
        const suspiciousKey = `suspicious:${ip}`;
        const suspiciousCount = await this.cache.increment(suspiciousKey, 3600); // 1 hour window
        
        if (suspiciousCount > 10) {
            this.securityMetrics.suspiciousIPs.add(ip);
            await this.cache.set(`blocked:${ip}`, true, 3600); // Block for 1 hour
        }

        console.warn(`Rate limit exceeded: IP=${ip}, User=${userId}, Endpoint=${endpoint}`);
    }

    /**
     * Advanced request validation and anomaly detection
     */
    public async validateRequest(request: {
        ip: string;
        userAgent?: string;
        headers: Record<string, string>;
        body?: any;
        userId?: string;
    }): Promise<{ valid: boolean; risk: 'low' | 'medium' | 'high'; reasons: string[] }> {
        const reasons: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' = 'low';

        // Check if IP is blocked
        const isBlocked = await this.cache.exists(`blocked:${request.ip}`);
        if (isBlocked) {
            return { valid: false, risk: 'high', reasons: ['IP is temporarily blocked'] };
        }

        // Validate user agent
        if (!request.userAgent || this.isSuspiciousUserAgent(request.userAgent)) {
            reasons.push('Suspicious or missing User-Agent');
            riskLevel = 'medium';
        }

        // Check for suspicious headers
        if (this.hasSuspiciousHeaders(request.headers)) {
            reasons.push('Suspicious headers detected');
            riskLevel = 'medium';
        }

        // Analyze request patterns
        if (request.userId) {
            const pattern = await this.analyzeUserPattern(request.userId, request.ip);
            if (pattern.suspicious) {
                reasons.push('Unusual user behavior pattern');
                riskLevel = 'high';
            }
        }

        // Check request body for injection attempts
        if (request.body && this.hasSuspiciousPayload(request.body)) {
            reasons.push('Potentially malicious payload');
            riskLevel = 'high';
        }

        const valid = riskLevel !== 'high';
        
        if (!valid) {
            this.securityMetrics.anomalousPatterns++;
        }

        return { valid, risk: riskLevel, reasons };
    }

    private isSuspiciousUserAgent(userAgent: string): boolean {
        const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /curl/i,
            /wget/i,
            /python/i,
            /^$/
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }

    private hasSuspiciousHeaders(headers: Record<string, string>): boolean {
        // Check for common attack headers
        const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
        const hasMultipleForwarding = suspiciousHeaders.filter(h => headers[h]).length > 1;
        
        // Check for unusual content types
        const contentType = headers['content-type'];
        if (contentType && contentType.includes('script')) {
            return true;
        }

        return hasMultipleForwarding;
    }

    private async analyzeUserPattern(userId: string, ip: string): Promise<{ suspicious: boolean }> {
        // Track user IP patterns
        const userIpKey = `user_ips:${userId}`;
        const recentIPs = await this.cache.get<string[]>(userIpKey) || [];
        
        // Add current IP
        if (!recentIPs.includes(ip)) {
            recentIPs.push(ip);
            // Keep only last 5 IPs
            if (recentIPs.length > 5) {
                recentIPs.shift();
            }
            await this.cache.set(userIpKey, recentIPs, 86400); // 24 hours
        }

        // Suspicious if user has used more than 3 different IPs in short time
        return { suspicious: recentIPs.length > 3 };
    }

    private hasSuspiciousPayload(body: any): boolean {
        const payloadString = JSON.stringify(body).toLowerCase();
        
        const maliciousPatterns = [
            /<script/,
            /javascript:/,
            /on\w+\s*=/,
            /eval\(/,
            /function\s*\(/,
            /\$\(/,
            /document\./,
            /window\./,
            /alert\(/,
            /'.*or.*'.*='/,
            /union.*select/,
            /drop.*table/
        ];

        return maliciousPatterns.some(pattern => pattern.test(payloadString));
    }

    public getSecurityMetrics(): SecurityMetrics {
        return {
            ...this.securityMetrics,
            suspiciousIPs: new Set(this.securityMetrics.suspiciousIPs) // Return copy
        };
    }

    /**
     * Adaptive rate limiting based on user behavior
     */
    public async getAdaptiveRateLimit(userId: string): Promise<RateLimitConfig> {
        const userStats = await this.cache.get(`user_stats:${userId}`);
        
        if (userStats?.trusted) {
            // Trusted users get higher limits
            return { windowMs: 60000, maxRequests: 200 };
        } else if (userStats?.new) {
            // New users get lower limits
            return { windowMs: 60000, maxRequests: 50 };
        }
        
        // Default limits
        return { windowMs: 60000, maxRequests: 100 };
    }
}

export default AdvancedSecurityService;
