import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Clock, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { reportService, Report } from '@/services/reportService';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';

export default function ReportsManagement() {
  const { adminProfile } = useAdminAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewAction, setReviewAction] = useState<'archived' | 'deleted' | 'no_action' | 'suspended_user' | 'banned_user'>('no_action');
  const [suspendDays, setSuspendDays] = useState(7);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  const loadReports = async () => {
    setLoading(true);
    try {
      console.log('[ReportsManagement] Loading reports with filter:', filterStatus);
      const data = await reportService.getAllReports({ status: filterStatus });
      console.log('[ReportsManagement] Loaded reports:', data.length, data);
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!adminProfile || !selectedReport || !reviewNote.trim()) {
      toast.error('Please provide a review note');
      return;
    }

    setActionLoading(true);
    try {
      // Review the report
      await reportService.reviewReport(
        selectedReport.id!,
        adminProfile.uid,
        reviewAction,
        reviewNote
      );

      // Carry out the chosen action
      if (reviewAction === 'archived' && selectedReport.itemId) {
        await reportService.archiveItem(selectedReport.itemId, reviewNote);
        toast.success('Item archived successfully');
      } else if (reviewAction === 'deleted' && selectedReport.itemId) {
        await adminService.deleteItem(selectedReport.itemId, adminProfile.uid, reviewNote);
        toast.success('Item deleted successfully');
      } else if (reviewAction === 'suspended_user' && selectedReport.reportedUserId) {
        await adminService.suspendUser(selectedReport.reportedUserId, adminProfile.uid, reviewNote, suspendDays);
        toast.success(`User suspended for ${suspendDays} day(s)`);
      } else if (reviewAction === 'banned_user' && selectedReport.reportedUserId) {
        await adminService.banUser(selectedReport.reportedUserId, adminProfile.uid, reviewNote);
        toast.success('User banned permanently');
      } else {
        toast.success('Report reviewed - no action taken');
      }

      const actionLabel =
        reviewAction === 'archived' ? 'Item archived' :
        reviewAction === 'deleted' ? 'Item deleted' :
        reviewAction === 'suspended_user' ? 'User suspended' :
        reviewAction === 'banned_user' ? 'User banned' :
        'No action needed';

      const reportSubject = selectedReport.itemTitle || selectedReport.reportedUserName || 'your report';

      // Notify everyone who reported this item; for user reports (no itemId)
      // fall back to the single reporter on this report.
      const reporters = selectedReport.itemId
        ? await reportService.getItemReporters(selectedReport.itemId)
        : [{ userId: selectedReport.reportedBy, userName: selectedReport.reporterName }];
      console.log('[ReportsManagement] Notifying reporters:', reporters);

      // Import notification service dynamically
      const { notificationService } = await import('@/services/notificationService');

      // Notify each reporter
      for (const reporter of reporters) {
        try {
          await notificationService.createNotification({
            userId: reporter.userId,
            type: 'report',
            title: 'Report Reviewed',
            message: `Your report about "${reportSubject}" has been reviewed. Action taken: ${actionLabel}`,
            actionUrl: `/browse`,
            metadata: {
              itemId: selectedReport.itemId,
              reportId: selectedReport.id,
            }
          });
        } catch (error) {
          console.error('[ReportsManagement] Failed to notify reporter:', reporter.userId, error);
        }
      }

      toast.success(`Notified ${reporters.length} reporter(s)`);

      // Log admin action
      await adminService.logAdminAction(
        adminProfile.uid,
        'review_report',
        selectedReport.id!,
        { action: reviewAction, itemId: selectedReport.itemId, note: reviewNote }
      );

      await loadReports();
      setShowReviewModal(false);
      setSelectedReport(null);
      setReviewNote('');
      setReviewAction('no_action');
    } catch (error) {
      console.error('Error reviewing report:', error);
      toast.error('Failed to review report');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async (report: Report) => {
    if (!adminProfile) return;

    const reason = prompt('Reason for dismissing this report:');
    if (!reason) return;

    try {
      await reportService.dismissReport(report.id!, adminProfile.uid, reason);
      
      await adminService.logAdminAction(
        adminProfile.uid,
        'dismiss_report',
        report.id!,
        { itemId: report.itemId, reason }
      );

      toast.success('Report dismissed');
      await loadReports();
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast.error('Failed to dismiss report');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'inappropriate': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'spam': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'fraud': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'duplicate': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <>
        <AdminSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7400]"></div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminSidebar />
      
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Reports Management
            </h1>
            <p className="text-white/60">
              {reports.length} report{reports.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <div className="flex gap-3">
              {['pending', 'reviewed', 'dismissed', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filterStatus === status
                      ? 'bg-[#ff7400] text-white'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Reports List */}
          {reports.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Reports</h2>
              <p className="text-white/60">All reports have been handled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(report.category)}`}>
                          {report.reason}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          report.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {report.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {report.itemId
                          ? `Reported Item: ${report.itemTitle}`
                          : `Reported User: ${report.reportedUserName || 'Unknown user'}`}
                      </h3>
                      <p className="text-white/70 text-sm mb-3">{report.description}</p>
                      {report.messageContent && (
                        <p className="text-white/50 text-sm italic mb-3">"{report.messageContent}"</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {report.reporterName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {report.createdAt?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      {report.reviewNote && (
                        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-white/60 text-sm">
                            <strong>Review Note:</strong> {report.reviewNote}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(report.itemId || report.reportedUserId) && (
                        <button
                          onClick={() =>
                            navigate(
                              report.itemId
                                ? `/admin/items/${report.itemId}`
                                : `/admin/users/${report.reportedUserId}`
                            )
                          }
                          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                          title={report.itemId ? 'View Item' : 'View User'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowReviewModal(true);
                            }}
                            className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                            title="Review Report"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDismiss(report)}
                            className="p-2 rounded-lg bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 transition-colors"
                            title="Dismiss Report"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Review Report</h3>
                <p className="text-sm text-white/60">
                  {selectedReport.itemTitle || selectedReport.reportedUserName}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/70 text-sm mb-2">Action</label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    reviewAction === 'no_action'
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <input
                      type="radio"
                      name="action"
                      value="no_action"
                      checked={reviewAction === 'no_action'}
                      onChange={(e) => setReviewAction(e.target.value as any)}
                    />
                    <span className="text-white text-sm">No Action - Report is invalid</span>
                  </label>
                  {selectedReport.itemId && (
                    <>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        reviewAction === 'archived'
                          ? 'bg-yellow-500/20 border-yellow-500'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <input
                          type="radio"
                          name="action"
                          value="archived"
                          checked={reviewAction === 'archived'}
                          onChange={(e) => setReviewAction(e.target.value as any)}
                        />
                        <span className="text-white text-sm">Archive Item - Hide from public</span>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        reviewAction === 'deleted'
                          ? 'bg-red-500/20 border-red-500'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <input
                          type="radio"
                          name="action"
                          value="deleted"
                          checked={reviewAction === 'deleted'}
                          onChange={(e) => setReviewAction(e.target.value as any)}
                        />
                        <span className="text-white text-sm">Delete Item - Permanently remove</span>
                      </label>
                    </>
                  )}
                  {selectedReport.reportedUserId && (
                    <>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        reviewAction === 'suspended_user'
                          ? 'bg-orange-500/20 border-orange-500'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <input
                          type="radio"
                          name="action"
                          value="suspended_user"
                          checked={reviewAction === 'suspended_user'}
                          onChange={(e) => setReviewAction(e.target.value as any)}
                        />
                        <span className="text-white text-sm flex-1">Suspend User</span>
                        {reviewAction === 'suspended_user' && (
                          <select
                            value={suspendDays}
                            onChange={(e) => setSuspendDays(Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
                          >
                            <option value={1} className="bg-[#2f1632]">1 day</option>
                            <option value={3} className="bg-[#2f1632]">3 days</option>
                            <option value={7} className="bg-[#2f1632]">7 days</option>
                            <option value={30} className="bg-[#2f1632]">30 days</option>
                          </select>
                        )}
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        reviewAction === 'banned_user'
                          ? 'bg-red-500/20 border-red-500'
                          : 'bg-white/5 border-white/10'
                      }`}>
                        <input
                          type="radio"
                          name="action"
                          value="banned_user"
                          checked={reviewAction === 'banned_user'}
                          onChange={(e) => setReviewAction(e.target.value as any)}
                        />
                        <span className="text-white text-sm">Ban User - Permanent</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Review Note</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50 resize-none"
                  placeholder="Explain your decision..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedReport(null);
                  setReviewNote('');
                  setReviewAction('no_action');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                disabled={actionLoading || !reviewNote.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
