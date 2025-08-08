// Quick test script to debug notification creation
import { notificationService } from './src/notification.services/notification.service';
import { NotificationType } from './src/notification.services/notification.interface';

async function testNotification() {
    try {
        console.log('Testing notification creation...');
        
        // Test with a sample username (replace with actual username from your database)
        const testUsername = 'nashar4'; // Replace with actual username
        
        const notification = await notificationService.sendRealTimeNotification(testUsername, {
            type: NotificationType.RECOMMENDATION,
            title: 'Test Notification',
            message: 'This is a test notification to verify the system works',
            metadata: {
                test: true,
                farmName: 'test-farm'
            }
        });
        
        console.log('✅ Notification created successfully:', notification);
        
        // Try to fetch it back
        const latest = await notificationService.getLatestNotification(testUsername);
        console.log('✅ Latest notification fetched:', latest);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testNotification();
