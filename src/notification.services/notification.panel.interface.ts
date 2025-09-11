export interface NotificationPanelView {
  id: string;
  userId: string;
  lastViewedAt: Date;
  createdAt: Date;
}

export interface INotificationService {
  // ... existing methods

  // NEW: Panel viewing methods (correct UX pattern)
  markPanelAsViewed(userId: string): Promise<boolean>;
  getUnreadCountSinceLastView(userId: string): Promise<number>;
  getBadgeDataWithPanelView(userId: string): Promise<{
    count: number;
    hasUnread: boolean;
    hasNewSinceLastView: boolean;
    lastViewedAt: string | null;
  }>;
}
