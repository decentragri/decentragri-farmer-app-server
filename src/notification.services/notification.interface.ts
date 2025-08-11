export enum NotificationType {
    SOIL_ANALYSIS_SAVED = 'SOIL_ANALYSIS_SAVED',
    PLANT_SCAN_COMPLETED = 'PLANT_SCAN_COMPLETED',
    NFT_MINTED = 'NFT_MINTED',
    FARM_UPDATE = 'FARM_UPDATE',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
    RECOMMENDATION = 'RECOMMENDATION',
    REWARD = 'REWARD',
    TOKEN_TRANSFER = 'TOKEN_TRANSFER'
}

export interface NotificationMetadata {
    farmName?: string;
    sensorId?: string;
    nftId?: string;
    [key: string]: any;
}


export interface INotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    timestamp: Date;
    timeAgo?: string; // Relative time format like "5m", "2h", "1d"
    metadata?: NotificationMetadata;
}

export interface INotificationService {
    createNotification(notification: Omit<INotification, 'id' | 'timestamp' | 'read'>): Promise<INotification>;
    getUnreadNotifications(userId: string): Promise<INotification[]>;
    getNotificationById(notificationId: string): Promise<INotification | null>;
    markAsRead(notificationId: string): Promise<boolean>;
    sendRealTimeNotification(userId: string, notification: Omit<INotification, 'id' | 'timestamp' | 'read' | 'userId'>): Promise<INotification>;
    getLatestNotification(userId: string): Promise<INotification | null>;
    getAllNotifications(userId: string, limit?: number, offset?: number): Promise<INotification[]>;
    getUnreadCount(userId: string): Promise<number>;
}
