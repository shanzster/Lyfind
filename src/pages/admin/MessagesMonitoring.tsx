import { useState, useEffect } from 'react';
import { MessageSquare, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, User } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { reportService, Report } from '@/services/reportService';
import { messageService } from '@/services/messageService';
import { toast } from 'sonner';

export default function MessagesMonitoring() {
  const { adminProfile } = useAdminAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  const loadReports = async () => {
    setLoading(true);
    try {
      console.log('[MessagesMonitoring] Loading reports with filter:', filterStatus);
      const allReports = await reportService.getAllReports({ status: filterStatus });
      
      // Filter only message/conversation reports
      const messageReports = allReports.filter(report => 
        report.conversationId || report.messageId
      );
      
      console.log('[MessagesMonitoring] Found', messageReports.length, 'message reports');
      setReports(messageReports);
    } catch (error) {
      console.error('Error loading message reports:', error);
      toast.error('Failed to load message reports');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'no_action' | 'warning') => {
    if (!adminProfile || !selectedReport || !reviewNote.trim()) {
      toast.error('Please provide a review note');
      return;
    }

    setActionLoading(true);
    try {
      await reportService.reviewReport(
        selectedReport.id!,
        adminProfile.uid,
        action === 'warning' ? 'no_action' : 'no_action',
        reviewNote
      );

      toast.success(action === 'warning' ? 'Warning issued' : 'Report reviewed');
      
      await loadReports();
      setShowReviewModal(false);
      setSelectedReport(null);
      setReviewNote('');
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
      toast.success('Report dismissed');
      await loadReports();
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast.error('Failed to dismiss report');
    }
  };

  const handleViewDetails = async (report: Report) => {
    if (!report.conversationId) {
      toast.error('No conversation ID found');
      return;
    }

    setSelectedReport(report);
    setShowDetailsModal(true);
    setLoadingMessages(true);

    try {
      const messages = await messageService.getConversationMessages(report.conversationId);
      setConversationMessages(messages);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    } finally {
      setLoadingMessages(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'harassment': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'spam': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'fraud': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'inappropriate': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
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
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Messages Monitoring
            </h1>
            <p className="text-white/60">
              {reports.length} reported conversation{reports.length !== 1 ? 's' : ''}
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

          {reports.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <MessageSquare className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Flagged Messages</h2>
              <p className="text-white/60">All conversations are within guidelines</p>
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
                        Reported Conversation
                      </h3>
                      
                      {report.messageContent && (
                        <p className="text-white/60 text-sm mb-2">{report.messageContent}</p>
                      )}
                      
                      <p className="text-white/70 text-sm mb-3">{report.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Reported by: {report.reporterName}
                        </span>
                        {report.reportedUserName && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            Against: {report.reportedUserName}
                          </span>
                        )}
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
                      <button
                        onClick={() => handleViewDetails(report)}
                        className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

      {/* Details Modal */}
      {showDetailsModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Conversation Details</h3>
                  <p className="text-sm text-white/60">Full conversation history</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReport(null);
                  setConversationMessages([]);
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Report Info */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Reported By</p>
                  <p className="text-white font-medium">{selectedReport.reporterName}</p>
                </div>
                {selectedReport.reportedUserName && (
                  <div>
                    <p className="text-white/60 text-sm mb-1">Reported User</p>
                    <p className="text-white font-medium">{selectedReport.reportedUserName}</p>
                  </div>
                )}
                <div>
                  <p className="text-white/60 text-sm mb-1">Reason</p>
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(selectedReport.category)}`}>
                    {selectedReport.reason}
                  </span>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${
                    selectedReport.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    selectedReport.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {selectedReport.status.toUpperCase()}
                  </span>
                </div>
              </div>
              {selectedReport.description && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white/60 text-sm mb-1">Description</p>
                  <p className="text-white">{selectedReport.description}</p>
                </div>
              )}
            </div>

            {/* Conversation Messages */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-4">Conversation History</h4>
              
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
              ) : conversationMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-white/40 mx-auto mb-3" />
                  <p className="text-white/60">No messages found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 border border-white/10 rounded-xl p-4 bg-white/5">
                  {conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-xl ${
                        message.id === selectedReport.messageId
                          ? 'bg-red-500/10 border-2 border-red-500/30'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-white/60" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {message.senderName || 'Unknown User'}
                            </p>
                            <p className="text-white/40 text-xs">
                              {message.createdAt?.toDate().toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {message.id === selectedReport.messageId && (
                          <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">
                            Reported Message
                          </span>
                        )}
                      </div>
                      <p className="text-white/80 text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      {message.imageUrl && (
                        <div className="mt-3">
                          <img
                            src={message.imageUrl}
                            alt="Message attachment"
                            className="max-w-xs rounded-lg border border-white/10"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedReport(null);
                  setConversationMessages([]);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Close
              </button>
              {selectedReport.status === 'pending' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowReviewModal(true);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all"
                >
                  Review Report
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Review Message Report</h3>
                <p className="text-sm text-white/60">Take action on this report</p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/80 text-sm mb-2">
                <strong>Reported by:</strong> {selectedReport.reporterName}
              </p>
              {selectedReport.reportedUserName && (
                <p className="text-white/80 text-sm mb-2">
                  <strong>Against:</strong> {selectedReport.reportedUserName}
                </p>
              )}
              <p className="text-white/80 text-sm mb-2">
                <strong>Reason:</strong> {selectedReport.reason}
              </p>
              <p className="text-white/60 text-sm">
                {selectedReport.description}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Review Note</label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 resize-none"
                placeholder="Document your decision and any actions taken..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedReport(null);
                  setReviewNote('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview('no_action')}
                disabled={actionLoading || !reviewNote.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Mark Reviewed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
