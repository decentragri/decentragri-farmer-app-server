import { Elysia, t } from 'elysia';
import { notificationService } from "../notification.services/notification.service";
import TokenService from "../security.services/token.service";
import { NotificationType } from "../notification.services/notification.interface";

const NotificationRoutes = (app: Elysia) => 
    app.group('/api/notifications', (app) =>
        app
            .derive(async ({ headers }) => {
                const authorizationHeader = headers.authorization;
                
                if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                    throw new Error('Unauthorized: No token provided');
                }

                const jwtToken = authorizationHeader.substring(7);
                const tokenService = new TokenService();
                const username = await tokenService.verifyAccessToken(jwtToken);
                
                return { username };
            })
            
            // Get all notifications for a user (paginated)
            .get('/', async ({ username, query: { limit = '50', offset = '0' } }) => {
                try {
                    const notifications = await notificationService.getAllNotifications(
                        username, 
                        parseInt(limit), 
                        parseInt(offset)
                    );
                    
                    return {
                        success: true,
                        data: notifications,
                        total: notifications.length
                    };
                } catch (error) {
                    console.error('Failed to fetch notifications:', error);
                    throw new Error('Failed to fetch notifications');
                }
            }, {
                query: t.Object({
                    limit: t.Optional(t.String()),
                    offset: t.Optional(t.String())
                })
            })
            
            // Get unread notifications for a user
            .get('/unread', async ({ username }) => {
                try {
                    const notifications = await notificationService.getUnreadNotifications(username);
                    
                    return {
                        success: true,
                        data: notifications,
                        count: notifications.length
                    };
                } catch (error) {
                    console.error('Failed to fetch unread notifications:', error);
                    throw new Error('Failed to fetch unread notifications');
                }
            })
            
            // Get unread notification count
            .get('/unread/count', async ({ username }) => {
                try {
                    const count = await notificationService.getUnreadCount(username);
                    
                    return {
                        success: true,
                        count
                    };
                } catch (error) {
                    console.error('Failed to fetch unread count:', error);
                    throw new Error('Failed to fetch unread count');
                }
            })
            
            // Get latest notification for a user (for polling)
            .get('/latest', async ({ username }) => {
                try {
                    const notification = await notificationService.getLatestNotification(username);
                    
                    return {
                        success: true,
                        data: notification
                    };
                } catch (error) {
                    console.error('Failed to fetch latest notification:', error);
                    throw new Error('Failed to fetch latest notification');
                }
            })
            
            // Get specific notification by ID
            .get('/:id', async ({ params: { id } }) => {
                try {
                    const notification = await notificationService.getNotificationById(id);
                    
                    if (!notification) {
                        throw new Error('Notification not found');
                    }
                    
                    return {
                        success: true,
                        data: notification
                    };
                } catch (error) {
                    console.error('Failed to fetch notification:', error);
                    throw new Error('Failed to fetch notification');
                }
            }, {
                params: t.Object({
                    id: t.String()
                })
            })
            
            // Mark notification as read
            .patch('/:id/read', async ({ params: { id } }) => {
                try {
                    const success = await notificationService.markAsRead(id);
                    
                    if (!success) {
                        throw new Error('Failed to mark notification as read');
                    }
                    
                    return {
                        success: true,
                        message: 'Notification marked as read'
                    };
                } catch (error) {
                    console.error('Failed to mark notification as read:', error);
                    throw new Error('Failed to mark notification as read');
                }
            }, {
                params: t.Object({
                    id: t.String()
                })
            })
            
            // Create a new notification (for testing or admin purposes)
            .post('/', async ({ username, body }) => {
                try {
                    const notification = await notificationService.sendRealTimeNotification(username, body);
                    
                    return {
                        success: true,
                        data: notification,
                        message: 'Notification created successfully'
                    };
                } catch (error) {
                    console.error('Failed to create notification:', error);
                    throw new Error('Failed to create notification');
                }
            }, {
                body: t.Object({
                    type: t.Enum(NotificationType),
                    title: t.String(),
                    message: t.String(),
                    metadata: t.Optional(t.Object({}))
                })
            })
            
            .onError(({ error, set }) => {
                console.error('Notification route error:', error);
                set.status = 500;
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Internal server error'
                };
            })
    );

export default NotificationRoutes;
