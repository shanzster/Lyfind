import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pushNotificationService } from '@/services/pushNotificationService';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported(pushNotificationService.isSupported());
    setPermission(pushNotificationService.getPermissionStatus());

    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((result) => {
        setPermission(result.state as NotificationPermission);
        
        result.addEventListener('change', () => {
          setPermission(result.state as NotificationPermission);
        });
      });
    }
  }, []);

  useEffect(() => {
    setIsEnabled(permission === 'granted');
  }, [permission]);

  const enableNotifications = async () => {
    if (!user) {
      console.error('[usePushNotifications] No user logged in');
      return false;
    }

    setLoading(true);
    try {
      const success = await pushNotificationService.enablePushNotifications(user.uid);
      if (success) {
        setPermission('granted');
        setIsEnabled(true);
      }
      return success;
    } catch (error) {
      console.error('[usePushNotifications] Enable failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    if (!user) {
      console.error('[usePushNotifications] No user logged in');
      return;
    }

    setLoading(true);
    try {
      await pushNotificationService.disablePushNotifications(user.uid);
      setIsEnabled(false);
    } catch (error) {
      console.error('[usePushNotifications] Disable failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    await pushNotificationService.sendTestNotification();
  };

  return {
    isSupported,
    permission,
    isEnabled,
    loading,
    enableNotifications,
    disableNotifications,
    sendTestNotification,
  };
}
