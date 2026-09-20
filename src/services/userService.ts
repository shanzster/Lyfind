import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  studentId?: string;
  department?: string;
  yearLevel?: string;
  phoneNumber?: string;
  role: 'student' | 'faculty' | 'admin' | 'custodian';
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
  itemsPosted: number;
  itemsResolved: number;
  teacherVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  teacherIdPhotoURL?: string;
  banned?: boolean;
  banReason?: string;
  bannedBy?: string;
  bannedAt?: Timestamp;
  suspended?: boolean;
  suspendedUntil?: Timestamp | null;
  suspensionReason?: string;
}

const USERS_COLLECTION = 'users';

export const userService = {
  // Create user profile in Firestore
  async createUserProfile(
    firebaseUser: FirebaseUser,
    additionalData?: Partial<UserProfile>
  ): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    
    // Check if user already exists
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      // Update last login and photoURL (in case it changed)
      const updates: any = {
        lastLoginAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      // Update photoURL if it exists and is different
      if (firebaseUser.photoURL) {
        updates.photoURL = firebaseUser.photoURL;
      }
      
      // Update displayName if provided and different
      if (additionalData?.displayName && additionalData.displayName !== userSnap.data().displayName) {
        updates.displayName = additionalData.displayName;
      }
      
      await updateDoc(userRef, updates);
      return;
    }

    // Create new user profile - only include defined fields
    const userProfile: any = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: additionalData?.displayName || firebaseUser.displayName || '',
      role: 'student', // Default role
      emailVerified: firebaseUser.emailVerified,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      itemsPosted: 0,
      itemsResolved: 0,
    };

    // Only add photoURL if it exists
    if (firebaseUser.photoURL) {
      userProfile.photoURL = firebaseUser.photoURL;
    }

    // Add additional data, filtering out undefined values (skip displayName as it's already set)
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        if (key === 'displayName') return; // Skip displayName as we already handled it
        const value = additionalData[key as keyof UserProfile];
        if (value !== undefined) {
          userProfile[key] = value;
        }
      });
    }

    await setDoc(userRef, userProfile);
  },

  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  },

  // Update user profile
  async updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Update last login timestamp
  async updateLastLogin(uid: string): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      lastLoginAt: Timestamp.now(),
    });
  },

  // Trust signal: how many of this user's items were successfully resolved.
  // Falls back to the profile counter if the aggregate query fails.
  async getReturnedCount(uid: string): Promise<number> {
    try {
      const { getCountFromServer } = await import('firebase/firestore');
      const q = query(
        collection(db, 'items'),
        where('userId', '==', uid),
        where('status', '==', 'resolved')
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch {
      const profile = await this.getUserProfile(uid);
      return profile?.itemsResolved || 0;
    }
  },

  // Increment items posted count (atomic — safe under concurrent writes)
  async incrementItemsPosted(uid: string): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      itemsPosted: increment(1),
      updatedAt: Timestamp.now(),
    });
  },

  // Increment items resolved count (atomic — safe under concurrent writes)
  async incrementItemsResolved(uid: string): Promise<void> {
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      itemsResolved: increment(1),
      updatedAt: Timestamp.now(),
    });
  },

  // Returns a human-readable block message if the account is banned or
  // currently suspended, otherwise null. Auto-lifts expired suspensions.
  async getAccessBlock(profile: UserProfile): Promise<string | null> {
    if (profile.banned) {
      return profile.banReason
        ? `Your account has been permanently banned. Reason: ${profile.banReason}`
        : 'Your account has been permanently banned. Contact an administrator if you believe this is a mistake.';
    }

    if (profile.suspended) {
      const until = profile.suspendedUntil;
      if (until && until.toDate() <= new Date()) {
        // Suspension has expired — lift it
        try {
          await updateDoc(doc(db, USERS_COLLECTION, profile.uid), {
            suspended: false,
            suspendedUntil: null,
            updatedAt: Timestamp.now(),
          });
        } catch (e) {
          console.warn('Failed to auto-lift expired suspension:', e);
        }
        return null;
      }
      const untilText = until
        ? ` until ${until.toDate().toLocaleDateString()} ${until.toDate().toLocaleTimeString()}`
        : '';
      const reasonText = profile.suspensionReason
        ? ` Reason: ${profile.suspensionReason}`
        : '';
      return `Your account is suspended${untilText}.${reasonText}`;
    }

    return null;
  },

  // Check if email is from LSB domain
  isLSBEmail(email: string): boolean {
    return email.toLowerCase().endsWith('@lsb.edu.ph');
  },

  // Get user by email
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', email)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as UserProfile;
    }
    return null;
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<UserProfile[]> {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  },

  // Fix user profile (for existing users with missing data)
  async fixUserProfile(uid: string, displayName: string): Promise<void> {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      // Only update if displayName is missing or empty
      if (!data.displayName || data.displayName === '') {
        await updateDoc(userRef, {
          displayName: displayName,
          updatedAt: Timestamp.now(),
        });
      }
    }
  },
};
