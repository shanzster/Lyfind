import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast } from 'sonner';

const ADMIN_UID = 'QE4lWfzCoUUC1JRPzVPprPjqhxL2'; // Your admin UID from the logs

const ADMIN_CONFIG = {
  email: 'admin@lsb.edu.ph',
  password: 'Admin123!@#',
  displayName: 'Admin User',
  role: 'super_admin',
  adminLevel: 'super',
};

const PERMISSIONS = [
  'users.view', 'users.edit', 'users.delete', 'users.suspend', 'users.ban',
  'items.view', 'items.edit', 'items.delete', 'items.feature',
  'items.approve', 'items.reject', 'items.request_info',
  'reports.view', 'reports.handle', 'reports.delete',
  'messages.view', 'messages.delete',
  'ai.configure', 'ai.monitor',
  'analytics.view', 'analytics.export',
  'settings.view', 'settings.edit',
  'admins.create', 'admins.edit', 'admins.delete',
  'logs.view', 'logs.export',
  'system.backup', 'system.restore', 'system.shutdown'
];

export default function FixAdmin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fixAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Step 1: Sign in with the admin account
      console.log('� Signing in as admin...');
      await signInWithEmailAndPassword(auth, ADMIN_CONFIG.email, ADMIN_CONFIG.password);
      console.log('✅ Signed in successfully');

      // Step 2: Create admin document in Firestore
      console.log('👑 Creating admin document in Firestore...');
      console.log('UID:', ADMIN_UID);
      console.log('Collection: admins');
      console.log('Document ID:', ADMIN_UID);

      const adminDocRef = doc(db, 'admins', ADMIN_UID);
      
      const adminData = {
        email: ADMIN_CONFIG.email,
        displayName: ADMIN_CONFIG.displayName,
        role: ADMIN_CONFIG.role,
        adminLevel: ADMIN_CONFIG.adminLevel,
        permissions: PERMISSIONS,
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
        twoFactorEnabled: false,
        assignedBy: 'system',
        active: true,
      };

      console.log('Admin data:', adminData);

      await setDoc(adminDocRef, adminData);
      
      console.log('✅ Admin document created successfully!');
      console.log('Document path: admins/' + ADMIN_UID);

      // Step 3: Sign out
      await signOut(auth);
      console.log('✅ Signed out');

      toast.success('Admin privileges granted!');
      setResult({
        success: true,
        message: 'Admin document created successfully! You can now login at /admin/login'
      });

    } catch (error: any) {
      console.error('❌ Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Sign out on error
      try {
        await signOut(auth);
      } catch (e) {
        // Ignore
      }
      
      let errorMessage = error.message || 'Unknown error occurred';
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid password. Check the password in the code.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Firestore permission denied. Check security rules.';
      }
      
      toast.error('Failed: ' + errorMessage);
      setResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Fix Admin Privileges</h1>
          <p className="text-gray-400">Add admin document to Firestore</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-300">
              <p className="font-semibold mb-1">This will add admin privileges to:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-200">
                <li>UID: <span className="font-mono text-xs">{ADMIN_UID}</span></li>
                <li>Email: <span className="font-mono">admin@lsb.edu.ph</span></li>
                <li>Role: Super Admin</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Fix Button */}
        <button
          onClick={fixAdmin}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding Admin Privileges...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Grant Admin Privileges
            </>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className={`mt-6 p-4 rounded-xl border ${
            result.success 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1">
                <p className={`font-semibold ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                  {result.success ? 'Success!' : 'Error'}
                </p>
                <p className={`text-sm mt-1 ${result.success ? 'text-green-200' : 'text-red-200'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {result?.success && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white font-semibold mb-3">Next Steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>Go to <a href="/admin/login" className="text-orange-400 hover:text-orange-300 underline">/admin/login</a></li>
              <li>Email: <span className="font-mono">admin@lsb.edu.ph</span></li>
              <li>Password: <span className="font-mono">Admin123!@#</span></li>
              <li>Change your password after login!</li>
            </ol>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
