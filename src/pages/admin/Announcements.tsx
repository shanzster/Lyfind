import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Trash2, Loader2, Plus, Mail, Send } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  announcementService,
  Announcement,
  AnnouncementPriority,
} from '@/services/announcementService';
import { mailingListService, MailingRecipient } from '@/services/mailingListService';
import { emailService } from '@/services/emailService';
import { adminService } from '@/services/adminService';
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

  // Email blast state
  const [recipients, setRecipients] = useState<MailingRecipient[] | null>(null);
  const [sendEmailOnPublish, setSendEmailOnPublish] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Announcement | null>(null);
  const [emailing, setEmailing] = useState(false);
  const [emailProgress, setEmailProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    announcementService
      .getAll()
      .then(setAnnouncements)
      .catch((error) => {
        console.error('Error loading announcements:', error);
        toast.error('Failed to load announcements');
      })
      .finally(() => setLoading(false));

    mailingListService
      .getAll()
      .then(setRecipients)
      .catch((error) => {
        console.error('Error loading mailing list:', error);
        setRecipients([]);
      });
  }, []);

  const recipientCount = recipients?.length ?? 0;
  const emailConfigured = emailService.isConfigured();

  // Send an announcement to everyone on the imported mailing list
  const runEmailBlast = async (a: Announcement) => {
    if (!user || !recipients || recipients.length === 0) {
      toast.error('The mailing list is empty. Import recipients first.');
      return;
    }
    if (!emailConfigured) {
      toast.error('Brevo API key is not configured');
      return;
    }
    setEmailing(true);
    setEmailProgress({ done: 0, total: recipients.length });
    try {
      const result = await emailService.sendAnnouncementBlast(
        { title: a.title, message: a.message, priority: a.priority },
        recipients.map((r) => ({ email: r.email, name: r.name })),
        (done, total) => setEmailProgress({ done, total })
      );
      await announcementService.markEmailed(a.id!, result, user.uid);
      await adminService.logAdminAction(user.uid, 'email_announcement', a.id!, {
        title: a.title,
        sent: result.sent,
        failed: result.failed,
      });
      if (result.failed === 0) {
        toast.success(`Emailed ${result.sent} recipient${result.sent === 1 ? '' : 's'}`);
      } else {
        toast.warning(`Sent ${result.sent}, failed ${result.failed}. ${result.errors[0] || ''}`);
      }
      setAnnouncements(await announcementService.getAll());
    } catch (error: any) {
      console.error('Error emailing announcement:', error);
      toast.error(error?.message || 'Failed to send emails');
    } finally {
      setEmailing(false);
      setEmailProgress(null);
      setEmailTarget(null);
    }
  };

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
        const id = await announcementService.create(
          title,
          message,
          user.uid,
          adminProfile?.displayName || 'Admin',
          priority,
          expiresAt ? new Date(expiresAt) : null
        );
        toast.success('Announcement published!');
        if (sendEmailOnPublish) {
          const created = { id, title: title.trim(), message: message.trim(), priority } as Announcement;
          setSaving(false);
          await runEmailBlast(created);
        }
      }

      setAnnouncements(await announcementService.getAll());
      resetForm();
      setSendEmailOnPublish(false);
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
              {!editingId && (
                <label className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmailOnPublish}
                    onChange={(e) => setSendEmailOnPublish(e.target.checked)}
                    disabled={saving || emailing || recipientCount === 0 || !emailConfigured}
                    className="mt-0.5 w-4 h-4 accent-[#ff7400]"
                  />
                  <span className="text-sm text-white/80">
                    <span className="inline-flex items-center gap-1.5 font-medium text-white">
                      <Mail className="w-4 h-4 text-[#ff7400]" /> Also email to the mailing list
                    </span>
                    <span className="block text-xs text-white/50 mt-0.5">
                      {recipients === null
                        ? 'Loading recipients…'
                        : recipientCount === 0
                          ? <>No recipients yet. <Link to="/admin/mailing-list" className="text-[#ff7400] underline">Import a CSV or Excel file</Link>.</>
                          : !emailConfigured
                            ? 'Brevo API key is not configured, so emails cannot be sent.'
                            : `${recipientCount} recipient${recipientCount === 1 ? '' : 's'} on the list · sent via Brevo`}
                    </span>
                  </span>
                </label>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCreate}
                  disabled={saving || emailing || !title.trim() || !message.trim()}
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
                      {a.emailedAt && (
                        <p className="text-xs mt-1 inline-flex items-center gap-1 text-green-300">
                          <Mail className="w-3 h-3" />
                          Emailed to {a.emailedCount ?? 0}
                          {a.emailFailedCount ? ` (${a.emailFailedCount} failed)` : ''} ·{' '}
                          {a.emailedAt.toDate().toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEmailTarget(a)}
                        disabled={emailing}
                        title={a.emailedAt ? 'Send again' : 'Email to mailing list'}
                        className="px-3 py-1.5 rounded-lg bg-[#ff7400]/20 hover:bg-[#ff7400]/30 text-[#ffb070] text-xs font-medium transition-all inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {a.emailedAt ? 'Resend' : 'Email'}
                      </button>
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

      {/* Email confirm / progress modal */}
      {emailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#ff7400]/20 flex items-center justify-center">
                <Send className="w-6 h-6 text-[#ff7400]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white">Email this announcement?</h3>
                <p className="text-sm text-white/60 truncate">{emailTarget.title}</p>
              </div>
            </div>

            {emailing && emailProgress ? (
              <div className="mb-6">
                <p className="text-white/70 text-sm mb-2">
                  Sending {emailProgress.done}/{emailProgress.total}…
                </p>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#ff7400] transition-all"
                    style={{ width: `${(emailProgress.done / Math.max(emailProgress.total, 1)) * 100}%` }}
                  />
                </div>
                <p className="text-white/40 text-xs mt-2">Keep this tab open until it finishes.</p>
              </div>
            ) : (
              <div className="mb-6 space-y-2 text-sm text-white/70">
                <p>
                  This sends a personalised email to all{' '}
                  <span className="text-white font-medium">{recipientCount}</span> people on the mailing list
                  through Brevo.
                </p>
                {emailTarget.emailedAt && (
                  <p className="text-amber-200/80">
                    Already emailed on {emailTarget.emailedAt.toDate().toLocaleString()}. Sending again will
                    email everyone a second time.
                  </p>
                )}
                {recipientCount === 0 && (
                  <p className="text-red-300">
                    The mailing list is empty.{' '}
                    <Link to="/admin/mailing-list" className="underline">Import recipients</Link> first.
                  </p>
                )}
                {!emailConfigured && (
                  <p className="text-red-300">Brevo API key is not configured.</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setEmailTarget(null)}
                disabled={emailing}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => runEmailBlast(emailTarget)}
                disabled={emailing || recipientCount === 0 || !emailConfigured}
                className="flex-1 px-4 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {emailing ? 'Sending…' : `Send to ${recipientCount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
