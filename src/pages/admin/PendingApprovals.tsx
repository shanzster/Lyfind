import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Package, MapPin, User, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminService, PendingItem } from '@/services/adminService';
import { toast } from 'sonner';

export default function PendingApprovalsPage() {
  const { adminProfile } = useAdminAuth();
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    setLoading(true);
    try {
      const items = await adminService.getPendingApprovals();
      setPendingItems(items);
    } catch (error) {
      console.error('Error loading pending items:', error);
      toast.error('Failed to load pending items');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: PendingItem) => {
    if (!adminProfile) return;

    setActionLoading(true);
    try {
      await adminService.approvePost(item.id, adminProfile.uid);
      toast.success('Post approved successfully!');
      await loadPendingItems();
      setSelectedItem(null);
    } catch (error) {
      console.error('Error approving post:', error);
      toast.error('Failed to approve post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!adminProfile || !selectedItem || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.rejectPost(selectedItem.id, adminProfile.uid, rejectReason);
      toast.success('Post rejected successfully!');
      await loadPendingItems();
      setSelectedItem(null);
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting post:', error);
      toast.error('Failed to reject post');
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getWaitingTime = (createdAt: any) => {
    const now = Date.now();
    const created = createdAt.toMillis();
    const diff = now - created;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m ago`;
    return `${minutes}m ago`;
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
              Pending Approvals
            </h1>
            <p className="text-white/60">
              {pendingItems.length} post{pendingItems.length !== 1 ? 's' : ''} waiting for review
            </p>
          </div>

          {pendingItems.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
              <p className="text-white/60">No pending posts to review at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${
                        item.type === 'lost' ? 'bg-red-500/20' : 'bg-green-500/20'
                      } flex items-center justify-center`}>
                        <Package className={`w-5 h-5 ${
                          item.type === 'lost' ? 'text-red-400' : 'text-green-400'
                        }`} />
                      </div>
                      <div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                          item.type === 'lost' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                        }`}>
                          {item.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${getRiskColor(item.approval.riskLevel)}`}>
                      {item.approval.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  
                  {/* Description */}
                  <p className="text-sm text-white/70 mb-4 line-clamp-2">{item.description}</p>

                  {/* Photos */}
                  {item.photos && item.photos.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {item.photos.slice(0, 3).map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Photo ${idx + 1}`}
                          className="w-20 h-20 rounded-lg object-cover border border-white/10"
                        />
                      ))}
                      {item.photos.length > 3 && (
                        <div className="w-20 h-20 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <span className="text-white/60 text-sm">+{item.photos.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-white/60">
                      <User className="w-4 h-4" />
                      <span>{item.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span>{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <Clock className="w-4 h-4" />
                      <span>{getWaitingTime(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* User History */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
                    <p className="text-xs text-white/60 mb-2">User History</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-white/50">Account Age:</span>
                        <span className="text-white ml-1">{item.userHistory.accountAge}d</span>
                      </div>
                      <div>
                        <span className="text-white/50">Posts:</span>
                        <span className="text-white ml-1">{item.userHistory.previousPosts}</span>
                      </div>
                      <div>
                        <span className="text-white/50">Resolved:</span>
                        <span className="text-white ml-1">{item.userHistory.resolvedItems}</span>
                      </div>
                      <div>
                        <span className="text-white/50">Trust Score:</span>
                        <span className="text-white ml-1">{item.userHistory.trustScore}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/admin/items/${item.id}`)}
                      className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowRejectModal(true);
                      }}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Reject Post</h3>
                <p className="text-sm text-white/60">Provide a reason for rejection</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2 font-medium">
                Rejection Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50 transition-all resize-none"
                rows={4}
                placeholder="Explain why this post is being rejected..."
                disabled={actionLoading}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedItem(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Reject Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
