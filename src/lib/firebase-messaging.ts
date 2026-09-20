import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import app from './firebase';

let messaging: Messaging | null = null;

// Initialize Firebase Cloud Messaging
export const initializeMessaging = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    messaging = getMessaging(app);
    console.log('[FCM] Firebase Messaging initialized');
    return messaging;
  } catch (error) {
    console.error('[FCM] Error initializing messaging:', error);
    return null;
  }
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('[FCM] Notification permission:', permission);

    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return null;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        console.log('[FCM] Service Worker registered:', registration);

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('[FCM] Service Worker ready');
      } catch (error) {
        console.error('[FCM] Service Worker registration failed:', error);
        return null;
      }
    }

    // Initialize messaging if not already done
    if (!messaging) {
      messaging = initializeMessaging();
    }

    if (!messaging) {
      console.error('[FCM] Messaging not initialized');
      return null;
    }

    // Get FCM token
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    
    if (!vapidKey) {
      console.error('[FCM] VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: vapidKey
    });

    if (token) {
      console.log('[FCM] Token obtained:', token);
      return token;
    } else {
      console.warn('[FCM] No registration token available');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error getting notification permission:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    messaging = initializeMessaging();
  }

  if (!messaging) {
    console.error('[FCM] Messaging not initialized');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    callback(payload);
  });
};

// Save FCM token to Firestore (in users collection)
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    const { doc, setDoc, arrayUnion, Timestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    // Save to users collection (used by notification server)
    await setDoc(
      doc(db, 'users', userId),
      {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: Timestamp.now()
      },
      { merge: true }
    );

    console.log('[FCM] Token saved to Firestore users collection');
  } catch (error) {
    console.error('[FCM] Error saving token:', error);
  }
};

// Remove FCM token from Firestore
export const removeFCMToken = async (userId: string, token: string) => {
  try {
    const { doc, updateDoc, arrayRemove } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token)
    });

    console.log('[FCM] Token removed from Firestore');
  } catch (error) {
    console.error('[FCM] Error removing token:', error);
  }
};
