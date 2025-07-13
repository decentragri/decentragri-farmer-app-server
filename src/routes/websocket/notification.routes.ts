import { Elysia } from 'elysia';
import { notificationService } from "../../notification.services/notification.service";
import TokenService from "../../security.services/token.service";
import type { INotification } from "../../notification.services/notification.interface";
import type { ElysiaWS } from 'elysia/ws';
import { nanoid } from 'nanoid';

// Track active connections in memory
const connectedUsers = new Map<string, ElysiaWS>();

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
                
                // Generate a unique connection ID
                const connectionId = generateConnectionId();
                
                // Store the connection in memory
                connectedUsers.set(connectionId, ws);
                
                // Store the username on the WebSocket for later use
                // Using a type assertion to extend the WebSocket type
                type CustomWS = ElysiaWS & { username?: string; connectionId?: string };
                const customWs = ws as unknown as CustomWS;
                customWs.username = username;
                customWs.connectionId = connectionId;
                
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
                type CustomWS = ElysiaWS & { username?: string; connectionId?: string };
                const customWs = ws as unknown as CustomWS;
                const connectionId = customWs.connectionId;
                const username = customWs.username;
                
                if (connectionId) {
                    // Remove from active connections
                    connectedUsers.delete(connectionId);
                    
                    if (username) {
                        console.log(`User ${username} disconnected from notifications (connection: ${connectionId})`);
                    } else {
                        console.log(`Connection ${connectionId} closed`);
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
        let sent = false;
        
        // Find all connections for this user
        for (const [connectionId, ws] of connectedUsers.entries()) {
            type CustomWS = ElysiaWS & { username?: string };
            const customWs = ws as unknown as CustomWS;
            const wsUsername = customWs.username;
            if (wsUsername === username) {
                try {
                    const message: WebSocketMessage = {
                        type: 'NEW_NOTIFICATION',
                        data: notification
                    };
                    
                    ws.send(JSON.stringify(message));
                    sent = true;
                    console.log(`Notification sent to ${username} (${connectionId})`);
                } catch (error) {
                    console.error(`Failed to send to ${username} (${connectionId}):`, error);
                    // Remove the connection if it's no longer valid
                    connectedUsers.delete(connectionId);
                }
            }
        }
        
        if (!sent) {
            console.log(`No active connections found for user: ${username}`);
        }
        
        return sent;
    } catch (error) {
        console.error(`Error sending notification to ${username}:`, error);
        return false;
    }
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

function generateConnectionId(): string {
    return nanoid();
}

export default NotificationRoutes;
