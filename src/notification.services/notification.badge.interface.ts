// Enhanced notification badge functionality for frontend integration

export interface NotificationBadgeResponse {
  success: boolean;
  count: number;
  hasUnread: boolean;
  lastUpdated: string;
}

export interface MarkAllAsReadResponse {
  success: boolean;
  message: string;
  markedCount: number;
}

export interface NotificationBadgeService {
  getBadgeData(userId: string): Promise<NotificationBadgeResponse>;
  markAllAsRead(userId: string): Promise<MarkAllAsReadResponse>;
  markMultipleAsRead(notificationIds: string[]): Promise<MarkAllAsReadResponse>;
}
