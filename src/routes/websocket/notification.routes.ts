import { Elysia } from 'elysia';
import { notificationService } from "../../notification.services/notification.service";
import TokenService from "../../security.services/token.service";
import type { INotification } from "../../notification.services/notification.interface";
import type { ElysiaWS } from 'elysia/ws';

// Track connected users and their WebSocket connections
const connectedUsers = new Map<string, ElysiaWS>();

// Type for Elysia WebSocket with our custom properties
interface CustomWebSocket {
    send: (data: string) => void;
    readyState: number;
    OPEN: number;
    username?: string;
    data: any;
}

interface WebSocketMessage {
    type: string;
    data?: any;
}

const NotificationRoutes = (app: Elysia) => 
    app.ws('/notifications', {
        async open(ws) {
            try {
                const authorizationHeader: string = ws.data.headers.authorization || '';

                if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                    ws.close(1008, 'Unauthorized: No token provided');
                    return;
                }

                const jwtToken: string = authorizationHeader.substring(7);
                const tokenService = new TokenService();
                const username = await tokenService.verifyAccessToken(jwtToken);
                
                // Store the username on the WebSocket object
                (ws as unknown as CustomWebSocket).username = username;
                
                // Store the WebSocket connection with the username as the key
                connectedUsers.set(username, ws);
                
                console.log(`User ${username} connected to notifications`);
                
                // Send any unread notifications to the user on connect
                const unreadNotifications: INotification[] = await notificationService.getUnreadNotifications(username);
                if (unreadNotifications.length > 0) {
                    ws.send(JSON.stringify({
                        type: 'INITIAL_NOTIFICATIONS',
                        data: unreadNotifications
                    } as WebSocketMessage));
                }
                
                // Subscribe to user-specific notifications
                ws.subscribe(username);
                
            } catch (error: any) {
                console.error('WebSocket connection error:', error);
                ws.close(1011, 'Authentication failed');
            }
        },
        
        close(ws) {
            // Clean up when a client disconnects
            const customWs = ws as unknown as CustomWebSocket;
            if (customWs.username) {
                connectedUsers.delete(customWs.username);
                console.log(`User ${customWs.username} disconnected from notifications`);
            }
        }
    });

// Function to send a notification to a specific user
export async function sendNotificationToUser(username: string, notification: INotification): Promise<boolean> {
    const ws = connectedUsers.get(username) as unknown as CustomWebSocket;
    if (ws && ws.readyState === ws.OPEN) {
        try {
            const message: WebSocketMessage = {
                type: 'NEW_NOTIFICATION',
                data: notification
            };
            
            ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`Failed to send notification to ${username}:`, error);
            connectedUsers.delete(username); // Remove disconnected client
            return false;
        }
    }
    return false;
}

// Function to broadcast a notification to all connected users
export async function broadcastNotification(notification: INotification, usernames?: string[]): Promise<void> {
    const targets = usernames || Array.from(connectedUsers.keys());
    
    await Promise.all(
        targets.map(username => 
            sendNotificationToUser(username, notification)
        )
    );
}

export default NotificationRoutes;
