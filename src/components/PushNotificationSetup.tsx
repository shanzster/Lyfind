import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  requestNotificationPermission,
  saveFCMToken,
  onForegroundMessage,
} from '@/lib/firebase-messaging';
import { toast } from 'sonner';

export function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Request notification permission and setup FCM
    const setupNotifications = async () => {
      try {
        const token = await requestNotificationPermission();
        
        if (token) {
          // Save token to Firestore
          await saveFCMToken(user.uid, token);
          console.log('[PushNotificationSetup] FCM token saved for user:', user.uid);
        }
      } catch (error) {
        console.error('[PushNotificationSetup] Error setting up notifications:', error);
      }
    };

    setupNotifications();

    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[PushNotificationSetup] Foreground message:', payload);
      
      // Show toast notification
      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || '';
      
      toast(title, {
        description: body,
        action: payload.data?.actionUrl ? {
          label: 'View',
          onClick: () => {
            window.location.href = payload.data.actionUrl;
          }
        } : undefined,
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user]);

  return null; // This component doesn't render anything
}
