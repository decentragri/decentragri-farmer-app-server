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
    .get('/', async ({ username, query }) => {
        try {
            const limit = parseInt(query.limit || '50', 10);
            const offset = parseInt(query.offset || '0', 10);

            if (isNaN(limit) || limit < 1 || limit > 100) {
                return {
                    success: false,
                    message: 'Limit must be between 1 and 100'
                };
            }

            if (isNaN(offset) || offset < 0) {
                return {
                    success: false,
                    message: 'Offset must be a non-negative integer'
                };
            }

            const notifications = await notificationService.getAllNotifications(username, limit, offset);

            return {
                success: true,
                data: notifications,
                meta: {
                    limit,
                    offset,
                    count: notifications.length
                }
            };
        } catch (error) {
            console.error('Error in /api/notifications route:', error);
            return {
                success: false,
                message: 'Failed to fetch notifications'
            };
        }
    })            // Get unread notifications for a user
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

            // 🔔 LEGACY BADGE ENDPOINT (marks all as read - incorrect UX)
            .get('/badge', async ({ username }) => {
                try {
                    const badgeData = await notificationService.getBadgeData(username);
                    
                    return {
                        success: true,
                        ...badgeData
                    };
                } catch (error) {
                    console.error('Failed to fetch badge data:', error);
                    throw new Error('Failed to fetch badge data');
                }
            })

            // 🔔 CORRECT BELL ICON BEHAVIOR (like YouTube/Facebook)
            .get('/badge-correct', async ({ username }) => {
                try {
                    const badgeData = await notificationService.getBadgeDataCorrect(username);
                    
                    return {
                        success: true,
                        showBadge: badgeData.showBadge,
                        count: badgeData.newSinceLastView, // Only NEW notifications count
                        totalUnread: badgeData.totalUnread, // Total unread for info
                        lastViewedAt: badgeData.lastViewedAt
                    };
                } catch (error) {
                    console.error('Failed to fetch correct badge data:', error);
                    throw new Error('Failed to fetch badge data');
                }
            })

            // 🔔 MARK PANEL AS VIEWED - Correct bell click behavior
            .patch('/panel-viewed', async ({ username }) => {
                try {
                    const success = await notificationService.markPanelAsViewed(username);
                    
                    return {
                        success,
                        message: 'Notification panel marked as viewed (badge hidden)',
                        note: 'Individual notifications remain unread until clicked'
                    };
                } catch (error) {
                    console.error('Failed to mark panel as viewed:', error);
                    throw new Error('Failed to mark panel as viewed');
                }
            })

            // 🔔 MARK ALL AS READ - When user clicks bell icon
            .patch('/mark-all-read', async ({ username }) => {
                try {
                    const markedCount = await notificationService.markAllAsRead(username);
                    
                    return {
                        success: true,
                        message: `Marked ${markedCount} notifications as read`,
                        markedCount
                    };
                } catch (error) {
                    console.error('Failed to mark all as read:', error);
                    throw new Error('Failed to mark all notifications as read');
                }
            })

            // 🔔 MARK MULTIPLE AS READ - For selective marking
            .patch('/mark-multiple-read', async ({ body }) => {
                try {
                    const { notificationIds } = body as { notificationIds: string[] };
                    
                    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
                        return {
                            success: false,
                            message: 'Invalid notification IDs provided'
                        };
                    }

                    const markedCount = await notificationService.markMultipleAsRead(notificationIds);
                    
                    return {
                        success: true,
                        message: `Marked ${markedCount} notifications as read`,
                        markedCount
                    };
                } catch (error) {
                    console.error('Failed to mark multiple as read:', error);
                    throw new Error('Failed to mark notifications as read');
                }
            }, {
                body: t.Object({
                    notificationIds: t.Array(t.String())
                })
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
                    const notificationData = body as {
                        type: NotificationType;
                        title: string;
                        message: string;
                        metadata?: any;
                    };
                    
                    const notification = await notificationService.sendRealTimeNotification(username, notificationData);
                    
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
