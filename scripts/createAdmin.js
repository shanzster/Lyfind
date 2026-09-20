/**
 * Admin Account Creation Script
 * 
 * This script helps you create an admin account in Firestore.
 * Run this after you've created a user account in Firebase Auth.
 * 
 * Usage:
 * 1. Create a user account via Firebase Auth Console or the app
 * 2. Get the user's UID from Firebase Auth
 * 3. Update the USER_UID variable below
 * 4. Run: node scripts/createAdmin.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvYOueHYtbbQm9NYNXQxzRhzOGkSWXDLw",
  authDomain: "lyfind-72845.firebaseapp.com",
  projectId: "lyfind-72845",
  storageBucket: "lyfind-72845.firebasestorage.app",
  messagingSenderId: "153935340746",
  appId: "1:153935340746:web:87ea7489649e48b3894033",
  measurementId: "G-JPED770NSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================
// CONFIGURE YOUR ADMIN ACCOUNT HERE
// ============================================

const ADMIN_CONFIG = {
  // STEP 1: Replace with your Firebase Auth UID
  USER_UID: 'YOUR_FIREBASE_AUTH_UID_HERE',
  
  // STEP 2: Set your admin details
  email: 'admin@lsb.edu.ph',
  displayName: 'Admin User',
  role: 'super_admin', // Options: 'super_admin', 'moderator', 'support'
  adminLevel: 'super', // Options: 'super', 'standard'
};

// Super Admin Permissions (Full Access)
const SUPER_ADMIN_PERMISSIONS = [
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

// Moderator Permissions
const MODERATOR_PERMISSIONS = [
  'users.view', 'users.suspend', 'users.ban',
  'items.view', 'items.edit', 'items.delete',
  'items.approve', 'items.reject', 'items.request_info',
  'reports.view', 'reports.handle',
  'messages.view', 'messages.delete',
  'analytics.view'
];

// Support Staff Permissions
const SUPPORT_PERMISSIONS = [
  'users.view',
  'items.view',
  'items.approve', 'items.request_info',
  'reports.view',
  'messages.view',
  'analytics.view'
];

// Get permissions based on role
function getPermissions(role) {
  switch (role) {
    case 'super_admin':
      return SUPER_ADMIN_PERMISSIONS;
    case 'moderator':
      return MODERATOR_PERMISSIONS;
    case 'support':
      return SUPPORT_PERMISSIONS;
    default:
      return [];
  }
}

// Create admin account
async function createAdminAccount() {
  try {
    console.log('🚀 Creating admin account...\n');

    // Validate configuration
    if (ADMIN_CONFIG.USER_UID === 'YOUR_FIREBASE_AUTH_UID_HERE') {
      console.error('❌ ERROR: Please update USER_UID in the script!');
      console.log('\nSteps to get your UID:');
      console.log('1. Go to Firebase Console > Authentication');
      console.log('2. Find your user account');
      console.log('3. Copy the UID');
      console.log('4. Update USER_UID in this script');
      process.exit(1);
    }

    // Prepare admin data
    const adminData = {
      email: ADMIN_CONFIG.email,
      displayName: ADMIN_CONFIG.displayName,
      role: ADMIN_CONFIG.role,
      adminLevel: ADMIN_CONFIG.adminLevel,
      permissions: getPermissions(ADMIN_CONFIG.role),
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now(),
      twoFactorEnabled: false,
      assignedBy: 'system',
      active: true
    };

    // Create admin document
    await setDoc(doc(db, 'admins', ADMIN_CONFIG.USER_UID), adminData);

    console.log('✅ Admin account created successfully!\n');
    console.log('📋 Account Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`UID:          ${ADMIN_CONFIG.USER_UID}`);
    console.log(`Email:        ${ADMIN_CONFIG.email}`);
    console.log(`Name:         ${ADMIN_CONFIG.displayName}`);
    console.log(`Role:         ${ADMIN_CONFIG.role}`);
    console.log(`Admin Level:  ${ADMIN_CONFIG.adminLevel}`);
    console.log(`Permissions:  ${adminData.permissions.length} permissions`);
    console.log(`Status:       Active`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎉 You can now login at: http://localhost:5173/admin/login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
}

// Run the script
createAdminAccount();
