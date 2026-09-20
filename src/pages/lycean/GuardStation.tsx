import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Package, CheckCircle, X, ClipboardList, PlusCircle } from 'lucide-react';
import LyceanSidebar from '@/components/lycean-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { itemService, Item } from '@/services/itemService';
import { guardService, GuardClaim } from '@/services/guardService';
import { toast } from 'sonner';

export default function GuardStationPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [claimLog, setClaimLog] = useState<GuardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimItem, setClaimItem] = useState<Item | null>(null);
  const [claimerName, setClaimerName] = useState('');
  const [claimerStudentId, setClaimerStudentId] = useState('');
  const [claimNote, setClaimNote] = useState('');
  const [logging, setLogging] = useState(false);

  const isCustodian = userProfile?.role === 'custodian';

  useEffect(() => {
    if (!user || !userProfile) return;
    if (!isCustodian) {
      navigate('/browse');
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [userItems, log] = await Promise.all([
          itemService.getUserItems(user.uid),
          guardService.getClaimLog(user.uid),
        ]);
        setItems(userItems);
        setClaimLog(log);
      } catch (error) {
        console.error('[GuardStation] Failed to load:', error);
        toast.error('Failed to load guard station data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, userProfile]);

  const handleLogClaim = async () => {
    if (!user || !claimItem || !claimerName.trim() || !claimerStudentId.trim()) {
      toast.error('Claimer name and student ID are required');
      return;
    }
    setLogging(true);
    try {
      await guardService.logClaim(
        claimItem.id!,
        claimItem.title,
        user.uid,
        claimerName,
        claimerStudentId,
        claimNote
      );
      toast.success('Claim logged — item marked as resolved');
      setItems((prev) =>
        prev.map((i) => (i.id === claimItem.id ? { ...i, status: 'resolved' as const } : i))
      );
      setClaimLog(await guardService.getClaimLog(user.uid));
      setClaimItem(null);
      setClaimerName('');
      setClaimerStudentId('');
      setClaimNote('');
    } catch (error) {
      console.error('[GuardStation] Failed to log claim:', error);
      toast.error('Failed to log claim');
    } finally {
      setLogging(false);
    }
  };

  if (!user || !isCustodian) return null;

  const heldItems = items.filter((i) => i.status === 'active');

  return (
    <>
      <LyceanSidebar />
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-medium text-white mb-2">🏢 Guard Station</h1>
              <p className="text-white/50">
                Log turned-in items and record physical pickups
              </p>
            </div>
            <Link
              to="/post"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              Log New Item
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Held Items */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-5 h-5 text-[#ff7400]" />
                  <h2 className="text-xl font-semibold text-white">
                    Items Currently Held ({heldItems.length})
                  </h2>
                </div>
                {heldItems.length === 0 ? (
                  <p className="text-white/50 text-sm py-6 text-center">
                    No items currently held. Use "Log New Item" when something is turned in.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {heldItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
                      >
                        {item.photos?.[0] ? (
                          <img
                            src={item.photos[0]}
                            alt={item.title}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.title}</p>
                          <p className="text-white/50 text-xs truncate">{item.category}</p>
                        </div>
                        <button
                          onClick={() => setClaimItem(item)}
                          className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-all flex-shrink-0"
                        >
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Claimed
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Claim Log */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ClipboardList className="w-5 h-5 text-[#ff7400]" />
                  <h2 className="text-xl font-semibold text-white">
                    Pickup Log ({claimLog.length})
                  </h2>
                </div>
                {claimLog.length === 0 ? (
                  <p className="text-white/50 text-sm py-6 text-center">
                    No pickups recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {claimLog.map((claim) => (
                      <div
                        key={claim.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 rounded-xl bg-white/5 border border-white/10 text-sm"
                      >
                        <p className="text-white font-medium flex-1 min-w-0 truncate">
                          {claim.itemTitle}
                        </p>
                        <p className="text-white/70 whitespace-nowrap">
                          {claim.claimerName} · ID: {claim.claimerStudentId}
                        </p>
                        <p className="text-white/40 text-xs whitespace-nowrap">
                          {claim.claimedAt?.toDate().toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Log Claim Modal */}
      {claimItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Log Pickup</h3>
                <p className="text-sm text-white/60">{claimItem.title}</p>
              </div>
              <button
                onClick={() => setClaimItem(null)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-white/70 text-sm">
                Check the claimer's physical student ID before releasing the item.
              </p>
              <input
                type="text"
                value={claimerName}
                onChange={(e) => setClaimerName(e.target.value)}
                placeholder="Claimer's full name *"
                disabled={logging}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
              />
              <input
                type="text"
                value={claimerStudentId}
                onChange={(e) => setClaimerStudentId(e.target.value)}
                placeholder="Student ID number *"
                disabled={logging}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
              />
              <textarea
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                placeholder="Notes (optional — e.g. verified via description)"
                disabled={logging}
                rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setClaimItem(null)}
                disabled={logging}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogClaim}
                disabled={logging || !claimerName.trim() || !claimerStudentId.trim()}
                className="flex-1 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Pickup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
