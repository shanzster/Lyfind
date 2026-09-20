import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  Shield,
  Activity
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminService } from '@/services/adminService';
import { itemService } from '@/services/itemService';

export default function AdminDashboard() {
  const { adminProfile } = useAdminAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Lifecycle lazy sweep: archive active items older than 45 days.
    // Throttled to once per day per browser.
    const sweepKey = 'lyfind_lastArchiveSweep';
    const last = localStorage.getItem(sweepKey);
    if (!last || Date.now() - Number(last) > 86400000) {
      localStorage.setItem(sweepKey, String(Date.now()));
      itemService
        .archiveExpiredItems(45)
        .then((n) => {
          if (n > 0) console.log(`[AdminDashboard] Auto-archived ${n} expired items`);
        })
        .catch((error) => console.error('[AdminDashboard] Archive sweep failed:', error));
    }
  }, []);

  const loadStats = async () => {
    setLoading(true);
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-white/60">
              Welcome back, {adminProfile?.displayName} ({adminProfile?.role})
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-xs text-white/60">Total</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.totalUsers || 0}</h3>
              <p className="text-sm text-white/60">Registered Users</p>
            </div>

            {/* Active Items */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-xs text-white/60">Active</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.activeItems || 0}</h3>
              <p className="text-sm text-white/60">Active Items</p>
            </div>

            {/* Pending Approvals */}
            <Link
              to="/admin/approvals"
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-xs text-yellow-400 font-medium">Action Required</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.pendingApprovals || 0}</h3>
              <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                Pending Approvals →
              </p>
            </Link>

            {/* Resolved Items */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-xs text-white/60">Success</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-1">{stats?.resolvedItems || 0}</h3>
              <p className="text-sm text-white/60">Resolved Items</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/admin/approvals"
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#ff7400]/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#ff7400]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-[#ff7400] transition-colors">
                      Review Posts
                    </h3>
                    <p className="text-sm text-white/60">Approve or reject pending posts</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/users"
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Manage Users
                    </h3>
                    <p className="text-sm text-white/60">View and manage user accounts</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/items"
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Package className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                      Manage Items
                    </h3>
                    <p className="text-sm text-white/60">View and moderate all items</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/reports"
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors">
                      View Reports
                    </h3>
                    <p className="text-sm text-white/60">Handle user reports</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/analytics"
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                      Analytics
                    </h3>
                    <p className="text-sm text-white/60">View platform statistics</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/logs"
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-gray-400 transition-colors">
                      Activity Logs
                    </h3>
                    <p className="text-sm text-white/60">View admin actions</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Item Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Item Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="text-white">Lost Items</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{stats?.lostItems || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-400" />
                    </div>
                    <span className="text-white">Found Items</span>
                  </div>
                  <span className="text-2xl font-bold text-white">{stats?.foundItems || 0}</span>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-green-400" />
                    <span className="text-white">System Health</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <span className="text-white">Security</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                    Secure
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
