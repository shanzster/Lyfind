import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type NotificationType = 'message' | 'match' | 'approval' | 'report' | 'claim' | 'system';

// Helper to show browser notification
function showBrowserNotification(title: string, message: string, actionUrl?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/Untitled design (3).png',
        badge: '/Untitled design (3).png',
        tag: Date.now().toString(),
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        if (actionUrl) {
          window.location.href = actionUrl;
        }
        notification.close();
      };
    } catch (error) {
      console.error('[BrowserNotification] Error showing notification:', error);
    }
  }
}

export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    itemId?: string;
    conversationId?: string;
    matchId?: string;
    senderId?: string;
    senderName?: string;
    reportId?: string;
    // Match card data (type: 'match') — side-by-side comparison in the UI
    myItemTitle?: string;
    myItemImage?: string;
    matchedItemId?: string;
    matchedItemTitle?: string;
    matchedItemImage?: string;
    confidence?: number;
  };
  createdAt: Timestamp;
}

const NOTIFICATIONS_COLLECTION = 'notifications';

// Backend notification server configuration
const NOTIFICATION_SERVER_URL = import.meta.env.VITE_NOTIFICATION_SERVER_URL || 'http://localhost:3001';
const API_SECRET = import.meta.env.VITE_NOTIFICATION_API_SECRET || '';

// Helper function to send push via backend
async function sendPushViaBackend(userId: string, notification: {
  title: string;
  message: string;
  actionUrl?: string;
  type?: string;
  notificationId?: string;
}) {
  try {
    console.log('[NotificationService] Sending push notification to backend...');
    console.log('[NotificationService] Server URL:', NOTIFICATION_SERVER_URL);
    console.log('[NotificationService] User ID:', userId);
    console.log('[NotificationService] Notification:', notification);
    
    const response = await fetch(`${NOTIFICATION_SERVER_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': API_SECRET,
      },
      body: JSON.stringify({
        userId,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        type: notification.type,
        notificationId: notification.notificationId,
      }),
    });

    console.log('[NotificationService] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NotificationService] Backend error response:', errorText);
      throw new Error(`Backend returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('[NotificationService] Push notification sent via backend:', result);
    return result;
  } catch (error) {
    console.error('[NotificationService] Failed to send push via backend:', error);
    // Don't throw - notification is still saved in Firestore
    return { success: false, error };
  }
}

export const notificationService = {
  // Create a new notification
  async createNotification(
    notificationData: Omit<Notification, 'id' | 'createdAt' | 'read'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        ...notificationData,
        read: false,
        createdAt: Timestamp.now(),
      });

      console.log('[NotificationService] Notification created:', docRef.id);
      
      // DON'T show browser notification here - it will be shown by the recipient's listener
      // showBrowserNotification() is called in the real-time subscription
      
      // Send push notification via backend server (for mobile/PWA)
      await sendPushViaBackend(notificationData.userId, {
        title: notificationData.title,
        message: notificationData.message,
        actionUrl: notificationData.actionUrl,
        type: notificationData.type,
        notificationId: docRef.id,
      });
      
      return docRef.id;
    } catch (error) {
      console.error('[NotificationService] Error creating notification:', error);
      throw error;
    }
  },

  // Get user's notifications
  async getUserNotifications(
    userId: string,
    limitCount: number = 50
  ): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Notification));
    } catch (error) {
      console.error('[NotificationService] Error getting notifications:', error);
      return [];
    }
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('[NotificationService] Error getting unread count:', error);
      return 0;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(docRef, {
        read: true,
      });

      console.log('[NotificationService] Notification marked as read:', notificationId);
    } catch (error) {
      console.error('[NotificationService] Error marking as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('[NotificationService] No unread notifications to mark');
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
      console.log('[NotificationService] All notifications marked as read');
    } catch (error) {
      console.error('[NotificationService] Error marking all as read:', error);
      throw error;
    }
  },

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
      console.log('[NotificationService] Notification deleted:', notificationId);
    } catch (error) {
      console.error('[NotificationService] Error deleting notification:', error);
      throw error;
    }
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 50
  ): () => void {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    let isFirstLoad = true;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Notification));

        // Show browser notification for NEW notifications (not on first load)
        if (!isFirstLoad) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const notification = {
                id: change.doc.id,
                ...change.doc.data(),
              } as Notification;
              
              // Show browser notification for new unread notifications
              if (!notification.read) {
                showBrowserNotification(
                  notification.title,
                  notification.message,
                  notification.actionUrl
                );
              }
            }
          });
        }
        
        isFirstLoad = false;
        callback(notifications);
      },
      (error) => {
        console.error('[NotificationService] Snapshot error:', error);
      }
    );

    return unsubscribe;
  },

  // Subscribe to unread count
  subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
  ): () => void {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.size);
      },
      (error) => {
        console.error('[NotificationService] Unread count error:', error);
      }
    );

    return unsubscribe;
  },

  // Helper: Create message notification
  async notifyNewMessage(
    recipientId: string,
    senderName: string,
    senderId: string,
    conversationId: string
  ): Promise<void> {
    await this.createNotification({
      userId: recipientId,
      type: 'message',
      title: 'New Message',
      message: `${senderName} sent you a message`,
      actionUrl: `/messages?conversation=${conversationId}`,
      metadata: {
        conversationId,
        senderId,
        senderName,
      },
    });
  },

  // Helper: Create match notification
  async notifyMatch(
    userId: string,
    matchCount: number,
    itemId?: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'match',
      title: 'Match Found!',
      message: `We found ${matchCount} potential ${matchCount === 1 ? 'match' : 'matches'} for your photo`,
      actionUrl: '/photo-match',
      metadata: {
        itemId,
      },
    });
  },

  // Helper: Create approval notification
  async notifyItemApproved(
    userId: string,
    itemTitle: string,
    itemId: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'approval',
      title: 'Item Approved',
      message: `Your item "${itemTitle}" has been approved and is now visible`,
      actionUrl: `/item/${itemId}`,
      metadata: {
        itemId,
      },
    });
  },

  // Helper: Create rejection notification
  async notifyItemRejected(
    userId: string,
    itemTitle: string,
    itemId: string,
    reason?: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'approval',
      title: 'Item Not Approved',
      message: reason || `Your item "${itemTitle}" was not approved`,
      actionUrl: '/my-items',
      metadata: {
        itemId,
      },
    });
  },

  // Helper: Create report notification (for admins)
  async notifyAdminsOfReport(
    adminIds: string[],
    reporterName: string,
    reportType: string,
    reportId: string,
    itemId?: string
  ): Promise<void> {
    const promises = adminIds.map(adminId =>
      this.createNotification({
        userId: adminId,
        type: 'report',
        title: 'New Report',
        message: `${reporterName} reported ${reportType}`,
        actionUrl: '/admin/reports',
        metadata: {
          reportId,
          itemId,
        },
      })
    );

    await Promise.all(promises);
  },

  // Helper: Teacher verification approved
  async notifyTeacherApproved(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'system',
      title: 'Teacher Account Verified',
      message: 'Your teacher ID has been approved. Your account now has faculty privileges.',
      actionUrl: '/profile',
    });
  },

  // Helper: Teacher verification rejected
  async notifyTeacherRejected(userId: string, reason: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'system',
      title: 'Teacher Verification Rejected',
      message: `Your teacher ID verification was rejected: ${reason}. Your account has been banned. Contact an administrator to appeal.`,
      actionUrl: '/profile',
    });
  },

  // Helper: Auto-match found for an item
  async notifyAutoMatch(
    userId: string,
    itemTitle: string,
    matchCount: number,
    matchCard?: {
      myItemTitle: string;
      myItemImage?: string;
      matchedItemId: string;
      matchedItemTitle: string;
      matchedItemImage?: string;
      confidence: number;
    }
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'match',
      title: 'Possible Match Found!',
      message: `We found ${matchCount} possible ${matchCount === 1 ? 'match' : 'matches'} for "${itemTitle}". Check My Items to review.`,
      actionUrl: matchCard ? `/item/${matchCard.matchedItemId}` : '/my-items',
      ...(matchCard ? { metadata: matchCard } : {}),
    });
  },

  // Helper: Item claimed notification
  async notifyItemClaimed(
    userId: string,
    itemTitle: string,
    itemId: string,
    meetupLocation?: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'claim',
      title: 'Item Claimed',
      message: meetupLocation
        ? `"${itemTitle}" has been marked as claimed. Meetup location: ${meetupLocation}`
        : `"${itemTitle}" has been marked as claimed.`,
      actionUrl: `/item/${itemId}`,
      metadata: {
        itemId,
      },
    });
  },

  // Helper: Create system notification
  async notifySystem(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'system',
      title,
      message,
      actionUrl,
    });
  },
};
