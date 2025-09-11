export const NotificationQueries = {
    /**
     * Saves a new notification and links it to a user
     * Parameters: { userId, id, type, title, message, read, timestamp, metadata }
     */
    SAVE: `
        MATCH (u:User {username: $userId})
        CREATE (n:Notification {
            id: $id,
            type: $type,
            title: $title,
            message: $message,
            read: $read,
            timestamp: datetime($timestamp),
            metadata: $metadata
        })
        CREATE (u)-[:RECEIVED]->(n)
        RETURN n
    `,

    /**
     * Gets all unread notifications for a user
     * Parameters: { userId }
     */
    GET_UNREAD: `
        MATCH (u:User {username: $userId})-[:RECEIVED]->(n:Notification)
        WHERE n.read = false
        RETURN n
        ORDER BY n.timestamp DESC
    `,

    /**
     * Marks a notification as read
     * Parameters: { notificationId }
     */
    MARK_AS_READ: `
        MATCH (n:Notification {id: $notificationId})
        SET n.read = true
        RETURN n
    `,

    /**
     * Gets a notification by ID
     * Parameters: { notificationId }
     */
    GET_BY_ID: `
        MATCH (n:Notification {id: $notificationId})
        RETURN n
    `,

    /**
     * Gets all notifications for a user (paginated)
     * Parameters: { userId, limit, offset }
     */
    GET_ALL: `
        MATCH (u:User {username: $userId})-[:RECEIVED]->(n:Notification)
        RETURN n
        ORDER BY n.timestamp DESC
        SKIP $offset
        LIMIT $limit
    `,

    /**
     * Gets the count of unread notifications for a user
     * Parameters: { userId }
     */
    GET_UNREAD_COUNT: `
        MATCH (u:User {username: $userId})-[:RECEIVED]->(n:Notification)
        WHERE n.read = false
        RETURN count(n) as count
    `,

    /**
     * Mark all notifications as read for a user
     * Parameters: { userId }
     */
    MARK_ALL_AS_READ: `
        MATCH (u:User {username: $userId})-[:RECEIVED]->(n:Notification)
        WHERE n.read = false
        SET n.read = true
        RETURN count(n) as markedCount
    `,

    /**
     * Mark multiple notifications as read
     * Parameters: { notificationIds }
     */
    MARK_MULTIPLE_AS_READ: `
        MATCH (n:Notification)
        WHERE n.id IN $notificationIds
        SET n.read = true
        RETURN count(n) as markedCount
    `,

    /**
     * Mark notification panel as viewed (bell click) - doesn't mark notifications as read
     * Parameters: { userId }
     */
    MARK_PANEL_AS_VIEWED: `
        MERGE (u:User {username: $userId})
        MERGE (u)-[:HAS_PANEL_VIEW]->(pv:NotificationPanelView)
        SET pv.lastViewedAt = datetime(),
            pv.updatedAt = datetime()
        RETURN pv.lastViewedAt as lastViewedAt
    `,

    /**
     * Get unread notifications that arrived AFTER last panel view
     * Parameters: { userId }
     */
    GET_UNREAD_COUNT_SINCE_LAST_VIEW: `
        MATCH (u:User {username: $userId})
        OPTIONAL MATCH (u)-[:HAS_PANEL_VIEW]->(pv:NotificationPanelView)
        MATCH (u)-[:RECEIVED]->(n:Notification)
        WHERE n.read = false 
        AND (pv IS NULL OR n.timestamp > pv.lastViewedAt)
        RETURN count(n) as count
    `,

    /**
     * Get badge data with panel view consideration
     * Parameters: { userId }
     */
    GET_BADGE_DATA_WITH_PANEL_VIEW: `
        MATCH (u:User {username: $userId})
        OPTIONAL MATCH (u)-[:HAS_PANEL_VIEW]->(pv:NotificationPanelView)
        OPTIONAL MATCH (u)-[:RECEIVED]->(n:Notification)
        WHERE n.read = false
        WITH u, pv, count(n) as totalUnread,
             count(CASE WHEN pv IS NULL OR n.timestamp > pv.lastViewedAt THEN 1 END) as newSinceView
        RETURN totalUnread as totalCount,
               newSinceView as newCount,
               pv.lastViewedAt as lastViewedAt
    `,

    /**
     * Gets the latest notification for a user
     * Parameters: { userId }
     */
    GET_LATEST: `
        MATCH (u:User {username: $userId})-[:RECEIVED]->(n:Notification)
        RETURN n
        ORDER BY n.timestamp DESC
        LIMIT 1
    `,

    /**
     * Check if a user exists
     * Parameters: { userId }
     */
    CHECK_USER_EXISTS: `
        MATCH (u:User {username: $userId})
        RETURN u.username as username
    `
} as const;
