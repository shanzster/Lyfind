import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Clock, Globe, CheckCircle, Eye, Send, Calendar, MapPin, User } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { guardService, GuardIntake as GuardIntakeEntry, GuardIntakeStatus } from '@/services/guardService';
import { toast } from 'sonner';

type Filter = 'logged' | 'posted' | 'released' | 'all';

const STATUS_LABEL: Record<GuardIntakeStatus, { text: string; cls: string; Icon: typeof Clock }> = {
  logged: { text: 'Awaiting post', cls: 'bg-yellow-500/20 text-yellow-300', Icon: Clock },
  posted: { text: 'Posted', cls: 'bg-green-500/20 text-green-300', Icon: Globe },
  released: { text: 'Released', cls: 'bg-blue-500/20 text-blue-300', Icon: CheckCircle },
};

export default function GuardIntakePage() {
  const [entries, setEntries] = useState<GuardIntakeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('logged');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setEntries(await guardService.getAllIntake());
      } catch (error) {
        console.error('[AdminGuardIntake] Failed to load:', error);
        toast.error('Failed to load guard intake log');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = entries.filter((e) => filter === 'all' || e.status === filter);
  const counts = {
    logged: entries.filter((e) => e.status === 'logged').length,
    posted: entries.filter((e) => e.status === 'posted').length,
    released: entries.filter((e) => e.status === 'released').length,
    all: entries.length,
  };

  return (
    <>
      <AdminSidebar />
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-[#ff7400]" />
              Guard Station Intake
            </h1>
            <p className="text-white/60">
              Items turned in at the guard desk. Review each entry and post it to the public board.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(['logged', 'posted', 'released', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-[#ff7400] text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {f === 'logged' ? 'Awaiting post' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7400]"></div>
            </div>
          ) : visible.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <Building2 className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Nothing here</h2>
              <p className="text-white/60">
                {filter === 'logged'
                  ? 'No guard intake entries are waiting to be posted.'
                  : 'No entries match this filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((entry) => {
                const badge = STATUS_LABEL[entry.status];
                return (
                  <div
                    key={entry.id}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all flex flex-col"
                  >
                    {entry.photos?.[0] && (
                      <img
                        src={entry.photos[0]}
                        alt={entry.title}
                        className="w-full h-48 object-cover rounded-xl mb-4"
                      />
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-medium px-3 py-1 rounded-lg bg-white/10 text-white/70">
                        {entry.category}
                      </span>
                      <span className={`text-xs font-medium px-3 py-1 rounded-lg inline-flex items-center gap-1 ${badge.cls}`}>
                        <badge.Icon className="w-3 h-3" />
                        {badge.text}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{entry.title}</h3>
                    <p className="text-sm text-white/70 mb-4 line-clamp-2">{entry.description}</p>

                    <div className="space-y-1.5 mb-4 text-sm text-white/60 flex-1">
                      {entry.finderName && (
                        <div className="flex items-center gap-2 text-white/80">
                          <User className="w-4 h-4" />
                          <span className="truncate">
                            Turned in by {entry.finderName} · ID {entry.finderStudentId}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>Logged by {entry.custodianName}</span>
                      </div>
                      {entry.foundLocation && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{entry.foundLocation}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {entry.foundDate ? `Found ${entry.foundDate} · ` : ''}
                          logged {entry.loggedAt?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-white/50 italic pt-1">“{entry.note}”</p>
                      )}
                      {entry.status === 'released' && entry.releasedTo && (
                        <p className="text-xs text-blue-200 pt-1">
                          Released to {entry.releasedTo.name} (ID {entry.releasedTo.studentId})
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {entry.status === 'logged' && (
                        <Link
                          to={`/admin/post?intake=${entry.id}`}
                          className="flex-1 px-3 py-2 rounded-lg bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Send className="w-4 h-4" />
                          Post to board
                        </Link>
                      )}
                      {entry.postedItemId && (
                        <Link
                          to={`/admin/items/${entry.postedItemId}`}
                          className="flex-1 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View post
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
