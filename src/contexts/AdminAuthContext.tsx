import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { adminService, AdminUser } from '@/services/adminService';
import { toast } from 'sonner';

interface AdminAuthContextType {
  user: User | null;
  adminProfile: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user is admin
        const isAdmin = await adminService.isAdmin(user.uid);
        
        if (isAdmin) {
          const profile = await adminService.getAdminProfile(user.uid);
          setAdminProfile(profile);
          
          // Update last login
          await adminService.updateLastLogin(user.uid);
        } else {
          // Not an admin, sign out
          await signOut(auth);
          setAdminProfile(null);
          toast.error('Access denied. Admin privileges required.');
        }
      } else {
        setAdminProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user is admin
      const isAdmin = await adminService.isAdmin(userCredential.user.uid);
      
      if (!isAdmin) {
        await signOut(auth);
        throw new Error('Access denied. Admin privileges required.');
      }
      
      // Load admin profile
      const profile = await adminService.getAdminProfile(userCredential.user.uid);
      setAdminProfile(profile);
      setUser(userCredential.user);
      
      // Update last login
      await adminService.updateLastLogin(userCredential.user.uid);
      
      toast.success('Logged in successfully!');
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      if (error.message.includes('Admin privileges')) {
        throw error;
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later');
      } else {
        throw new Error('Failed to login. Please try again');
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setAdminProfile(null);
    toast.success('Logged out successfully!');
  };

  const hasPermission = (permission: string): boolean => {
    if (!adminProfile) return false;
    return adminService.hasPermission(adminProfile, permission);
  };

  const value = {
    user,
    adminProfile,
    loading,
    login,
    logout,
    hasPermission,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {!loading && children}
    </AdminAuthContext.Provider>
  );
}
