import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { userService, UserProfile } from '@/services/userService';
import { toast } from 'sonner';
import { pwaDebug } from '@/utils/pwaDebug';
import { emitAuthStatus } from '@/components/AuthStatus';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, name: string, studentId?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectProcessing, setRedirectProcessing] = useState(false);
  const redirectHandled = useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        console.log('🚀 [AUTH] === AUTH INIT START ===');
        console.log('🌐 [AUTH] URL:', window.location.href);
        console.log('📱 [AUTH] User Agent:', navigator.userAgent);
        console.log('🔍 [AUTH] Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'PWA' : 'Browser');
        
        pwaDebug.log('=== AUTH INIT START ===');
        pwaDebug.log('URL: ' + window.location.href);
        pwaDebug.log('User Agent: ' + navigator.userAgent);
        emitAuthStatus('Initializing...');

        // Check if we're returning from Google redirect
        const wasRedirecting = localStorage.getItem('googleSignInPending');
        console.log('🔄 [AUTH] Was redirecting:', wasRedirecting);
        pwaDebug.log('Was redirecting: ' + wasRedirecting);

        // Method 1: Check redirect result
        console.log('📋 [AUTH] Method 1: Checking getRedirectResult()...');
        pwaDebug.log('Method 1: Checking getRedirectResult()...');
        emitAuthStatus('Checking for Google sign-in...');
        
        // Check URL for error parameters
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        if (errorParam) {
          console.error('🚨 [AUTH] URL contains error parameter:', errorParam);
          console.error('🚨 [AUTH] Error description:', errorDescription);
          pwaDebug.log('🚨 URL error: ' + errorParam + ' - ' + errorDescription);
        }
        
        console.log('📋 [AUTH] Calling getRedirectResult()...');
        const result = await getRedirectResult(auth);
        console.log('📋 [AUTH] getRedirectResult() returned:', result);
        console.log('📋 [AUTH] Result type:', typeof result);
        console.log('📋 [AUTH] Result is null?', result === null);

        if (result) {
          console.log('✅ [AUTH] Redirect result found!');
          console.log('👤 [AUTH] User email:', result.user.email);
          console.log('🆔 [AUTH] User UID:', result.user.uid);
          pwaDebug.log('✅ Redirect result found!');
          pwaDebug.log('Email: ' + result.user.email);
          localStorage.removeItem('googleSignInPending');
          await handleGoogleSignIn(result.user);
          return;
        } else {
          console.log('❌ [AUTH] No redirect result (null)');
          pwaDebug.log('❌ No redirect result');
        }

        // Method 2: If we were redirecting but no result, wait for auth state
        if (wasRedirecting === 'true') {
          console.log('⏳ [AUTH] Method 2: Waiting for auth state (was redirecting)...');
          pwaDebug.log('Method 2: Waiting for auth state (was redirecting)...');
          emitAuthStatus('Completing sign-in...');
          
          // Wait up to 5 seconds for auth state to update
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const currentUser = auth.currentUser;
            
            console.log(`⏳ [AUTH] Attempt ${attempts + 1}/${maxAttempts}: Current user =`, currentUser?.email || 'null');
            pwaDebug.log(`Attempt ${attempts + 1}: Current user = ${currentUser?.email || 'null'}`);
            
            if (currentUser) {
              console.log('✅ [AUTH] User found via polling!');
              console.log('👤 [AUTH] User email:', currentUser.email);
              pwaDebug.log('✅ User found via polling!');
              localStorage.removeItem('googleSignInPending');
              await handleGoogleSignIn(currentUser);
              return;
            }
            
            attempts++;
          }
          
          console.log('❌ [AUTH] Timeout waiting for user after', maxAttempts, 'attempts');
          pwaDebug.log('❌ Timeout waiting for user');
          localStorage.removeItem('googleSignInPending');
          emitAuthStatus('❌ Sign-in timeout');
          toast.error('Sign-in timeout. Please try again.');
        }

        // Method 3: Check current user
        console.log('🔍 [AUTH] Method 3: Checking auth.currentUser...');
        pwaDebug.log('Method 3: Checking auth.currentUser...');
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('✅ [AUTH] Current user found:', currentUser.email);
          pwaDebug.log('✅ Current user: ' + currentUser.email);
        } else {
          console.log('❌ [AUTH] No current user');
          pwaDebug.log('❌ No current user');
        }

        // Method 4: Auth listener
        console.log('👂 [AUTH] Method 4: Setting up auth state listener...');
        pwaDebug.log('Method 4: Setting up listener...');
        
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('👂 [AUTH] Auth state changed:', firebaseUser?.email || 'null');
          pwaDebug.log('Listener triggered: ' + (firebaseUser?.email || 'null'));

          if (firebaseUser) {
            console.log('✅ [AUTH] User authenticated:', firebaseUser.email);
            console.log('🆔 [AUTH] UID:', firebaseUser.uid);
            const profile = await userService.getUserProfile(firebaseUser.uid);
            console.log('📄 [AUTH] Profile loaded:', profile);

            // Enforce bans/suspensions on session restore
            if (profile) {
              const block = await userService.getAccessBlock(profile);
              if (block) {
                console.log('🚫 [AUTH] Access blocked:', block);
                await signOut(auth);
                setUser(null);
                setUserProfile(null);
                toast.error(block, { duration: 8000 });
                setLoading(false);
                return;
              }
            }

            setUser(firebaseUser);
            setUserProfile(profile);
          } else {
            console.log('❌ [AUTH] No user (signed out)');
            setUser(null);
            setUserProfile(null);
          }

          setLoading(false);
        });

        console.log('✅ [AUTH] === AUTH INIT COMPLETE ===');
        pwaDebug.log('=== AUTH INIT COMPLETE ===');
      } catch (error: any) {
        console.error('❌ [AUTH] ERROR in init:', error);
        console.error('❌ [AUTH] Error message:', error.message);
        console.error('❌ [AUTH] Error code:', error.code);
        console.error('❌ [AUTH] Error stack:', error.stack);
        pwaDebug.log('❌ ERROR: ' + error.message);
        pwaDebug.log('Code: ' + (error.code || 'none'));
        emitAuthStatus('❌ Error: ' + error.message);
        toast.error('Auth error: ' + error.message);
        setRedirectProcessing(false);
        setLoading(false);
      }
    };

    // Helper function to handle Google sign-in
    const handleGoogleSignIn = async (user: User) => {
      try {
        console.log('🔐 [GOOGLE] === HANDLING GOOGLE SIGN-IN ===');
        console.log('👤 [GOOGLE] User email:', user.email);
        console.log('🆔 [GOOGLE] User UID:', user.uid);
        console.log('📛 [GOOGLE] Display name:', user.displayName);
        
        setRedirectProcessing(true);
        pwaDebug.log('Handling Google sign-in for: ' + user.email);
        emitAuthStatus('✅ Google sign-in detected!');
        toast.success('Google sign-in successful!');
        redirectHandled.current = true;

        // Validate email
        console.log('✉️ [GOOGLE] Validating email domain...');
        pwaDebug.log('Validating email domain...');
        if (!userService.isLSBEmail(user.email!)) {
          console.log('❌ [GOOGLE] Non-LSB email:', user.email);
          pwaDebug.log('❌ Non-LSB email');
          await signOut(auth);
          emitAuthStatus('❌ Only @lsb.edu.ph allowed');
          toast.error('Only @lsb.edu.ph accounts allowed');
          setRedirectProcessing(false);
          setLoading(false);
          return;
        }
        console.log('✅ [GOOGLE] Email domain valid');
        pwaDebug.log('✅ Email valid');

        // Create profile
        console.log('📝 [GOOGLE] Creating user profile in Firestore...');
        pwaDebug.log('Creating user profile...');
        emitAuthStatus('Setting up account...');
        toast.loading('Setting up account...', { id: 'setup' });
        
        await userService.createUserProfile(user, {
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
        });
        console.log('✅ [GOOGLE] Profile created successfully');
        pwaDebug.log('✅ Profile created');

        console.log('📄 [GOOGLE] Loading user profile...');
        pwaDebug.log('Loading profile...');
        const profile = await userService.getUserProfile(user.uid);
        console.log('✅ [GOOGLE] Profile loaded:', profile);

        // Enforce bans/suspensions on the Google redirect flow
        if (profile) {
          const block = await userService.getAccessBlock(profile);
          if (block) {
            console.log('🚫 [GOOGLE] Access blocked:', block);
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            toast.error(block, { id: 'setup', duration: 8000 });
            setRedirectProcessing(false);
            setLoading(false);
            return;
          }
        }

        setUserProfile(profile);
        setUser(user);
        pwaDebug.log('✅ Profile loaded');

        console.log('⏳ [GOOGLE] Waiting 1 second before navigation...');
        pwaDebug.log('Waiting before navigation...');
        emitAuthStatus('✅ Ready! Redirecting...');
        toast.success('Ready! Redirecting...', { id: 'setup' });

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('🚀 [GOOGLE] Navigating to /browse');
        pwaDebug.log('Navigating to /browse');
        window.location.href = '/browse';
      } catch (error: any) {
        console.error('❌ [GOOGLE] Error in handleGoogleSignIn:', error);
        console.error('❌ [GOOGLE] Error message:', error.message);
        console.error('❌ [GOOGLE] Error code:', error.code);
        pwaDebug.log('❌ Error in handleGoogleSignIn: ' + error.message);
        setRedirectProcessing(false);
        throw error;
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signup = async (email: string, password: string, name: string, studentId?: string) => {
    if (!userService.isLSBEmail(email)) {
      throw new Error('Only @lsb.edu.ph email addresses are allowed');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    await userService.createUserProfile(userCredential.user, {
      displayName: name,
      ...(studentId ? { studentId } : {}),
    });
    
    const profile = await userService.getUserProfile(userCredential.user.uid);
    setUserProfile(profile);
    setUser(userCredential.user);
    
    toast.success('Account created successfully!');
  };

  const login = async (email: string, password: string) => {
    // No domain check here: only @lsb.edu.ph addresses can REGISTER, but
    // staff accounts (custodian/guard station) are seeded with other domains
    // via the Admin SDK and must be able to log in.
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // Enforce bans/suspensions before letting the session stand
    const profile = await userService.getUserProfile(credential.user.uid);
    if (profile) {
      const block = await userService.getAccessBlock(profile);
      if (block) {
        await signOut(auth);
        setUser(null);
        setUserProfile(null);
        throw new Error(block);
      }
    }

    toast.success('Logged in successfully!');
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
      hd: 'lsb.edu.ph',
    });

    try {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');

      console.log('🔵 [LOGIN] === GOOGLE SIGN-IN START ===');
      console.log('📱 [LOGIN] Is PWA:', isPWA);
      console.log('🖥️ [LOGIN] Display mode:', window.matchMedia('(display-mode: standalone)').matches);
      console.log('🍎 [LOGIN] iOS standalone:', (window.navigator as any).standalone);
      console.log('🤖 [LOGIN] Android app referrer:', document.referrer);
      console.log('🌐 [LOGIN] Current URL:', window.location.href);
      console.log('🔑 [LOGIN] Auth domain:', auth.app.options.authDomain);
      
      pwaDebug.log('=== GOOGLE SIGN-IN START ===');
      pwaDebug.log('Is PWA: ' + isPWA);
      emitAuthStatus('Starting Google sign-in...');

      if (isPWA) {
        console.log('🔄 [LOGIN] Using REDIRECT flow (PWA mode)');
        console.log('💾 [LOGIN] Setting googleSignInPending flag in localStorage');
        pwaDebug.log('Using REDIRECT flow');
        pwaDebug.log('Setting googleSignInPending flag');
        localStorage.setItem('googleSignInPending', 'true');
        console.log('✅ [LOGIN] Flag set, calling signInWithRedirect()...');
        emitAuthStatus('Redirecting to Google...');
        toast.info('Redirecting to Google...', { duration: 2000 });
        await signInWithRedirect(auth, provider);
        console.log('🚀 [LOGIN] signInWithRedirect() called (should redirect now)');
        return;
      } else {
        console.log('🪟 [LOGIN] Using POPUP flow (Browser mode)');
        pwaDebug.log('Using POPUP flow');
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log('✅ [LOGIN] Popup success!');
        console.log('👤 [LOGIN] User email:', user.email);
        console.log('🆔 [LOGIN] User UID:', user.uid);
        pwaDebug.log('✅ Popup success: ' + user.email);

        if (!userService.isLSBEmail(user.email!)) {
          console.log('❌ [LOGIN] Non-LSB email:', user.email);
          pwaDebug.log('❌ Non-LSB email');
          await signOut(auth);
          toast.error('Only @lsb.edu.ph accounts allowed');
          throw new Error('Only @lsb.edu.ph allowed');
        }

        console.log('📝 [LOGIN] Creating user profile...');
        await userService.createUserProfile(user, {
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
        });

        console.log('📄 [LOGIN] Loading profile...');
        const profile = await userService.getUserProfile(user.uid);

        // Enforce bans/suspensions on the popup flow
        if (profile) {
          const block = await userService.getAccessBlock(profile);
          if (block) {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            toast.error(block, { duration: 8000 });
            throw new Error(block);
          }
        }

        setUserProfile(profile);
        setUser(user);

        console.log('✅ [LOGIN] Login complete, navigating to /browse');
        toast.success('Logged in successfully!');
        setTimeout(() => {
          window.location.href = '/browse';
        }, 500);
      }
    } catch (error: any) {
      console.error('❌ [LOGIN] Google sign-in error:', error);
      console.error('❌ [LOGIN] Error message:', error.message);
      console.error('❌ [LOGIN] Error code:', error.code);
      console.error('❌ [LOGIN] Error stack:', error.stack);
      pwaDebug.log('❌ Google sign-in error: ' + error.message);
      pwaDebug.log('Code: ' + (error.code || 'none'));

      // Ban/suspension messages already showed their own toast — re-throw
      // without the generic error toast.
      if (/banned|suspended/.test(error.message || '')) {
        throw error;
      }

      let errorMessage = 'Failed to sign in';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup blocked';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain not authorized';
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    toast.success('Logged out successfully!');
  };

  const value = {
    user,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {redirectProcessing && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-white text-xl font-semibold mb-2">Setting up your account</h2>
            <p className="text-gray-300 text-sm">Please wait...</p>
          </div>
        </div>
      )}
      {!loading && children}
    </AuthContext.Provider>
  );
}
