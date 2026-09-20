import { auth } from '@/lib/firebase';
import { userService } from '@/services/userService';

// Utility function to fix user profile if displayName is missing
export async function fixUserProfile() {
  const user = auth.currentUser;
  
  if (!user) {
    console.log('No user logged in');
    return;
  }

  const profile = await userService.getUserProfile(user.uid);
  
  if (!profile) {
    console.log('No profile found');
    return;
  }

  // If displayName is empty or "Not set", update it from email
  if (!profile.displayName || profile.displayName === 'Not set' || profile.displayName === '') {
    const emailName = user.email?.split('@')[0] || 'User';
    const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
    
    await userService.updateUserProfile(user.uid, {
      displayName: displayName
    });
    
    console.log('Profile updated with displayName:', displayName);
    return displayName;
  }
  
  console.log('Profile already has displayName:', profile.displayName);
  return profile.displayName;
}
