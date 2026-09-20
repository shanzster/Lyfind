import { useState, useEffect } from 'react';
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  Building2,
  X,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  teacherVerificationService,
  TeacherVerificationRequest,
} from '@/services/teacherVerificationService';
import { toast } from 'sonner';

export default function TeacherVerificationsPage() {
  const { adminProfile } = useAdminAuth();
  const [requests, setRequests] = useState<TeacherVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<TeacherVerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const pending = await teacherVerificationService.getPendingRequests();
      setRequests(pending);
    } catch (error) {
      console.error('Error loading teacher verifications:', error);
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: TeacherVerificationRequest) => {
    if (!adminProfile) return;

    setActionLoading(true);
    try {
      await teacherVerificationService.approveRequest(request.uid, adminProfile.uid);
      toast.success(`${request.displayName || request.email} is now a verified teacher`);
      await loadRequests();
    } catch (error) {
      console.error('Error approving verification:', error);
      toast.error('Failed to approve verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!adminProfile || !rejectingRequest) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await teacherVerificationService.rejectRequest(
        rejectingRequest.uid,
        adminProfile.uid,
        rejectReason.trim()
      );
      toast.success('Verification rejected and account banned');
      setRejectingRequest(null);
      setRejectReason('');
      await loadRequests();
    } catch (error) {
      console.error('Error rejecting verification:', error);
      toast.error('Failed to reject verification');
    } finally {
      setActionLoading(false);
    }
  };

  const waitingTime = (request: TeacherVerificationRequest) => {
    if (!request.submittedAt?.toDate) return '';
    const ms = Date.now() - request.submittedAt.toDate().getTime();
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return `${Math.max(1, Math.floor(ms / (1000 * 60)))}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#2f1632]">
      <AdminSidebar />

      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-5xl mx-auto pt-16 lg:pt-0">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="w-8 h-8 text-[#ff7400]" />
              <h1 className="text-3xl font-bold text-white">Teacher Verifications</h1>
            </div>
            <p className="text-white/60">
              Review faculty ID submissions. Approved users get the faculty role.
            </p>
          </div>

          {/* Policy banner */}
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">
              <strong>Policy:</strong> Rejecting a request permanently bans the user's account.
              Rejection is treated as a violation (fake/forged/misused ID). Users see this warning
              before submitting — only reject when you are certain the ID is not legitimate.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7400]"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-white/5 border border-white/10">
              <GraduationCap className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No pending requests</h3>
              <p className="text-white/60">All teacher verification requests have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div
                  key={request.uid}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="flex flex-col md:flex-row gap-5">
                    {/* ID photo */}
                    <button
                      onClick={() => setViewingPhoto(request.idPhotoURL)}
                      className="w-full md:w-48 h-32 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 hover:opacity-80 transition-opacity"
                      title="Click to view full size"
                    >
                      <img
                        src={request.idPhotoURL}
                        alt="Faculty ID"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {request.displayName || 'Unnamed user'}
                      </h3>
                      <div className="mt-1 space-y-1 text-sm text-white/60">
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {request.email}
                        </p>
                        {request.department && (
                          <p className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {request.department}
                          </p>
                        )}
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Waiting {waitingTime(request)}
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-2 md:justify-center">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={actionLoading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors font-medium disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectingRequest(request);
                          setRejectReason('');
                        }}
                        disabled={actionLoading}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject & Ban
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Full-size photo viewer */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setViewingPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={viewingPhoto}
            alt="Faculty ID full size"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Reject modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#2f1632] border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-2">Reject & Ban Account</h2>
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-200">
                <strong>This will permanently ban the account</strong> of{' '}
                {rejectingRequest.displayName || rejectingRequest.email}. They will no longer be
                able to sign in.
              </p>
            </div>
            <label className="block text-sm text-white/60 mb-2">Reason (required)</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g., Submitted ID is not a valid faculty ID"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#ff7400]"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectingRequest(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-xl bg-white/5 text-white/80 hover:bg-white/10 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject & Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
