import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/AdminAuthContext';
import { PushNotificationSetup } from '@/components/PushNotificationSetup';
import Header from '@/components/header';

// Visitor pages
import HomePage from '@/pages/visitor/Home';
import AboutPage from '@/pages/visitor/About';
import ServicesPage from '@/pages/visitor/Services';
import AuthPage from '@/pages/visitor/Auth';
import LoginPage from '@/pages/visitor/Login';
import RegisterPage from '@/pages/visitor/Register';
import ForgotPasswordPage from '@/pages/visitor/ForgotPassword';
import InstitutionPage from '@/pages/visitor/Institution';
import NotFoundPage from '@/pages/NotFound';

// Lycean pages
import BrowsePage from '@/pages/lycean/Browse';
import ItemPage from '@/pages/lycean/Item';
import PostPage from '@/pages/lycean/Post';
import ProfilePage from '@/pages/lycean/Profile';
import MessagesPage from '@/pages/lycean/Messages';
import MyItemsPage from '@/pages/lycean/MyItems';
import NotificationsPage from '@/pages/lycean/Notifications';
import TeacherVerificationPage from '@/pages/lycean/TeacherVerification';
import GuardStationPage from '@/pages/lycean/GuardStation';

// Public pages
import PublicItemPage from '@/pages/public/PublicItem';

// Heavy / rarely-used pages are lazy-loaded to keep the first-load bundle small
const PhotoMatchPage = lazy(() => import('@/pages/lycean/PhotoMatch'));
const DiagnosticTest = lazy(() => import('@/pages/lycean/DiagnosticTest'));

// Admin pages (all lazy)
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const PendingApprovals = lazy(() => import('@/pages/admin/PendingApprovals'));
const UsersManagement = lazy(() => import('@/pages/admin/UsersManagement'));
const UserDetails = lazy(() => import('@/pages/admin/UserDetails'));
const ItemsManagement = lazy(() => import('@/pages/admin/ItemsManagement'));
const ItemDetails = lazy(() => import('@/pages/admin/ItemDetails'));
const ReportsManagement = lazy(() => import('@/pages/admin/ReportsManagement'));
const MessagesMonitoring = lazy(() => import('@/pages/admin/MessagesMonitoring'));
const AIMatching = lazy(() => import('@/pages/admin/AIMatching'));
const Analytics = lazy(() => import('@/pages/admin/Analytics'));
const ActivityLogs = lazy(() => import('@/pages/admin/ActivityLogs'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const TeacherVerifications = lazy(() => import('@/pages/admin/TeacherVerifications'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/Announcements'));
const AdminGuardIntake = lazy(() => import('@/pages/admin/GuardIntake'));
const AdminPostItem = lazy(() => import('@/pages/admin/PostItem'));
const AdminMailingList = lazy(() => import('@/pages/admin/MailingList'));

// Utility pages (lazy)
const SeedAdmin = lazy(() => import('@/pages/SeedAdmin'));
const FixAdmin = lazy(() => import('@/pages/FixAdmin'));
const OAuthDiagnostic = lazy(() => import('@/pages/OAuthDiagnostic'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7400]"></div>
    </div>
  );
}

function WakeRenderService() {
  useEffect(() => {
    const wakeUrl = import.meta.env.VITE_NOTIFICATION_SERVER_URL || import.meta.env.VITE_RENDER_WAKE_URL;

    if (!wakeUrl) return;

    const pingService = () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);

      fetch(wakeUrl, {
        method: 'GET',
        cache: 'no-store',
        mode: 'no-cors',
        signal: controller.signal,
      }).catch(() => {
        // Ignore ping failures; the app should still work even if the server is sleeping.
      }).finally(() => {
        window.clearTimeout(timeout);
      });
    };

    pingService();
    const intervalId = window.setInterval(pingService, 4 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return null;
}

// Requires a logged-in user; otherwise redirects to /login
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, userProfile } = useAuth();
  const location = useLocation();

  const isCustodianRestrictedRoute =
    String(userProfile?.role ?? '') === 'custodian' &&
    !location.pathname.startsWith('/guard-station');

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isCustodianRestrictedRoute) {
    return <Navigate to="/guard-station" replace />;
  }

  return <>{children}</>;
}

// Protected Admin Route Component
function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, adminProfile, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2f1632]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7400]"></div>
      </div>
    );
  }

  if (!user || !adminProfile) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <ProtectedAdminRoute>{children}</ProtectedAdminRoute>
    </AdminAuthProvider>
  );
}

export default function App() {
  const location = useLocation();

  // Hide header on Lycean and Admin pages
  const isLyceanPage = location.pathname.startsWith('/browse') ||
                       location.pathname.startsWith('/item') ||
                       location.pathname.startsWith('/post') ||
                       location.pathname.startsWith('/profile') ||
                       location.pathname.startsWith('/messages') ||
                       location.pathname.startsWith('/photo-match') ||
                       location.pathname.startsWith('/diagnostic') ||
                       location.pathname.startsWith('/my-items') ||
                       location.pathname.startsWith('/notifications') ||
                       location.pathname.startsWith('/teacher-verification') ||
                       location.pathname.startsWith('/guard-station');

  const isAdminPage = location.pathname.startsWith('/admin');

  const shouldShowHeader = !isLyceanPage && !isAdminPage;

  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <AuthProvider>
        <NotificationProvider>
          <WakeRenderService />
          <PushNotificationSetup />
          <div className="min-h-screen bg-background">
            {shouldShowHeader && <Header />}
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Visitor Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/institution" element={<InstitutionPage />} />

              {/* Utility Routes — dev builds only, never shipped to production */}
              {import.meta.env.DEV && (
                <>
                  <Route path="/seed-admin" element={<SeedAdmin />} />
                  <Route path="/fix-admin" element={<FixAdmin />} />
                  <Route path="/oauth-diagnostic" element={<OAuthDiagnostic />} />
                </>
              )}

              {/* Public Routes */}
              <Route path="/public/item/:id" element={<PublicItemPage />} />

              {/* Lycean Routes (require login) */}
              <Route path="/browse" element={<RequireAuth><BrowsePage /></RequireAuth>} />
              <Route path="/item/:id" element={<RequireAuth><ItemPage /></RequireAuth>} />
              <Route path="/post" element={<RequireAuth><PostPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              <Route path="/my-items" element={<RequireAuth><MyItemsPage /></RequireAuth>} />
              <Route path="/photo-match" element={<RequireAuth><PhotoMatchPage /></RequireAuth>} />
              <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
              <Route path="/teacher-verification" element={<RequireAuth><TeacherVerificationPage /></RequireAuth>} />
              <Route path="/guard-station" element={<RequireAuth><GuardStationPage /></RequireAuth>} />
              {import.meta.env.DEV && (
                <Route path="/diagnostic" element={<DiagnosticTest />} />
              )}

              {/* Admin Routes - Wrapped with AdminAuthProvider */}
              <Route path="/admin/login" element={
                <AdminAuthProvider>
                  <AdminLoginPage />
                </AdminAuthProvider>
              } />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/approvals" element={<AdminRoute><PendingApprovals /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><UsersManagement /></AdminRoute>} />
              <Route path="/admin/users/:id" element={<AdminRoute><UserDetails /></AdminRoute>} />
              <Route path="/admin/items" element={<AdminRoute><ItemsManagement /></AdminRoute>} />
              <Route path="/admin/post" element={<AdminRoute><AdminPostItem /></AdminRoute>} />
              <Route path="/admin/guard-intake" element={<AdminRoute><AdminGuardIntake /></AdminRoute>} />
              <Route path="/admin/items/:id" element={<AdminRoute><ItemDetails /></AdminRoute>} />
              <Route path="/admin/reports" element={<AdminRoute><ReportsManagement /></AdminRoute>} />
              <Route path="/admin/messages" element={<AdminRoute><MessagesMonitoring /></AdminRoute>} />
              <Route path="/admin/ai-matching" element={<AdminRoute><AIMatching /></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><Analytics /></AdminRoute>} />
              <Route path="/admin/logs" element={<AdminRoute><ActivityLogs /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />
              <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />
              <Route path="/admin/mailing-list" element={<AdminRoute><AdminMailingList /></AdminRoute>} />
              <Route path="/admin/teacher-verifications" element={<AdminRoute><TeacherVerifications /></AdminRoute>} />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
            <Toaster />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
