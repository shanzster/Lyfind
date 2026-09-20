import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const pushNotificationService = {
  // Check if push notifications are supported
  isSupported(): boolean {
    return 'Notification' in window;
  },

  // Check current permission status
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[PushNotification] Not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[PushNotification] Permission:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('[PushNotification] Permission request failed:', error);
      return false;
    }
  },

  // Save notification preference to user profile
  async savePreference(userId: string, enabled: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushNotificationsEnabled: enabled,
        lastNotificationUpdate: new Date(),
      });
      console.log('[PushNotification] Preference saved:', enabled);
    } catch (error) {
      console.error('[PushNotification] Failed to save preference:', error);
      throw error;
    }
  },

  // Enable push notifications for user
  async enablePushNotifications(userId: string): Promise<boolean> {
    try {
      // Request permission
      const granted = await this.requestPermission();
      if (!granted) {
        console.log('[PushNotification] Permission denied');
        return false;
      }

      // Save preference
      await this.savePreference(userId, true);
      
      return true;
    } catch (error) {
      console.error('[PushNotification] Enable failed:', error);
      return false;
    }
  },

  // Disable push notifications for user
  async disablePushNotifications(userId: string): Promise<void> {
    try {
      await this.savePreference(userId, false);
      console.log('[PushNotification] Disabled successfully');
    } catch (error) {
      console.error('[PushNotification] Disable failed:', error);
      throw error;
    }
  },

  // Test push notification
  async sendTestNotification(): Promise<void> {
    if (this.getPermissionStatus() !== 'granted') {
      console.log('[PushNotification] Permission not granted');
      return;
    }

    try {
      const notification = new Notification('Test Notification', {
        body: 'This is a test notification from LyFind',
        icon: '/Untitled design (3).png',
        badge: '/Untitled design (3).png',
        tag: 'test',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('[PushNotification] Test notification failed:', error);
    }
  },
};
