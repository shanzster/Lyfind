import { useState, useEffect } from 'react';
import { Megaphone, Trash2, Loader2, Plus } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  announcementService,
  Announcement,
  AnnouncementPriority,
} from '@/services/announcementService';
import { toast } from 'sonner';

const priorityStyles: Record<AnnouncementPriority, string> = {
  info: 'bg-blue-500/10 text-blue-200 border-blue-400/30',
  warning: 'bg-amber-500/10 text-amber-200 border-amber-400/30',
  urgent: 'bg-red-500/10 text-red-200 border-red-400/30',
};

export default function Announcements() {
  const { user, adminProfile } = useAdminAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('info');
  const [expiresAt, setExpiresAt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setPriority('info');
    setExpiresAt('');
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!user || !title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await announcementService.update(editingId, {
          title,
          message,
          priority,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        });
        toast.success('Announcement updated!');
      } else {
        await announcementService.create(
          title,
          message,
          user.uid,
          adminProfile?.displayName || 'Admin',
          priority,
          expiresAt ? new Date(expiresAt) : null
        );
        toast.success('Announcement published!');
      }

      setAnnouncements(await announcementService.getAll());
      resetForm();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error(editingId ? 'Failed to update announcement' : 'Failed to publish announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id || null);
    setTitle(a.title || '');
    setMessage(a.message || '');
    setPriority(a.priority || 'info');
    setExpiresAt(a.expiresAt ? new Date(a.expiresAt.toDate().getTime() - a.expiresAt.toDate().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  };

  const getAnnouncementState = (a: Announcement) => {
    if (!a.active) return 'Hidden';
    if (a.expiresAt && a.expiresAt.toDate() <= new Date()) return 'Expired';
    return 'Live';
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

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </h2>
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
              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50"
                >
                  <option value="info" className="bg-slate-900">Info</option>
                  <option value="warning" className="bg-slate-900">Warning</option>
                  <option value="urgent" className="bg-slate-900">Urgent</option>
                </select>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50"
                  title="Optional expiry date"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCreate}
                  disabled={saving || !title.trim() || !message.trim()}
                  className="px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Save changes' : 'Publish'}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

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
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="text-white font-semibold">{a.title}</p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${priorityStyles[a.priority || 'info']}`}
                        >
                          {a.priority || 'info'}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm mt-1">{a.message}</p>
                      <p className="text-white/40 text-xs mt-2">
                        {a.createdByName} · {a.createdAt?.toDate().toLocaleString()} ·{' '}
                        {getAnnouncementState(a) === 'Live' ? '🟢 Live' : getAnnouncementState(a) === 'Expired' ? '⏰ Expired' : '⚪ Hidden'}
                        {a.expiresAt ? ` · Expires ${a.expiresAt.toDate().toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(a)}
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
                      >
                        Edit
                      </button>
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
