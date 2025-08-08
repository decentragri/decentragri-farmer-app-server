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
                timestamp: new Date(record.timestamp.toString())
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
                timestamp: new Date(notification.timestamp.toString())
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
                timestamp: new Date(notification.timestamp.toString())
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
                timestamp: new Date(record.timestamp.toString())
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
}

export const notificationService = NotificationService.getInstance();
