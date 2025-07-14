import { Elysia } from 'elysia';
import { notificationService } from "../../notification.services/notification.service";
import TokenService from "../../security.services/token.service";
import type { INotification } from "../../notification.services/notification.interface";
import type { ElysiaWS } from 'elysia/ws';
import { nanoid } from 'nanoid';

// Track active connections with username mapping
interface WebSocketConnection {
    ws: ElysiaWS;
    username: string;
}

// Track active connections in memory
const connectedUsers = new Map<string, WebSocketConnection>();

// WebSocket message types
interface WebSocketMessage {
    type: 'INITIAL_NOTIFICATIONS' | 'NEW_NOTIFICATION' | 'ERROR';
    data?: unknown;
    error?: string;
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
                const username: string = await tokenService.verifyAccessToken(jwtToken);
                
                // Generate a unique connection ID
                const connectionId: string = nanoid();
                
                // Store the connection with username
                connectedUsers.set(connectionId, {
                    ws,
                    username
                });
                
                console.log(`User ${username} connected to notifications (connection: ${connectionId})`);
                
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
            try {
                // Find and remove the connection by WebSocket instance
                for (const [connectionId, connection] of connectedUsers.entries()) {
                    if (connection.ws === ws) {
                        console.log(`User ${connection.username} disconnected (connection: ${connectionId})`);
                        connectedUsers.delete(connectionId);
                        break;
                    }
                }
            } catch (error) {
                console.error('Error during WebSocket close:', error);
            }
        }
    });

// Function to send a notification to a specific user
export async function sendNotificationToUser(username: string, notification: INotification): Promise<boolean> {
    try {
        let sent: boolean = false;
        
        // Find all connections for this user
        for (const [connectionId, connection] of connectedUsers.entries()) {
            if (connection.username === username) {
                try {
                    const message: WebSocketMessage = {
                        type: 'NEW_NOTIFICATION',
                        data: notification
                    };
                    
                    connection.ws.send(JSON.stringify(message));
                    sent = true;
                    console.log(`Notification sent to ${username} (${connectionId})`);
                } catch (error) {
                    console.error(`Failed to send to ${username} (${connectionId}):`, error);
                    // Remove the connection if it's no longer valid
                    connectedUsers.delete(connectionId);
                }
            }
        }
        
        return sent;
    } catch (error) {
        console.error(`Error sending notification to ${username}:`, error);
        return false;
    }
}

// Function to broadcast a notification to all connected users
export async function broadcastNotification(notification: INotification, usernames?: string[]): Promise<void> {
    // If no usernames provided, get all unique usernames from connected users
    const targetUsernames = usernames || Array.from(new Set(
        Array.from(connectedUsers.values()).map(conn => conn.username)
    ));
    
    await Promise.all(
        targetUsernames.map(username => 
            sendNotificationToUser(username, notification)
                .catch(error => console.error(`Error broadcasting to ${username}:`, error))
        )
    );
}


export default NotificationRoutes;
