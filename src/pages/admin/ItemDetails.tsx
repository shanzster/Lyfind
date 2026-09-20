import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, MapPin, Calendar, Eye, MessageSquare, 
  Trash2, CheckCircle, XCircle, Clock, Image as ImageIcon
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  const [item, setItem] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      loadItemDetails();
    }
  }, [id]);

  const loadItemDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Get item
      const itemDoc = await getDoc(doc(db, 'items', id));
      if (!itemDoc.exists()) {
        toast.error('Item not found');
        navigate('/admin/items');
        return;
      }

      const itemData: any = { id: itemDoc.id, ...itemDoc.data() };
      setItem(itemData);

      // Get user info
      if (itemData.userId) {
        const userDoc = await getDoc(doc(db, 'users', itemData.userId));
        if (userDoc.exists()) {
          setUser({ uid: userDoc.id, ...userDoc.data() });
        }
      }
    } catch (error) {
      console.error('Error loading item:', error);
      toast.error('Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!adminProfile || !item || !deleteReason.trim()) {
      toast.error('Please provide a deletion reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.deleteItem(item.id, adminProfile.uid, deleteReason);
      toast.success('Item deleted successfully');
      navigate('/admin/items');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!adminProfile || !item) return;

    setActionLoading(true);
    try {
      await adminService.approvePost(item.id, adminProfile.uid, approvalNote);
      toast.success('Item approved successfully');
      await loadItemDetails();
      setShowApproveModal(false);
      setApprovalNote('');
    } catch (error) {
      console.error('Error approving item:', error);
      toast.error('Failed to approve item');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!adminProfile || !item || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.rejectPost(item.id, adminProfile.uid, rejectionReason);
      toast.success('Item rejected successfully');
      await loadItemDetails();
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting item:', error);
      toast.error('Failed to reject item');
    } finally {
      setActionLoading(false);
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

  if (!item) {
    return (
      <>
        <AdminSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
          <div className="max-w-7xl mx-auto">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <Package className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Item Not Found</h2>
              <button
                onClick={() => navigate('/admin/items')}
                className="mt-4 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8c00] text-white font-medium transition-all"
              >
                Back to Items
              </button>
            </div>
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
            <button
              onClick={() => navigate('/admin/items')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Items
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  Item Details
                </h1>
                <p className="text-white/60">Admin view with full controls</p>
              </div>
              <div className="flex gap-3">
                {item.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => setShowApproveModal(true)}
                      className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Photos */}
              {item.photos && item.photos.length > 0 && (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-5 h-5 text-white/60" />
                    <h3 className="text-lg font-semibold text-white">Photos</h3>
                  </div>
                  
                  {/* Main Image */}
                  <div className="mb-4">
                    <img
                      src={item.photos[selectedImage]}
                      alt={item.title}
                      className="w-full h-96 object-cover rounded-xl"
                    />
                  </div>

                  {/* Thumbnails */}
                  {item.photos.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {item.photos.map((photo: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === index
                              ? 'border-[#ff7400]'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`${item.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Item Information */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Item Information</h3>
                  <div className="flex gap-2">
                    <span className={`text-xs font-medium px-3 py-1 rounded-lg ${
                      item.type === 'lost' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                    }`}>
                      {item.type?.toUpperCase()}
                    </span>
                    <span className={`text-xs font-medium px-3 py-1 rounded-lg ${
                      item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      item.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                      item.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white/60 text-sm mb-1 block">Title</label>
                    <p className="text-white text-lg font-semibold">{item.title}</p>
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-1 block">Description</label>
                    <p className="text-white/80">{item.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Category</label>
                      <div className="flex items-center gap-2 text-white">
                        <Package className="w-4 h-4 text-white/60" />
                        <span>{item.category}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Posted</label>
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="w-4 h-4 text-white/60" />
                        <span>{item.createdAt?.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {item.location && (
                    <div>
                      <label className="text-white/60 text-sm mb-1 block">Location</label>
                      <div className="flex items-center gap-2 text-white">
                        <MapPin className="w-4 h-4 text-white/60" />
                        <span>{item.location.name || 'Location provided'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Information */}
              {item.approval && (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Approval Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Risk Level</span>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        item.approval.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                        item.approval.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {item.approval.riskLevel?.toUpperCase()}
                      </span>
                    </div>

                    {item.approval.reviewedBy && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Reviewed By</span>
                        <span className="text-white">{item.approval.reviewedBy}</span>
                      </div>
                    )}

                    {item.approval.reviewedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/60">Reviewed At</span>
                        <span className="text-white">
                          {item.approval.reviewedAt.toDate().toLocaleString()}
                        </span>
                      </div>
                    )}

                    {item.approval.approvalNote && (
                      <div>
                        <span className="text-white/60 text-sm block mb-1">Approval Note</span>
                        <p className="text-white/80 text-sm">{item.approval.approvalNote}</p>
                      </div>
                    )}

                    {item.approval.rejectionReason && (
                      <div>
                        <span className="text-white/60 text-sm block mb-1">Rejection Reason</span>
                        <p className="text-red-400 text-sm">{item.approval.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* User Information */}
              {user && (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Posted By</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-medium text-lg">
                          {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.displayName || 'Unknown'}</p>
                      <p className="text-xs text-white/60">{user.studentId || 'No ID'}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Email</span>
                      <span className="text-white">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Joined</span>
                      <span className="text-white">
                        {user.createdAt?.toDate().toLocaleDateString()}
                      </span>
                    </div>
                    {user.suspended && (
                      <div className="mt-3 p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                        <p className="text-yellow-400 text-xs font-medium">⚠️ User is suspended</p>
                      </div>
                    )}
                    {user.banned && (
                      <div className="mt-3 p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                        <p className="text-red-400 text-xs font-medium">🚫 User is banned</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/admin/users`)}
                    className="w-full mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                  >
                    View User Profile
                  </button>
                </div>
              )}

              {/* Statistics */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">Views</span>
                    </div>
                    <span className="text-white font-semibold">{item.viewCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Messages</span>
                    </div>
                    <span className="text-white font-semibold">{item.messageCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Last Updated</span>
                    </div>
                    <span className="text-white text-sm">
                      {item.updatedAt?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Metadata</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-white/60">Item ID:</span>
                    <p className="text-white/80 font-mono break-all">{item.id}</p>
                  </div>
                  <div>
                    <span className="text-white/60">User ID:</span>
                    <p className="text-white/80 font-mono break-all">{item.userId}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Created:</span>
                    <p className="text-white/80">{item.createdAt?.toDate().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete Item</h3>
                <p className="text-sm text-white/60">{item.title}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
              <p className="text-sm text-red-200">
                ⚠️ This action cannot be undone. The item will be permanently deleted.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Deletion Reason</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50 resize-none"
                placeholder="Explain why this item is being deleted..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading || !deleteReason.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Approve Item</h3>
                <p className="text-sm text-white/60">{item.title}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Approval Note (Optional)</label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50 resize-none"
                placeholder="Add any notes about this approval..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApprovalNote('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Reject Item</h3>
                <p className="text-sm text-white/60">{item.title}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50 resize-none"
                placeholder="Explain why this item is being rejected..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
