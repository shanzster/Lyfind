import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Package,
  CheckCircle,
  X,
  ClipboardList,
  PlusCircle,
  Image as ImageIcon,
  Clock,
  Globe,
  UserRound,
} from 'lucide-react';
import LyceanSidebar from '@/components/lycean-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storageService';
import { guardService, GuardClaim, GuardIntake } from '@/services/guardService';
import { toast } from 'sonner';

const categories = ['Bags', 'Electronics', 'Jewelry', 'Accessories', 'Keys', 'Clothing', 'Books', 'Other'];
const MAX_PHOTOS = 3;

const inputClass =
  'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50';

export default function GuardStationPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [intake, setIntake] = useState<GuardIntake[]>([]);
  const [claimLog, setClaimLog] = useState<GuardClaim[]>([]);
  const [loading, setLoading] = useState(true);

  // Log New Item (intake) modal
  const [showIntake, setShowIntake] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [finderName, setFinderName] = useState('');
  const [finderStudentId, setFinderStudentId] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDate, setFoundDate] = useState('');
  const [intakeNote, setIntakeNote] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [savingIntake, setSavingIntake] = useState(false);

  // Pickup modal
  const [claimEntry, setClaimEntry] = useState<GuardIntake | null>(null);
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
        const [entries, log] = await Promise.all([
          guardService.getIntakeLog(user.uid),
          guardService.getClaimLog(user.uid),
        ]);
        setIntake(entries);
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

  // ── Intake form ─────────────────────────────────────────────────────────

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    if (photoFiles.length + files.length > MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return;
      }
    }
    setPhotoFiles((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetIntakeForm = () => {
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setTitle('');
    setCategory('');
    setDescription('');
    setFinderName('');
    setFinderStudentId('');
    setFoundLocation('');
    setFoundDate('');
    setIntakeNote('');
    setPhotoFiles([]);
    setPhotoPreviews([]);
  };

  const closeIntake = () => {
    if (savingIntake) return;
    setShowIntake(false);
    resetIntakeForm();
  };

  const handleLogIntake = async () => {
    if (!user) return;
    if (!title.trim()) return void toast.error('Enter what the item is');
    if (!category) return void toast.error('Pick a category');
    if (!description.trim()) return void toast.error('Add a short description');
    if (!finderName.trim()) return void toast.error("Enter the finder's name");
    if (!finderStudentId.trim()) return void toast.error("Enter the finder's student ID");
    if (photoFiles.length === 0) return void toast.error('Take at least one photo of the item');

    setSavingIntake(true);
    try {
      const photos = await storageService.uploadItemPhotos(photoFiles);
      const id = await guardService.logIntake({
        custodianId: user.uid,
        custodianName:
          userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Custodian',
        title,
        category,
        description,
        photos,
        finderName,
        finderStudentId,
        foundLocation,
        foundDate,
        note: intakeNote,
      });
      const now = new Date();
      setIntake((prev) => [
        {
          id,
          custodianId: user.uid,
          custodianName: userProfile?.displayName || 'Custodian',
          title: title.trim(),
          category,
          description: description.trim(),
          photos,
          finderName: finderName.trim(),
          finderStudentId: finderStudentId.trim(),
          foundLocation: foundLocation.trim() || undefined,
          foundDate: foundDate || undefined,
          note: intakeNote.trim() || undefined,
          status: 'logged',
          loggedAt: { toDate: () => now, toMillis: () => now.getTime() } as any,
          updatedAt: { toDate: () => now, toMillis: () => now.getTime() } as any,
        },
        ...prev,
      ]);
      toast.success('Item logged. An admin will review and post it.');
      setShowIntake(false);
      resetIntakeForm();
    } catch (error: any) {
      console.error('[GuardStation] Failed to log intake:', error);
      toast.error(error?.message || 'Failed to log item');
    } finally {
      setSavingIntake(false);
    }
  };

  // ── Pickup ──────────────────────────────────────────────────────────────

  const handleLogClaim = async () => {
    if (!user || !claimEntry || !claimerName.trim() || !claimerStudentId.trim()) {
      toast.error('Claimer name and student ID are required');
      return;
    }
    setLogging(true);
    try {
      await guardService.logClaim(claimEntry, user.uid, claimerName, claimerStudentId, claimNote);
      toast.success('Pickup logged — item released');
      setIntake((prev) =>
        prev.map((e) => (e.id === claimEntry.id ? { ...e, status: 'released' as const } : e))
      );
      setClaimLog(await guardService.getClaimLog(user.uid));
      setClaimEntry(null);
      setClaimerName('');
      setClaimerStudentId('');
      setClaimNote('');
    } catch (error) {
      console.error('[GuardStation] Failed to log claim:', error);
      toast.error('Failed to log pickup');
    } finally {
      setLogging(false);
    }
  };

  if (!user || !isCustodian) return null;

  const heldEntries = intake.filter((e) => e.status !== 'released');
  const awaitingCount = heldEntries.filter((e) => e.status === 'logged').length;

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
                Log turned-in items for admin review and record physical pickups
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIntake(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              Log New Item
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Held Items */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-[#ff7400]" />
                    <h2 className="text-xl font-semibold text-white">
                      Items Currently Held ({heldEntries.length})
                    </h2>
                  </div>
                  {awaitingCount > 0 && (
                    <span className="text-xs px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-300">
                      {awaitingCount} awaiting admin post
                    </span>
                  )}
                </div>
                {heldEntries.length === 0 ? (
                  <p className="text-white/50 text-sm py-6 text-center">
                    No items currently held. Use "Log New Item" when something is turned in.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {heldEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
                      >
                        {entry.photos?.[0] ? (
                          <img
                            src={entry.photos[0]}
                            alt={entry.title}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{entry.title}</p>
                          <p className="text-white/50 text-xs truncate">{entry.category}</p>
                          {entry.finderName && (
                            <p className="text-white/60 text-xs truncate">
                              Turned in by {entry.finderName} · ID: {entry.finderStudentId}
                            </p>
                          )}
                          {entry.status === 'posted' ? (
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-green-300">
                              <Globe className="w-3 h-3" /> Posted by admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-yellow-300">
                              <Clock className="w-3 h-3" /> Awaiting admin post
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setClaimEntry(entry)}
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

      {/* Log New Item (intake) modal */}
      {showIntake && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl p-8 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Log New Item</h3>
                <p className="text-sm text-white/60">
                  Recorded in the intake log. An admin decides whether to post it.
                </p>
              </div>
              <button
                onClick={closeIntake}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white/70 text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Photos *
                  </label>
                  <span className="text-white/40 text-xs">
                    {photoFiles.length}/{MAX_PHOTOS}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviews.map((src, i) => (
                    <div key={src} className="relative aspect-square">
                      <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        disabled={savingIntake}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {photoFiles.length < MAX_PHOTOS && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-[#ff7400]/50 flex flex-col items-center justify-center cursor-pointer text-white/50 text-xs gap-1">
                      <PlusCircle className="w-5 h-5" />
                      Add
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handlePhotoChange}
                        disabled={savingIntake}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Item name (e.g. Black umbrella) *"
                disabled={savingIntake}
                className={inputClass}
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={savingIntake}
                className={inputClass}
              >
                <option value="" className="bg-[#2f1632]">Category *</option>
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#2f1632]">
                    {c}
                  </option>
                ))}
              </select>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (color, brand, condition, contents) *"
                disabled={savingIntake}
                rows={3}
                className={`${inputClass} resize-none`}
              />
              <div>
                <label className="text-white/70 text-sm flex items-center gap-2 mb-2">
                  <UserRound className="w-4 h-4" /> Who turned it in? (check their student ID)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={finderName}
                    onChange={(e) => setFinderName(e.target.value)}
                    placeholder="Finder's full name *"
                    disabled={savingIntake}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={finderStudentId}
                    onChange={(e) => setFinderStudentId(e.target.value)}
                    placeholder="Finder's student ID *"
                    disabled={savingIntake}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={foundLocation}
                  onChange={(e) => setFoundLocation(e.target.value)}
                  placeholder="Where it was found"
                  disabled={savingIntake}
                  className={inputClass}
                />
                <input
                  type="date"
                  value={foundDate}
                  onChange={(e) => setFoundDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={savingIntake}
                  className={inputClass}
                />
              </div>
              <textarea
                value={intakeNote}
                onChange={(e) => setIntakeNote(e.target.value)}
                placeholder="Notes for admin (optional)"
                disabled={savingIntake}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeIntake}
                disabled={savingIntake}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogIntake}
                disabled={savingIntake}
                className="flex-1 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingIntake ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                {savingIntake ? 'Saving…' : 'Log Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Pickup modal */}
      {claimEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Log Pickup</h3>
                <p className="text-sm text-white/60">{claimEntry.title}</p>
              </div>
              <button
                onClick={() => setClaimEntry(null)}
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
                className={inputClass}
              />
              <input
                type="text"
                value={claimerStudentId}
                onChange={(e) => setClaimerStudentId(e.target.value)}
                placeholder="Student ID number *"
                disabled={logging}
                className={inputClass}
              />
              <textarea
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                placeholder="Notes (optional — e.g. verified via description)"
                disabled={logging}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setClaimEntry(null)}
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
