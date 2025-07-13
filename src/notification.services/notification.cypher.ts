export const NotificationQueries = {
    /**
     * Saves a new notification and links it to a user
     * Parameters: { userId, id, type, title, message, read, timestamp, metadata }
     */
    SAVE: `
        MATCH (u:User {id: $userId})
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
        MATCH (u:User {id: $userId})-[:RECEIVED]->(n:Notification)
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
        MATCH (u:User {id: $userId})-[:RECEIVED]->(n:Notification)
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
        MATCH (u:User {id: $userId})-[:RECEIVED]->(n:Notification)
        WHERE n.read = false
        RETURN count(n) as count
    `
} as const;
