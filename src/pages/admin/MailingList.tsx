import { useEffect, useMemo, useState } from 'react';
import { Mail, Upload, Search, Trash2, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle, X } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminService } from '@/services/adminService';
import { mailingListService, MailingRecipient, ParseResult } from '@/services/mailingListService';
import { toast } from 'sonner';

export default function MailingListPage() {
  const { adminProfile } = useAdminAuth();
  const [recipients, setRecipients] = useState<MailingRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [showClear, setShowClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRecipients(await mailingListService.getAll());
    } catch (error) {
      console.error('[MailingList] Failed to load:', error);
      toast.error('Failed to load mailing list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFile(f);
    setParsed(null);
    setParsing(true);
    try {
      const result = await mailingListService.parseFile(f);
      setParsed(result);
      if (result.rows.length === 0) toast.error('No valid rows with an email were found');
    } catch (error: any) {
      console.error('[MailingList] Parse failed:', error);
      toast.error(error?.message || 'Could not read the file');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsed || !adminProfile || parsed.rows.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: parsed.rows.length });
    try {
      const count = await mailingListService.importRows(
        parsed.rows,
        adminProfile.uid,
        file?.name,
        (done, total) => setProgress({ done, total })
      );
      await adminService.logAdminAction(adminProfile.uid, 'import_mailing_list', file?.name || 'file', {
        imported: count,
        skippedInvalid: parsed.invalid.length,
        duplicates: parsed.duplicates,
      });
      toast.success(`Imported ${count} recipient${count === 1 ? '' : 's'}`);
      setFile(null);
      setParsed(null);
      await load();
    } catch (error: any) {
      console.error('[MailingList] Import failed:', error);
      toast.error(error?.message || 'Import failed');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const handleRemove = async (r: MailingRecipient) => {
    try {
      await mailingListService.remove(r.id!);
      setRecipients((prev) => prev.filter((x) => x.id !== r.id));
    } catch (error) {
      console.error('[MailingList] Remove failed:', error);
      toast.error('Failed to remove recipient');
    }
  };

  const handleClearAll = async () => {
    if (!adminProfile) return;
    setClearing(true);
    try {
      const count = await mailingListService.clearAll();
      await adminService.logAdminAction(adminProfile.uid, 'clear_mailing_list', 'all', { removed: count });
      toast.success(`Removed ${count} recipients`);
      setShowClear(false);
      await load();
    } catch (error) {
      console.error('[MailingList] Clear failed:', error);
      toast.error('Failed to clear mailing list');
    } finally {
      setClearing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.course?.toLowerCase().includes(q) ||
        r.studentNumber?.toLowerCase().includes(q)
    );
  }, [recipients, search]);

  const inputClass =
    'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50';

  return (
    <>
      <AdminSidebar />
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Mail className="w-8 h-8 text-[#ff7400]" />
              Mailing List
            </h1>
            <p className="text-white/60">
              Import a CSV or Excel file of names, courses, student numbers and emails. Announcements can be
              emailed to everyone on this list.
            </p>
          </div>

          {/* Import */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-1">Import recipients</h2>
            <p className="text-white/50 text-sm mb-4">
              Accepts .csv, .xlsx or .xls. Columns are detected by header: <span className="text-white/70">Name</span>,{' '}
              <span className="text-white/70">Course</span>, <span className="text-white/70">Student Number</span>,{' '}
              <span className="text-white/70">Email</span>. Only Email is required. Re-importing an email updates
              that person instead of duplicating.
            </p>

            {!parsed ? (
              <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-[#ff7400]/50 cursor-pointer text-white/60 transition-all">
                {parsing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                <span className="text-sm">{parsing ? 'Reading file…' : 'Click to choose a CSV or Excel file'}</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFile}
                  disabled={parsing}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 text-white text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-[#ff7400]" />
                    {file?.name}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-lg bg-green-500/20 text-green-300 inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {parsed.rows.length} ready
                  </span>
                  {parsed.duplicates > 0 && (
                    <span className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/70">
                      {parsed.duplicates} duplicate{parsed.duplicates === 1 ? '' : 's'} merged
                    </span>
                  )}
                  {parsed.invalid.length > 0 && (
                    <span className="text-xs px-3 py-1 rounded-lg bg-red-500/20 text-red-300 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {parsed.invalid.length} skipped
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setParsed(null);
                    }}
                    disabled={importing}
                    className="ml-auto p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-white/50">
                  Detected columns:{' '}
                  {(['name', 'course', 'studentNumber', 'email'] as const).map((k, i) => (
                    <span key={k}>
                      {i > 0 && ' · '}
                      <span className="text-white/70">{k === 'studentNumber' ? 'Student No.' : k[0].toUpperCase() + k.slice(1)}</span>
                      {' ← '}
                      {parsed.mapping[k] ? `"${parsed.mapping[k]}"` : <span className="text-white/30">not found</span>}
                    </span>
                  ))}
                </p>

                {/* Preview */}
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-white/60 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Course</th>
                        <th className="px-3 py-2 font-medium">Student No.</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/80">
                      {parsed.rows.slice(0, 8).map((r) => (
                        <tr key={r.email} className="border-t border-white/5">
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2">{r.course || <span className="text-white/30">—</span>}</td>
                          <td className="px-3 py-2">{r.studentNumber || <span className="text-white/30">—</span>}</td>
                          <td className="px-3 py-2">{r.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 8 && (
                    <p className="px-3 py-2 text-xs text-white/40 border-t border-white/5">
                      … and {parsed.rows.length - 8} more
                    </p>
                  )}
                </div>

                {parsed.invalid.length > 0 && (
                  <details className="text-xs text-white/60">
                    <summary className="cursor-pointer text-red-300">Skipped rows ({parsed.invalid.length})</summary>
                    <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {parsed.invalid.slice(0, 50).map((inv) => (
                        <li key={inv.row}>
                          Row {inv.row}: {inv.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || parsed.rows.length === 0}
                  className="px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importing && progress
                    ? `Importing ${progress.done}/${progress.total}…`
                    : `Import ${parsed.rows.length} recipient${parsed.rows.length === 1 ? '' : 's'}`}
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-white flex-1">
                Recipients ({recipients.length})
              </h2>
              <div className="relative sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, course…"
                  className={`${inputClass} pl-11 py-2.5`}
                />
              </div>
              {recipients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClear(true)}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm font-medium transition-all"
                >
                  Clear all
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-white/50 text-sm py-8 text-center">
                {recipients.length === 0 ? 'No recipients yet. Import a file above.' : 'No matches.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/60 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Course</th>
                      <th className="px-3 py-2 font-medium">Student No.</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Imported</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="text-white/80">
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2">{r.course || <span className="text-white/30">—</span>}</td>
                        <td className="px-3 py-2">{r.studentNumber || <span className="text-white/30">—</span>}</td>
                        <td className="px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2 text-white/40 text-xs whitespace-nowrap">
                          {r.importedAt?.toDate().toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemove(r)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {showClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">Clear the mailing list?</h3>
            <p className="text-white/60 text-sm mb-6">
              All {recipients.length} recipients will be removed. You can re-import the file later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClear(false)}
                disabled={clearing}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
              >
                {clearing ? 'Clearing…' : 'Clear all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
