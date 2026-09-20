import { useState, useEffect } from 'react';
import { Megaphone, Trash2, Loader2, Plus } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { announcementService, Announcement } from '@/services/announcementService';
import { toast } from 'sonner';

export default function Announcements() {
  const { user, adminProfile } = useAdminAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    announcementService
      .getAll()
      .then(setAnnouncements)
      .catch((error) => {
        console.error('Error loading announcements:', error);
        toast.error('Failed to load announcements');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!user || !title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    try {
      await announcementService.create(
        title,
        message,
        user.uid,
        adminProfile?.displayName || 'Admin'
      );
      setAnnouncements(await announcementService.getAll());
      setTitle('');
      setMessage('');
      toast.success('Announcement published!');
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to publish announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (a: Announcement) => {
    try {
      await announcementService.setActive(a.id!, !a.active);
      setAnnouncements((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x))
      );
    } catch (error) {
      console.error('Error toggling announcement:', error);
      toast.error('Failed to update announcement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementService.remove(id);
      setAnnouncements((prev) => prev.filter((x) => x.id !== id));
      toast.success('Announcement deleted');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  return (
    <>
      <AdminSidebar />
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-medium text-white mb-2 flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-[#ff7400]" />
              Announcements
            </h1>
            <p className="text-white/50">
              Campus-wide banners shown to all students in the app
            </p>
          </div>

          {/* Composer */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">New Announcement</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title — e.g. Unclaimed items disposal"
                disabled={saving}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message — e.g. Claim held items at the SSO office before Dec 15."
                disabled={saving}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 resize-none"
              />
              <button
                onClick={handleCreate}
                disabled={saving || !title.trim() || !message.trim()}
                className="px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Publish
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-white/50 text-center py-8">No announcements yet</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl border ${
                    a.active
                      ? 'bg-[#ff7400]/10 border-[#ff7400]/30'
                      : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold">{a.title}</p>
                      <p className="text-white/70 text-sm mt-1">{a.message}</p>
                      <p className="text-white/40 text-xs mt-2">
                        {a.createdByName} · {a.createdAt?.toDate().toLocaleString()}
                        {a.active ? ' · 🟢 Live' : ' · ⚪ Hidden'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(a)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
                      >
                        {a.active ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => a.id && handleDelete(a.id)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
