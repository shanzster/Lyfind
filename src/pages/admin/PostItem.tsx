import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Image as ImageIcon, X, Loader2, Send, Building2, ArrowLeft } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminService } from '@/services/adminService';
import { itemService } from '@/services/itemService';
import { storageService } from '@/services/storageService';
import { guardService, GuardIntake } from '@/services/guardService';
import { autoMatchNewItem } from '@/services/autoMatchService';
import { watchService } from '@/services/watchService';
import { LocationPickerWithOCR } from '@/components/LocationPickerWithOCR';
import { toast } from 'sonner';

const categories = ['Bags', 'Electronics', 'Jewelry', 'Accessories', 'Keys', 'Clothing', 'Books', 'Other'];
const MAX_PHOTOS = 5;

const inputClass =
  'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50';

// Admin posting page. Works standalone (any lost/found post on behalf of the
// school) and pre-filled from a Guard Station intake entry (?intake=<id>),
// in which case the post is tagged "Held at Guard Station" and the intake
// entry is marked posted.
export default function AdminPostItem() {
  const { adminProfile } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intakeId = searchParams.get('intake');

  const [intake, setIntake] = useState<GuardIntake | null>(null);
  const [loadingIntake, setLoadingIntake] = useState(!!intakeId);

  const [itemType, setItemType] = useState<'lost' | 'found'>('found');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [blindDescription, setBlindDescription] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [date, setDate] = useState('');
  const [floorPlanLocation, setFloorPlanLocation] = useState<{
    floorPlanId: string;
    x: number;
    y: number;
    roomNumber?: string;
  } | null>(null);
  const [heldAtGuardStation, setHeldAtGuardStation] = useState(false);

  // Photos already hosted (from intake) + new uploads
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!intakeId) return;
    const load = async () => {
      try {
        const entry = await guardService.getIntakeById(intakeId);
        if (!entry) {
          toast.error('Intake entry not found');
          navigate('/admin/guard-intake');
          return;
        }
        if (entry.status !== 'logged') {
          toast.error('This intake entry has already been posted or released');
          navigate('/admin/guard-intake');
          return;
        }
        setIntake(entry);
        setItemType('found');
        setTitle(entry.title);
        setCategory(entry.category);
        setBlindDescription(entry.description);
        setDetailedDescription(entry.note || '');
        setDate(entry.foundDate || new Date().toISOString().split('T')[0]);
        setExistingPhotos(entry.photos || []);
        setHeldAtGuardStation(true);
      } catch (error) {
        console.error('[AdminPost] Failed to load intake entry:', error);
        toast.error('Failed to load intake entry');
      } finally {
        setLoadingIntake(false);
      }
    };
    load();
  }, [intakeId]);

  const totalPhotos = existingPhotos.length + newFiles.length;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    if (totalPhotos + files.length > MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith('image/')) return void toast.error(`${file.name} is not an image`);
      if (file.size > 10 * 1024 * 1024) return void toast.error(`${file.name} is too large (max 10MB)`);
    }
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeExisting = (i: number) => setExistingPhotos((prev) => prev.filter((_, idx) => idx !== i));
  const removeNew = (i: number) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
    setNewPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminProfile) return void toast.error('Admin session expired');
    if (!title.trim()) return void toast.error('Enter an item name');
    if (!category) return void toast.error('Select a category');
    if (!blindDescription.trim()) return void toast.error('Enter a public description');
    if (!floorPlanLocation) return void toast.error('Select a location on the floor plan');
    if (!date) return void toast.error('Select a date');
    if (totalPhotos === 0) return void toast.error('Add at least one photo');

    setPosting(true);
    try {
      const uploaded = newFiles.length > 0 ? await storageService.uploadItemPhotos(newFiles) : [];
      const photos = [...existingPhotos, ...uploaded];

      const itemData: any = {
        type: itemType,
        title: title.trim(),
        description: blindDescription.trim(),
        category,
        location: {
          lat: 0,
          lng: 0,
          address: floorPlanLocation.roomNumber || 'Room not specified',
        },
        floorPlanId: floorPlanLocation.floorPlanId,
        locationX: floorPlanLocation.x,
        locationY: floorPlanLocation.y,
        roomNumber: floorPlanLocation.roomNumber,
        photos,
        userId: adminProfile.uid,
        userName: adminProfile.displayName || 'LyFind Admin',
        userEmail: adminProfile.email,
        status: 'active',
        postedByAdmin: true,
        ...(heldAtGuardStation ? { heldAtGuardStation: true } : {}),
        ...(intake?.id ? { guardIntakeId: intake.id, guardCustodianId: intake.custodianId } : {}),
        approval: {
          status: 'approved',
          submittedAt: new Date(),
          submittedBy: adminProfile.uid,
          reviewedAt: new Date(),
          reviewedBy: adminProfile.uid,
          riskLevel: 'low',
          autoApproved: true,
        },
      };
      const detailed = detailedDescription.trim();
      if (detailed) itemData.detailedDescription = detailed;

      const itemId = await itemService.createItem(itemData);

      if (intake?.id) {
        await guardService.markIntakePosted(intake.id, itemId, adminProfile.uid);
      }
      await adminService.logAdminAction(adminProfile.uid, 'post_item', itemId, {
        type: itemType,
        title: itemData.title,
        ...(intake?.id ? { guardIntakeId: intake.id } : {}),
      });

      // Live immediately: run matching + saved-search alerts (best effort)
      autoMatchNewItem(itemId, { id: itemId, ...itemData } as any).catch((err) =>
        console.error('[AdminPost] Auto-match failed:', err)
      );
      watchService.notifyWatchersForNewItem({ id: itemId, ...itemData } as any).catch((err) =>
        console.error('[AdminPost] Watch alerts failed:', err)
      );

      toast.success(intake ? 'Posted to the board and intake entry updated' : 'Item posted');
      navigate(intake ? '/admin/guard-intake' : `/admin/items/${itemId}`);
    } catch (error: any) {
      console.error('[AdminPost] Failed to post item:', error);
      toast.error(error?.message || 'Failed to post item');
    } finally {
      setPosting(false);
    }
  };

  if (loadingIntake) {
    return (
      <>
        <AdminSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
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
        <div className="max-w-4xl mx-auto">
          <Link
            to={intake ? '/admin/guard-intake' : '/admin/items'}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {intake ? 'Back to Guard Station intake' : 'Back to Items'}
          </Link>
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              {intake ? 'Post Guard Station Item' : 'Post an Item'}
            </h1>
            <p className="text-white/60">
              {intake
                ? 'Review the guard’s intake details, pin the location, and publish it as a found item.'
                : 'Publish a lost or found item on behalf of the school. Admin posts go live immediately.'}
            </p>
          </div>

          {intake && (
            <div className="mb-6 p-4 rounded-2xl bg-[#ff7400]/10 border border-[#ff7400]/30 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-[#ff7400] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-white/80">
                <p className="font-medium text-white">
                  Logged by {intake.custodianName} on {intake.loggedAt?.toDate().toLocaleString()}
                </p>
                {intake.finderName && (
                  <p>Turned in by {intake.finderName} · Student ID {intake.finderStudentId}</p>
                )}
                {intake.foundLocation && <p>Found at: {intake.foundLocation}</p>}
                {intake.note && <p className="italic text-white/60">“{intake.note}”</p>}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-medium text-lg mb-4">Post type</h2>
              <div className="grid grid-cols-2 gap-4">
                {(['found', 'lost'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemType(t)}
                    className={`p-5 rounded-2xl border-2 transition-all text-left ${
                      itemType === t
                        ? t === 'found'
                          ? 'bg-green-500/20 border-green-500'
                          : 'bg-red-500/20 border-red-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <h3 className="text-white font-medium text-lg">
                      {t === 'found' ? '🎉 Found Item' : '😢 Lost Item'}
                    </h3>
                    <p className="text-white/50 text-sm">
                      {t === 'found' ? 'Someone turned it in' : 'Reported missing'}
                    </p>
                  </button>
                ))}
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heldAtGuardStation}
                  onChange={(e) => setHeldAtGuardStation(e.target.checked)}
                  className="w-4 h-4 accent-[#ff7400]"
                />
                Item is physically held at the Guard Station
              </label>
            </div>

            {/* Photos */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-medium text-lg flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" /> Photos *
                </h2>
                <span className="text-white/50 text-sm">{totalPhotos}/{MAX_PHOTOS}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {existingPhotos.map((src, i) => (
                  <div key={src} className="relative aspect-square">
                    <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removeExisting(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {newPreviews.map((src, i) => (
                  <div key={src} className="relative aspect-square">
                    <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => removeNew(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {totalPhotos < MAX_PHOTOS && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-[#ff7400]/50 flex flex-col items-center justify-center cursor-pointer text-white/50 text-xs gap-1">
                    <ImageIcon className="w-5 h-5" />
                    Add
                    <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-medium text-lg">Details</h2>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Item name *"
                className={inputClass}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  <option value="" className="bg-[#2f1632]">Category *</option>
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-[#2f1632]">{c}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={inputClass}
                />
              </div>
              <div>
                <textarea
                  value={blindDescription}
                  onChange={(e) => setBlindDescription(e.target.value)}
                  placeholder="Public description * (keep it vague so claimants must prove ownership)"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <textarea
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                placeholder="Private verification details (visible to admins only)"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Location */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-medium text-lg mb-4">Location *</h2>
              <LocationPickerWithOCR value={floorPlanLocation} onChange={setFloorPlanLocation} />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(intake ? '/admin/guard-intake' : '/admin/items')}
                disabled={posting}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={posting}
                className="flex-1 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {posting ? 'Posting…' : 'Post to board'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
