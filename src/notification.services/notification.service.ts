import { nanoid } from "nanoid";
import neo4j, { Driver, Session } from "neo4j-driver";
import { getDriver } from "../db/memgraph";
import { NotificationType } from "./notification.interface";
import type { INotification, INotificationService } from "./notification.interface";
import { NotificationQueries } from "./notification.cypher";

export class NotificationService implements INotificationService {
    private static instance: NotificationService;
    

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private convertTimestamp(timestamp: any): Date {
        if (!timestamp) return new Date();
        
        // Handle Neo4j DateTime object
        if (timestamp && typeof timestamp === 'object' && timestamp.year) {
            return new Date(
                Number(timestamp.year),
                Number(timestamp.month) - 1, // JavaScript months are 0-indexed
                Number(timestamp.day),
                Number(timestamp.hour),
                Number(timestamp.minute),
                Number(timestamp.second),
                Math.floor(Number(timestamp.nanosecond) / 1000000) // Convert nanoseconds to milliseconds
            );
        }
        
        // Handle string timestamps
        if (typeof timestamp === 'string') {
            return new Date(timestamp);
        }
        
        // Handle regular Date objects
        if (timestamp instanceof Date) {
            return timestamp;
        }
        
        return new Date(timestamp.toString());
    }

    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInSeconds = Math.floor(diffInMs / 1000);
        
        if (diffInSeconds < 60) {
            return `${diffInSeconds}s`;
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours}h`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays}d`;
        }
        
        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) {
            return `${diffInWeeks}w`;
        }
        
        const diffInMonths = Math.floor(diffInDays / 30);
        return `${diffInMonths}mo`;
    }

    private async executeQuery<T = any>(query: string, params: Record<string, any>, readOnly: boolean = true): Promise<T> {
        const session = getDriver().session();
        try {
            const result = await (readOnly 
                ? session.executeRead(tx => tx.run(query, params))
                : session.executeWrite(tx => tx.run(query, params)));
            
            const records = result.records.map(record => record.get(0)?.properties || record.get(0));
            return records as unknown as T;
        } catch (error) {
            console.error('Database operation failed:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    public async createNotification(notification: Omit<INotification, 'id' | 'timestamp' | 'read'>): Promise<INotification> {
        const newNotification: INotification = {
            ...notification,
            id: nanoid(),
            timestamp: new Date(),
            read: false
        };

        try {
            // First check if user exists
            const userCheck = await this.executeQuery(
                NotificationQueries.CHECK_USER_EXISTS,
                { userId: newNotification.userId }
            );
            
            if (!userCheck || userCheck.length === 0) {
                throw new Error(`User with username '${newNotification.userId}' not found in database`);
            }

            const result = await this.executeQuery(
                NotificationQueries.SAVE,
                {
                    userId: newNotification.userId,
                    id: newNotification.id,
                    type: newNotification.type,
                    title: newNotification.title,
                    message: newNotification.message,
                    read: newNotification.read,
                    timestamp: newNotification.timestamp.toISOString(),
                    metadata: newNotification.metadata || {}
                },
                false
            );
            
            return newNotification;
        } catch (error) {
            console.error('Failed to save notification:', error);
            throw new Error(`Failed to save notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async getUnreadNotifications(userId: string): Promise<INotification[]> {
        try {
            const result: INotification[] = await this.executeQuery<INotification[]>(NotificationQueries.GET_UNREAD, { userId });
            return result.map(record => ({
                ...record,
                timestamp: this.convertTimestamp(record.timestamp),
                timeAgo: this.formatRelativeTime(this.convertTimestamp(record.timestamp))
            }));
        } catch (error) {
            console.error('Failed to fetch unread notifications:', error);
            return [];
        }
    }

    public async markAsRead(notificationId: string): Promise<boolean> {
        try {
            const result = await this.executeQuery(NotificationQueries.MARK_AS_READ, { notificationId }, false);
            return result.length > 0;
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            return false;
        }
    }

    public async getNotificationById(notificationId: string): Promise<INotification | null> {
        try {
            const result: INotification[] = await this.executeQuery<INotification[]>(NotificationQueries.GET_BY_ID, { notificationId });
            if (result.length === 0) return null;
            
            const notification = result[0];
            return {
                ...notification,
                timestamp: this.convertTimestamp(notification.timestamp),
                timeAgo: this.formatRelativeTime(this.convertTimestamp(notification.timestamp))
            };
        } catch (error) {
            console.error('Failed to fetch notification:', error);
            return null;
        }
    }

    public async sendRealTimeNotification(
        userId: string, 
        notification: Omit<INotification, 'id' | 'timestamp' | 'read' | 'userId'>
    ): Promise<INotification> {
        try {
            const createdNotification = await this.createNotification({...notification, userId});

    
            return createdNotification;
        } catch (error) {
            console.error('Failed to create notification:', error);
            throw new Error('Failed to create notification');
        }
    }

    public async getLatestNotification(userId: string): Promise<INotification | null> {
        try {
            const result: INotification[] = await this.executeQuery<INotification[]>(NotificationQueries.GET_LATEST, { userId });
            if (result.length === 0) return null;
            
            const notification = result[0];
            return {
                ...notification,
                timestamp: this.convertTimestamp(notification.timestamp),
                timeAgo: this.formatRelativeTime(this.convertTimestamp(notification.timestamp))
            };
        } catch (error) {
            console.error('Failed to fetch latest notification:', error);
            return null;
        }
    }

    public async getAllNotifications(username: string, limit: number = 50, offset: number = 0): Promise<INotification[]> {
        try {
            // Ensure limit and offset are integers
            const limitInt = parseInt(limit.toString(), 10);
            const offsetInt = parseInt(offset.toString(), 10);
            
            // Validate the parsed integers
            if (isNaN(limitInt) || limitInt < 0) {
                throw new Error('Limit must be a valid positive integer');
            }
            if (isNaN(offsetInt) || offsetInt < 0) {
                throw new Error('Offset must be a valid non-negative integer');
            }
            
            const result: INotification[] = await this.executeQuery<INotification[]>(
                NotificationQueries.GET_ALL, 
                { 
                    userId: username, 
                    limit: neo4j.int(limitInt), 
                    offset: neo4j.int(offsetInt) 
                }
            );
            return result.map(record => ({
                ...record,
                timestamp: this.convertTimestamp(record.timestamp),
                timeAgo: this.formatRelativeTime(this.convertTimestamp(record.timestamp))
            }));
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            return [];
        }
    }

    public async getUnreadCount(userId: string): Promise<number> {
        try {
            const result = await this.executeQuery<{count: number}[]>(NotificationQueries.GET_UNREAD_COUNT, { userId });
            return result[0]?.count || 0;
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
            return 0;
        }
    }

    /**
     * Mark all notifications as read for a user - Perfect for bell icon click
     */
    public async markAllAsRead(userId: string): Promise<number> {
        try {
            const result = await this.executeQuery<{markedCount: number}[]>(NotificationQueries.MARK_ALL_AS_READ, { userId });
            return result[0]?.markedCount || 0;
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            return 0;
        }
    }

    /**
     * Mark multiple specific notifications as read
     */
    public async markMultipleAsRead(notificationIds: string[]): Promise<number> {
        try {
            const result = await this.executeQuery<{markedCount: number}[]>(NotificationQueries.MARK_MULTIPLE_AS_READ, { notificationIds });
            return result[0]?.markedCount || 0;
        } catch (error) {
            console.error('Failed to mark multiple notifications as read:', error);
            return 0;
        }
    }

    /**
     * Get badge data - optimized for frequent frontend calls (LEGACY - use getBadgeDataCorrect)
     */
    public async getBadgeData(userId: string): Promise<{ count: number; hasUnread: boolean; lastUpdated: string }> {
        try {
            const result = await this.executeQuery<{count: number}[]>(NotificationQueries.GET_UNREAD_COUNT, { userId });
            const count = result[0]?.count || 0;
            
            return {
                count,
                hasUnread: count > 0,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to fetch badge data:', error);
            return {
                count: 0,
                hasUnread: false,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Mark notification panel as viewed (bell click) - CORRECT UX PATTERN
     * This doesn't mark notifications as read, just hides the badge
     */
    public async markPanelAsViewed(userId: string): Promise<boolean> {
        try {
            const result = await this.executeQuery<{lastViewedAt: any}[]>(
                NotificationQueries.MARK_PANEL_AS_VIEWED, 
                { userId }
            );
            return result.length > 0;
        } catch (error) {
            console.error('Failed to mark panel as viewed:', error);
            return false;
        }
    }

    /**
     * Get count of unread notifications since last panel view
     */
    public async getUnreadCountSinceLastView(userId: string): Promise<number> {
        try {
            const result = await this.executeQuery<{count: number}[]>(
                NotificationQueries.GET_UNREAD_COUNT_SINCE_LAST_VIEW, 
                { userId }
            );
            return result[0]?.count || 0;
        } catch (error) {
            console.error('Failed to fetch unread count since last view:', error);
            return 0;
        }
    }

    /**
     * Get correct badge data (like YouTube/Facebook)
     * Badge shows only NEW notifications since last bell click
     */
    public async getBadgeDataCorrect(userId: string): Promise<{
        totalUnread: number;
        newSinceLastView: number;
        showBadge: boolean;
        lastViewedAt: string | null;
    }> {
        try {
            const result = await this.executeQuery<{
                totalCount: number;
                newCount: number;
                lastViewedAt: any;
            }[]>(NotificationQueries.GET_BADGE_DATA_WITH_PANEL_VIEW, { userId });
            
            const data = result[0] || { totalCount: 0, newCount: 0, lastViewedAt: null };
            
            return {
                totalUnread: data.totalCount || 0,
                newSinceLastView: data.newCount || 0,
                showBadge: (data.newCount || 0) > 0, // Only show badge for NEW notifications
                lastViewedAt: data.lastViewedAt ? this.convertTimestamp(data.lastViewedAt).toISOString() : null
            };
        } catch (error) {
            console.error('Failed to fetch correct badge data:', error);
            return {
                totalUnread: 0,
                newSinceLastView: 0,
                showBadge: false,
                lastViewedAt: null
            };
        }
    }
}

export const notificationService = NotificationService.getInstance();
