import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Users,
  Package,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Settings,
  FileText,
  LogOut,
  Sparkles,
  GraduationCap,
  Megaphone,
  Building2,
  Mail
} from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminProfile, logout } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/admin/dashboard',
      permission: null
    },
    {
      icon: Clock,
      label: 'Pending Approvals',
      path: '/admin/approvals',
      permission: 'items.approve',
      badge: true
    },
    {
      icon: Users,
      label: 'Users',
      path: '/admin/users',
      permission: 'users.view'
    },
    {
      icon: Package,
      label: 'Items',
      path: '/admin/items',
      permission: 'items.view'
    },
    {
      icon: Building2,
      label: 'Guard Station Intake',
      path: '/admin/guard-intake',
      permission: 'items.view'
    },
    {
      icon: GraduationCap,
      label: 'Teacher Verifications',
      path: '/admin/teacher-verifications',
      // Gated on users.view so existing admin docs see it without reseeding
      permission: 'users.view'
    },
    {
      icon: AlertTriangle,
      label: 'Reports',
      path: '/admin/reports',
      permission: 'reports.view'
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      path: '/admin/messages',
      permission: 'messages.view'
    },
    {
      icon: Sparkles,
      label: 'AI Matching',
      path: '/admin/ai-matching',
      permission: 'ai.monitor'
    },
    {
      icon: TrendingUp,
      label: 'Analytics',
      path: '/admin/analytics',
      permission: 'analytics.view'
    },
    {
      icon: FileText,
      label: 'Activity Logs',
      path: '/admin/logs',
      permission: 'logs.view'
    },
    {
      icon: Megaphone,
      label: 'Announcements',
      path: '/admin/announcements',
      permission: 'settings.edit'
    },
    {
      icon: Mail,
      label: 'Mailing List',
      path: '/admin/mailing-list',
      permission: 'settings.edit'
    },
    {
      icon: Settings,
      label: 'Settings',
      path: '/admin/settings',
      permission: 'settings.view'
    }
  ];

  const hasPermission = (permission: string | null) => {
    if (!permission) return true;
    return adminProfile?.permissions.includes(permission);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#2f1632]/95 border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff7400] to-[#ff5500] flex items-center justify-center">
              <img 
                src="/Untitled design (3).png" 
                alt="LyFind" 
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Portal</h1>
              <p className="text-xs text-white/60">{adminProfile?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-72 backdrop-blur-xl bg-[#2f1632]/95 border-r border-white/10 z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff7400] to-[#ff5500] flex items-center justify-center shadow-lg shadow-[#ff7400]/30">
                <img 
                  src="/Untitled design (3).png" 
                  alt="LyFind" 
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Portal</h1>
                <p className="text-xs text-white/60">LyFind Administration</p>
              </div>
            </div>
            
            {/* Admin Info */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-medium text-white truncate">{adminProfile?.displayName}</p>
              <p className="text-xs text-white/60 truncate">{adminProfile?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#ff7400]/20 text-[#ff7400] text-xs font-medium">
                  {adminProfile?.role.replace('_', ' ').toUpperCase()}
                </span>
                {adminProfile?.adminLevel === 'super' && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-xs font-medium">
                    SUPER
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                if (!hasPermission(item.permission)) return null;

                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#ff7400] text-white shadow-lg shadow-[#ff7400]/30'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && isActive && (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
                        New
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#2f1632]/95 border-t border-white/10">
        <div className="flex items-center justify-around p-2">
          {navItems.slice(0, 5).map((item) => {
            if (!hasPermission(item.permission)) return null;

            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#ff7400]'
                    : 'text-white/60'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
