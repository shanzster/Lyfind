import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Gavel,
  FileText,
  CheckCircle,
  XCircle,
  ExternalLink,
  Mail,
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { appealService, Appeal } from '@/services/appealService';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';

export default function AppealsPage() {
  const { adminProfile } = useAdminAuth();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejecting, setRejecting] = useState<Appeal | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    loadAppeals();
  }, []);

  const loadAppeals = async () => {
    setLoading(true);
    try {
      const pending = await appealService.getPendingAppeals();
      setAppeals(pending);
    } catch (error) {
      console.error('Error loading appeals:', error);
      toast.error('Failed to load appeals');
    } finally {
      setLoading(false);
    }
  };

  // Approving an appeal lifts the user's suspension.
  const handleApprove = async (appeal: Appeal) => {
    if (!adminProfile || !appeal.id) return;
    setActionLoading(true);
    try {
      await adminService.unsuspendUser(appeal.userId, adminProfile.uid);
      await appealService.decideAppeal(appeal.id, adminProfile.uid, 'approved');
      toast.success(`Suspension lifted for ${appeal.userName}`);
      await loadAppeals();
    } catch (error) {
      console.error('Error approving appeal:', error);
      toast.error('Failed to approve appeal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!adminProfile || !rejecting?.id) return;
    setActionLoading(true);
    try {
      await appealService.decideAppeal(
        rejecting.id,
        adminProfile.uid,
        'rejected',
        rejectNote.trim() || undefined
      );
      toast.success('Appeal rejected');
      setRejecting(null);
      setRejectNote('');
      await loadAppeals();
    } catch (error) {
      console.error('Error rejecting appeal:', error);
      toast.error('Failed to reject appeal');
    } finally {
      setActionLoading(false);
    }
  };

  const submittedAgo = (appeal: Appeal) => {
    if (!appeal.createdAt?.toDate) return '';
    const ms = Date.now() - appeal.createdAt.toDate().getTime();
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
              <Gavel className="w-8 h-8 text-[#ff7400]" />
              <h1 className="text-3xl font-bold text-white">Suspension Appeals</h1>
            </div>
            <p className="text-white/60">
              Review appeals from suspended users. Approving an appeal lifts the user's suspension.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7400]"></div>
            </div>
          ) : appeals.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-white/5 border border-white/10">
              <Gavel className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No pending appeals</h3>
              <p className="text-white/60">All suspension appeals have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appeals.map((appeal) => (
                <div key={appeal.id} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/admin/users/${appeal.userId}`}
                          className="text-lg font-semibold text-white hover:text-[#ff7400] transition-colors"
                        >
                          {appeal.userName}
                        </Link>
                        <span className="text-xs text-white/40">· {submittedAgo(appeal)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-white/60 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        {appeal.userEmail}
                      </div>
                      {appeal.suspensionReason && (
                        <p className="text-sm text-white/50 mt-2">
                          <span className="font-medium text-white/70">Suspended for:</span>{' '}
                          {appeal.suspensionReason}
                        </p>
                      )}
                      <p className="text-sm text-white/80 mt-3 whitespace-pre-wrap bg-black/20 rounded-lg p-3">
                        {appeal.reason}
                      </p>
                      <a
                        href={appeal.pdfDataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#ff7400] hover:underline mt-3"
                      >
                        <FileText className="w-4 h-4" /> View appeal PDF
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="flex md:flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(appeal)}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Approve &amp; lift
                      </button>
                      <button
                        onClick={() => setRejecting(appeal)}
                        disabled={actionLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reject modal */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#2f1632] border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-1">Reject appeal</h3>
            <p className="text-sm text-white/60 mb-4">
              {rejecting.userName}'s suspension will remain in place. You can add a note explaining
              why.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Optional note to the user…"
              rows={4}
              className="w-full rounded-lg bg-black/30 border border-white/10 text-white text-sm p-3 placeholder:text-white/30 focus:outline-none focus:border-[#ff7400]"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
              >
                Confirm rejection
              </button>
              <button
                onClick={() => {
                  setRejecting(null);
                  setRejectNote('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
