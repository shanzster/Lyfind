import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { notificationService } from './notificationService';

export type AdminRole = 'super_admin';
export type AdminLevel = 'super';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  adminLevel: AdminLevel;
  permissions: string[];
  createdAt: Timestamp;
  lastLogin: Timestamp;
  twoFactorEnabled: boolean;
  assignedBy: string;
  active: boolean;
}

export interface ItemApproval {
  itemId: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'active' | 'resolved';
  submittedAt: Timestamp;
  submittedBy: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  approvalNote?: string;
  rejectionReason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  autoApproved: boolean;
}

export interface PendingItem {
  id: string;
  title: string;
  description: string;
  type: 'lost' | 'found';
  category: string;
  location: any;
  photos: string[];
  userId: string;
  userName: string;
  userEmail: string;
  approval: ItemApproval;
  createdAt: Timestamp;
  userHistory: {
    accountAge: number;
    previousPosts: number;
    resolvedItems: number;
    reportsAgainst: number;
    trustScore: number;
  };
}

const PERMISSIONS = {
  super_admin: [
    'users.view', 'users.edit', 'users.delete', 'users.suspend', 'users.ban',
    'items.view', 'items.edit', 'items.delete', 'items.feature',
    'items.approve', 'items.reject', 'items.request_info',
    'reports.view', 'reports.handle', 'reports.delete',
    'messages.view', 'messages.delete',
    'ai.configure', 'ai.monitor',
    'analytics.view', 'analytics.export',
    'settings.view', 'settings.edit',
    'admins.create', 'admins.edit', 'admins.delete',
    'logs.view', 'logs.export',
    'system.backup', 'system.restore', 'system.shutdown',
    'teachers.verify', 'teachers.approve', 'teachers.reject'
  ]
};

export const adminService = {
  // Check if user is admin
  async isAdmin(uid: string): Promise<boolean> {
    try {
      const adminDoc = await getDoc(doc(db, 'admins', uid));
      if (!adminDoc.exists()) return false;
      
      const adminData = adminDoc.data() as AdminUser;
      return adminData.active === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  // Get admin profile
  async getAdminProfile(uid: string): Promise<AdminUser | null> {
    try {
      const adminDoc = await getDoc(doc(db, 'admins', uid));
      if (!adminDoc.exists()) return null;
      
      return { uid, ...adminDoc.data() } as AdminUser;
    } catch (error) {
      console.error('Error getting admin profile:', error);
      return null;
    }
  },

  // Update last login
  async updateLastLogin(uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'admins', uid), {
        lastLogin: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  },

  // Check permission
  hasPermission(admin: AdminUser, permission: string): boolean {
    return admin.permissions.includes(permission);
  },

  // Get pending approvals
  async getPendingApprovals(): Promise<PendingItem[]> {
    try {
      const q = query(
        collection(db, 'items'),
        where('status', '==', 'pending_approval'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const items: PendingItem[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Get user info
        const userDoc = await getDoc(doc(db, 'users', data.userId));
        const userData = userDoc.data();

        // Calculate user history
        const userItemsQuery = query(
          collection(db, 'items'),
          where('userId', '==', data.userId)
        );
        const userItemsSnap = await getDocs(userItemsQuery);
        const previousPosts = userItemsSnap.size;
        const resolvedItems = userItemsSnap.docs.filter(d => d.data().status === 'resolved').length;

        const accountAge = userData?.createdAt 
          ? Math.floor((Date.now() - userData.createdAt.toMillis()) / (1000 * 60 * 60 * 24))
          : 0;

        items.push({
          id: docSnap.id,
          ...data,
          userName: userData?.displayName || 'Unknown',
          userEmail: userData?.email || '',
          userHistory: {
            accountAge,
            previousPosts,
            resolvedItems,
            reportsAgainst: 0, // TODO: Implement reports
            trustScore: this.calculateTrustScore(accountAge, previousPosts, resolvedItems, 0)
          }
        } as PendingItem);
      }

      return items;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      return [];
    }
  },

  // Calculate trust score
  calculateTrustScore(
    accountAge: number,
    previousPosts: number,
    resolvedItems: number,
    reportsAgainst: number
  ): number {
    let score = 50; // Base score

    // Account age (max +20)
    score += Math.min(accountAge / 30 * 20, 20);

    // Previous posts (max +15)
    score += Math.min(previousPosts * 3, 15);

    // Resolved items (max +15)
    score += Math.min(resolvedItems * 5, 15);

    // Reports against (max -30)
    score -= reportsAgainst * 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  },

  // Approve post
  async approvePost(itemId: string, adminUid: string, note?: string): Promise<void> {
    try {
      // Get item details first for notification
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      const itemData = itemDoc.data();

      await updateDoc(doc(db, 'items', itemId), {
        status: 'active',
        'approval.reviewedAt': Timestamp.now(),
        'approval.reviewedBy': adminUid,
        'approval.approvalNote': note || '',
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Log admin action
      await this.logAdminAction(adminUid, 'approve_post', itemId, { note });

      // Send notification to user
      if (itemData) {
        try {
          await notificationService.notifyItemApproved(
            itemData.userId,
            itemData.title,
            itemId
          );
        } catch (error) {
          console.error('[AdminService] Failed to send approval notification:', error);
        }

        // Run auto-matching in the background now that the item is live
        import('./autoMatchService')
          .then(({ autoMatchNewItem }) =>
            autoMatchNewItem(itemId, { id: itemId, ...itemData } as any)
          )
          .catch(error => {
            console.error('[AdminService] Auto-match after approval failed:', error);
          });

        // Notify saved-search watchers now that the item is visible
        import('./watchService')
          .then(({ watchService }) =>
            watchService.notifyWatchersForNewItem({ id: itemId, ...itemData } as any)
          )
          .catch(error => {
            console.error('[AdminService] Watch alerts after approval failed:', error);
          });
      }
    } catch (error) {
      console.error('Error approving post:', error);
      throw error;
    }
  },

  // Reject post
  async rejectPost(itemId: string, adminUid: string, reason: string): Promise<void> {
    try {
      // Get item details first for notification
      const itemDoc = await getDoc(doc(db, 'items', itemId));
      const itemData = itemDoc.data();

      await updateDoc(doc(db, 'items', itemId), {
        status: 'rejected',
        'approval.reviewedAt': Timestamp.now(),
        'approval.reviewedBy': adminUid,
        'approval.rejectionReason': reason,
        updatedAt: Timestamp.now()
      });

      // Log admin action
      await this.logAdminAction(adminUid, 'reject_post', itemId, { reason });

      // Send notification to user
      if (itemData) {
        try {
          await notificationService.notifyItemRejected(
            itemData.userId,
            itemData.title,
            itemId,
            reason
          );
        } catch (error) {
          console.error('[AdminService] Failed to send rejection notification:', error);
        }
      }
    } catch (error) {
      console.error('Error rejecting post:', error);
      throw error;
    }
  },

  // Request more info
  async requestMoreInfo(itemId: string, adminUid: string, questions: string[]): Promise<void> {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        'approval.requestedInfo': questions,
        'approval.reviewedBy': adminUid,
        updatedAt: Timestamp.now()
      });

      // Log admin action
      await this.logAdminAction(adminUid, 'request_info', itemId, { questions });
    } catch (error) {
      console.error('Error requesting more info:', error);
      throw error;
    }
  },

  // Get all users
  async getAllUsers(filters?: any): Promise<any[]> {
    try {
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  },

  // Get all items
  async getAllItems(filters?: any): Promise<any[]> {
    try {
      let q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));

      if (filters?.status) {
        q = query(collection(db, 'items'), where('status', '==', filters.status), orderBy('createdAt', 'desc'));
      }

      if (filters?.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting items:', error);
      return [];
    }
  },

  // Suspend user
  async suspendUser(userId: string, adminUid: string, reason: string, duration: number): Promise<void> {
    try {
      const suspendUntil = duration > 0 
        ? Timestamp.fromMillis(Date.now() + duration * 24 * 60 * 60 * 1000)
        : null;

      await updateDoc(doc(db, 'users', userId), {
        suspended: true,
        suspendedUntil: suspendUntil,
        suspensionReason: reason,
        suspendedBy: adminUid,
        suspendedAt: Timestamp.now()
      });

      // Log admin action
      await this.logAdminAction(adminUid, 'suspend_user', userId, { reason, duration });
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  },

  // Ban user
  async banUser(userId: string, adminUid: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        banned: true,
        banReason: reason,
        bannedBy: adminUid,
        bannedAt: Timestamp.now()
      });

      // Log admin action
      await this.logAdminAction(adminUid, 'ban_user', userId, { reason });
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  },

  // Calls the notification server (Firebase Admin SDK) with the signed-in admin's
  // ID token; the server re-verifies the caller against admins/{uid}.
  async callAdminApi(path: string, body: Record<string, unknown>): Promise<any> {
    const baseUrl = import.meta.env.VITE_NOTIFICATION_SERVER_URL || 'http://localhost:3001';
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Not signed in');
    }

    const idToken = await currentUser.getIdToken();
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.error || `Request failed (${response.status})`);
    }
    return result;
  },

  // Set a user's password (server-side, requires the notification server)
  async setUserPassword(userId: string, newPassword: string): Promise<{ email: string }> {
    return this.callAdminApi('/api/admin/set-user-password', { userId, newPassword });
  },

  // Permanently delete a user account: Auth record, users/{uid} doc, and their items
  async deleteUserAccount(userId: string, reason?: string): Promise<{ email: string | null; itemsRemoved: number }> {
    return this.callAdminApi('/api/admin/delete-user', { userId, reason });
  },

  // Delete item
  async deleteItem(itemId: string, adminUid: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status: 'deleted',
        deletedBy: adminUid,
        deletedAt: Timestamp.now(),
        deletionReason: reason
      });

      // Log admin action
      await this.logAdminAction(adminUid, 'delete_item', itemId, { reason });
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  // Get dashboard stats
  async getDashboardStats(): Promise<any> {
    try {
      const [usersSnap, itemsSnap, pendingSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'items')),
        getDocs(query(collection(db, 'items'), where('status', '==', 'pending_approval')))
      ]);

      const items = itemsSnap.docs.map(d => d.data());
      const activeItems = items.filter(i => i.status === 'active');
      const resolvedItems = items.filter(i => i.status === 'resolved');

      return {
        totalUsers: usersSnap.size,
        totalItems: itemsSnap.size,
        activeItems: activeItems.length,
        resolvedItems: resolvedItems.length,
        pendingApprovals: pendingSnap.size,
        lostItems: activeItems.filter(i => i.type === 'lost').length,
        foundItems: activeItems.filter(i => i.type === 'found').length,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalUsers: 0,
        totalItems: 0,
        activeItems: 0,
        resolvedItems: 0,
        pendingApprovals: 0,
        lostItems: 0,
        foundItems: 0,
      };
    }
  },

  // Log admin action
  async logAdminAction(
    adminUid: string,
    action: string,
    targetId: string,
    metadata?: any
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'adminLogs'), {
        adminUid,
        action,
        targetId,
        metadata: metadata || {},
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  },

  // Get admin logs
  async getAdminLogs(filters?: any): Promise<any[]> {
    try {
      let q = query(
        collection(db, 'adminLogs'),
        orderBy('timestamp', 'desc'),
        limit(filters?.limit || 50)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting admin logs:', error);
      return [];
    }
  },

  // Create user account (admin only)
  async createUserAccount(
    adminUid: string,
    userData: {
      email: string;
      displayName: string;
      studentId?: string;
      department?: string;
      yearLevel?: string;
      phoneNumber?: string;
      role?: 'user' | 'admin';
    },
    adminRole?: AdminRole
  ): Promise<{ success: boolean; password?: string; error?: string }> {
    try {
      // Validate email is @lsb.edu.ph
      if (!userData.email.toLowerCase().endsWith('@lsb.edu.ph')) {
        return {
          success: false,
          error: 'Only @lsb.edu.ph email addresses are allowed'
        };
      }

      // Check if user already exists
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', userData.email.toLowerCase())
      );
      const existingUsers = await getDocs(usersQuery);
      
      if (!existingUsers.empty) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Check if admin already exists (if creating admin)
      if (userData.role === 'admin') {
        const adminsQuery = query(
          collection(db, 'admins'),
          where('email', '==', userData.email.toLowerCase())
        );
        const existingAdmins = await getDocs(adminsQuery);
        
        if (!existingAdmins.empty) {
          return {
            success: false,
            error: 'Admin with this email already exists'
          };
        }
      }

      // Generate random password (8 characters: letters + numbers)
      const password = this.generatePassword();

      if (userData.role === 'admin' && adminRole) {
        // Create admin account
        const adminRef = await addDoc(collection(db, 'pendingAdmins'), {
          email: userData.email.toLowerCase(),
          displayName: userData.displayName,
          role: 'super_admin',
          adminLevel: 'super',
          permissions: PERMISSIONS['super_admin'],
          temporaryPassword: password,
          createdBy: adminUid,
          createdAt: Timestamp.now(),
          status: 'pending_activation',
          emailSent: false,
          twoFactorEnabled: false,
          active: false
        });

        // Log admin action
        await this.logAdminAction(adminUid, 'create_admin', adminRef.id, { 
          email: userData.email,
          role: 'super_admin'
        });
      } else {
        // Create regular user account
        const userRef = await addDoc(collection(db, 'pendingUsers'), {
          email: userData.email.toLowerCase(),
          displayName: userData.displayName,
          studentId: userData.studentId || '',
          department: userData.department || '',
          yearLevel: userData.yearLevel || '',
          phoneNumber: userData.phoneNumber || '',
          temporaryPassword: password,
          createdBy: adminUid,
          createdAt: Timestamp.now(),
          status: 'pending_activation',
          emailSent: false
        });

        // Log admin action
        await this.logAdminAction(adminUid, 'create_user', userRef.id, userData);
      }

      return {
        success: true,
        password
      };
    } catch (error) {
      console.error('Error creating user account:', error);
      return {
        success: false,
        error: 'Failed to create user account'
      };
    }
  },

  // Generate random password
  generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
};
