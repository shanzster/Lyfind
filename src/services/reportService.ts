import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Report {
  id?: string;
  itemId?: string;
  itemTitle?: string;
  messageId?: string;
  messageContent?: string;
  conversationId?: string;
  reportedBy: string;
  reporterName: string;
  reporterEmail: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reason: string;
  category: 'inappropriate' | 'spam' | 'fraud' | 'duplicate' | 'harassment' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNote?: string;
  action?: 'archived' | 'deleted' | 'no_action' | 'suspended_user' | 'banned_user';
}

export const reportService = {
  // Create a new report
  async createReport(reportData: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      // Clean the data - remove undefined values
      const cleanData: any = {
        reportedBy: reportData.reportedBy,
        reporterName: reportData.reporterName,
        reporterEmail: reportData.reporterEmail,
        reason: reportData.reason,
        category: reportData.category,
        description: reportData.description,
        status: 'pending',
        createdAt: Timestamp.now()
      };

      // Only add optional fields if they exist
      if (reportData.itemId) cleanData.itemId = reportData.itemId;
      if (reportData.itemTitle) cleanData.itemTitle = reportData.itemTitle;
      if (reportData.messageId) cleanData.messageId = reportData.messageId;
      if (reportData.messageContent) cleanData.messageContent = reportData.messageContent;
      if (reportData.conversationId) cleanData.conversationId = reportData.conversationId;
      if (reportData.reportedUserId) cleanData.reportedUserId = reportData.reportedUserId;
      if (reportData.reportedUserName) cleanData.reportedUserName = reportData.reportedUserName;

      const docRef = await addDoc(collection(db, 'reports'), cleanData);
      
      console.log('[ReportService] Report created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[ReportService] Error creating report:', error);
      throw error;
    }
  },

  // Get all reports (admin)
  async getAllReports(filters?: {
    status?: string;
    limit?: number;
  }): Promise<Report[]> {
    try {
      console.log('[ReportService] Getting reports with filters:', filters);
      
      let q = query(
        collection(db, 'reports'),
        orderBy('createdAt', 'desc')
      );

      if (filters?.status && filters.status !== 'all') {
        console.log('[ReportService] Filtering by status:', filters.status);
        q = query(
          collection(db, 'reports'),
          where('status', '==', filters.status),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      console.log('[ReportService] Found', snapshot.docs.length, 'reports');
      
      const reports = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('[ReportService] Report:', doc.id, data);
        return {
          id: doc.id,
          ...data
        } as Report;
      });
      
      return reports;
    } catch (error) {
      console.error('[ReportService] Error getting reports:', error);
      return [];
    }
  },

  // Get reports for a specific item
  async getItemReports(itemId: string): Promise<Report[]> {
    try {
      const q = query(
        collection(db, 'reports'),
        where('itemId', '==', itemId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Report));
    } catch (error) {
      console.error('[ReportService] Error getting item reports:', error);
      return [];
    }
  },

  // Check if user already reported an item
  async hasUserReported(itemId: string, userId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'reports'),
        where('itemId', '==', itemId),
        where('reportedBy', '==', userId)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('[ReportService] Error checking user report:', error);
      return false;
    }
  },

  // Review a report (admin)
  async reviewReport(
    reportId: string,
    adminUid: string,
    action: 'archived' | 'deleted' | 'no_action' | 'suspended_user' | 'banned_user',
    reviewNote: string
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'reviewed',
        reviewedAt: Timestamp.now(),
        reviewedBy: adminUid,
        reviewNote,
        action
      });

      console.log('[ReportService] Report reviewed:', reportId);
    } catch (error) {
      console.error('[ReportService] Error reviewing report:', error);
      throw error;
    }
  },

  // Get all users who reported a specific item
  async getItemReporters(itemId: string): Promise<Array<{ userId: string; userName: string }>> {
    try {
      const q = query(
        collection(db, 'reports'),
        where('itemId', '==', itemId)
      );

      const snapshot = await getDocs(q);
      const reporters = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: data.reportedBy,
          userName: data.reporterName
        };
      });

      // Remove duplicates
      const uniqueReporters = Array.from(
        new Map(reporters.map(r => [r.userId, r])).values()
      );

      return uniqueReporters;
    } catch (error) {
      console.error('[ReportService] Error getting item reporters:', error);
      return [];
    }
  },

  // Dismiss a report (admin)
  async dismissReport(reportId: string, adminUid: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'dismissed',
        reviewedAt: Timestamp.now(),
        reviewedBy: adminUid,
        reviewNote: reason,
        action: 'no_action'
      });

      console.log('[ReportService] Report dismissed:', reportId);
    } catch (error) {
      console.error('[ReportService] Error dismissing report:', error);
      throw error;
    }
  },

  // Archive an item (admin action after reviewing report)
  async archiveItem(itemId: string, reason: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        status: 'archived',
        archivedAt: Timestamp.now(),
        archiveReason: reason,
        updatedAt: Timestamp.now()
      });

      console.log('[ReportService] Item archived:', itemId);
    } catch (error) {
      console.error('[ReportService] Error archiving item:', error);
      throw error;
    }
  },

  // Get report statistics
  async getReportStats(): Promise<{
    total: number;
    pending: number;
    reviewed: number;
    dismissed: number;
  }> {
    try {
      const snapshot = await getDocs(collection(db, 'reports'));
      const reports = snapshot.docs.map(doc => doc.data());

      return {
        total: reports.length,
        pending: reports.filter(r => r.status === 'pending').length,
        reviewed: reports.filter(r => r.status === 'reviewed').length,
        dismissed: reports.filter(r => r.status === 'dismissed').length
      };
    } catch (error) {
      console.error('[ReportService] Error getting report stats:', error);
      return { total: 0, pending: 0, reviewed: 0, dismissed: 0 };
    }
  }
};
