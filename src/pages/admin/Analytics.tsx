import { TrendingUp, Users, Package, MessageSquare, Activity, Download, Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useEffect, useState } from 'react';
import { adminService } from '@/services/adminService';
import { itemService } from '@/services/itemService';
import { toast } from 'sonner';

export default function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Semester Report module: CSV export of every item with summary rows
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const items = await itemService.getAllItems();
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

      const header = 'Title,Type,Category,Status,Posted By,Location,Room,Posted At,Resolved At';
      const rows = items.map((item) =>
        [
          esc(item.title),
          esc(item.type),
          esc(item.category),
          esc(item.status),
          esc(item.userName),
          esc(item.location?.address || ''),
          esc(item.roomNumber || ''),
          esc(item.createdAt?.toDate().toLocaleDateString() || ''),
          esc(item.claimedAt?.toDate().toLocaleDateString() || ''),
        ].join(',')
      );

      // Summary block: per-category and per-month counts
      const byCategory = new Map<string, number>();
      const byMonth = new Map<string, number>();
      let resolved = 0;
      for (const item of items) {
        byCategory.set(item.category, (byCategory.get(item.category) || 0) + 1);
        const month = item.createdAt?.toDate().toLocaleDateString([], { year: 'numeric', month: 'short' }) || 'Unknown';
        byMonth.set(month, (byMonth.get(month) || 0) + 1);
        if (item.status === 'resolved') resolved++;
      }
      const summary = [
        '',
        'SUMMARY',
        `Total items,${items.length}`,
        `Resolved,${resolved}`,
        `Resolution rate,${items.length ? Math.round((resolved / items.length) * 100) : 0}%`,
        '',
        'BY CATEGORY',
        ...[...byCategory.entries()].map(([k, v]) => `${esc(k)},${v}`),
        '',
        'BY MONTH',
        ...[...byMonth.entries()].map(([k, v]) => `${esc(k)},${v}`),
      ];

      const csv = [header, ...rows, ...summary].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lyfind-report-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${items.length} items`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-white/60">Platform performance and insights</p>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              Export Semester Report (CSV)
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalUsers || 0}</h3>
              <p className="text-sm text-white/60">Total Users</p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-400" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalItems || 0}</h3>
              <p className="text-sm text-white/60">Total Items</p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.activeItems || 0}</h3>
              <p className="text-sm text-white/60">Active Items</p>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.resolvedItems || 0}</h3>
              <p className="text-sm text-white/60">Resolved Items</p>
            </div>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Lost vs Found</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70">Lost Items</span>
                    <span className="text-white font-semibold">{stats?.lostItems || 0}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500"
                      style={{ width: `${stats?.totalItems ? (stats.lostItems / stats.totalItems * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70">Found Items</span>
                    <span className="text-white font-semibold">{stats?.foundItems || 0}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ width: `${stats?.totalItems ? (stats.foundItems / stats.totalItems * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Resolution Rate</h3>
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">
                    {stats?.totalItems ? Math.round((stats.resolvedItems / stats.totalItems) * 100) : 0}%
                  </div>
                  <p className="text-white/60">Items Resolved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
