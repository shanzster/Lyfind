import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Calendar, Package, MessageSquare, 
  Edit, Save, X, Key, UserX, Ban, Shield, AlertTriangle, Loader2
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminService } from '@/services/adminService';
import { messageService } from '@/services/messageService';
import { toast } from 'sonner';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  const [user, setUser] = useState<any>(null);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<any>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Messages modal state
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const generatePassword = () => {
    // Generate a secure random password (fallback if Cloud Function not available)
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    let password = '';
    
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  useEffect(() => {
    if (id) {
      loadUserDetails();
    }
  }, [id]);

  const loadUserDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Get user
      const userDoc = await getDoc(doc(db, 'users', id));
      if (!userDoc.exists()) {
        toast.error('User not found');
        navigate('/admin/users');
        return;
      }

      const userData = { uid: userDoc.id, ...userDoc.data() };
      setUser(userData);
      setEditedUser(userData);

      // Get user's items
      const itemsQuery = query(
        collection(db, 'items'),
        where('userId', '==', id)
      );
      const itemsSnap = await getDocs(itemsQuery);
      const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserItems(items);
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!id || !editedUser) return;

    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', id), {
        displayName: editedUser.displayName,
        studentId: editedUser.studentId,
        phoneNumber: editedUser.phoneNumber,
        updatedAt: new Date()
      });

      if (adminProfile) {
        await adminService.logAdminAction(
          adminProfile.uid,
          'update_user_profile',
          id,
          { changes: { displayName: editedUser.displayName, studentId: editedUser.studentId } }
        );
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
      await loadUserDetails();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user) return;

    // Check if user signed in with Google
    const isGoogleUser = user.providerData?.some((p: any) => p.providerId === 'google.com');
    
    if (isGoogleUser) {
      toast.error('Cannot reset password for Google sign-in users');
      return;
    }

    setActionLoading(true);
    try {
      // Call Cloud Function to reset password
      const functions = getFunctions();
      const resetPassword = httpsCallable(functions, 'resetUserPassword');
      
      const result = await resetPassword({ userId: user.uid });
      
      if (result.data && (result.data as any).success) {
        toast.success('Password reset successfully!');
        toast.info(`New password sent to ${(result.data as any).email}`);
        
        setShowPasswordModal(false);
      } else {
        throw new Error('Password reset failed');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      // Handle specific error cases
      if (error.code === 'functions/not-found') {
        toast.error('Cloud Function not deployed. Please deploy resetUserPassword function.');
        
        // Fallback: Generate password locally and show it
        const generatedPassword = generatePassword();
        toast.warning(`Generated password (not saved): ${generatedPassword}`);
        toast.info('Deploy Cloud Function to enable password reset');
        
        // Log the action anyway
        if (adminProfile) {
          await adminService.logAdminAction(
            adminProfile.uid,
            'reset_user_password_attempted',
            id!,
            { 
              note: 'Password reset attempted but Cloud Function not available',
              email: user.email
            }
          );
        }
      } else if (error.code === 'functions/permission-denied') {
        toast.error('You do not have permission to reset passwords');
      } else if (error.code === 'functions/failed-precondition') {
        toast.error(error.message || 'Cannot reset password for this user');
      } else {
        toast.error('Failed to reset password: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!adminProfile || !user || !suspendReason.trim()) {
      toast.error('Please provide a suspension reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.suspendUser(user.uid, adminProfile.uid, suspendReason, suspendDuration);
      toast.success('User suspended successfully');
      await loadUserDetails();
      setShowSuspendModal(false);
      setSuspendReason('');
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async () => {
    if (!adminProfile || !user || !banReason.trim()) {
      toast.error('Please provide a ban reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.banUser(user.uid, adminProfile.uid, banReason);
      toast.success('User banned successfully');
      await loadUserDetails();
      setShowBanModal(false);
      setBanReason('');
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewMessages = async () => {
    if (!id) return;

    setShowMessagesModal(true);
    setLoadingConversations(true);

    try {
      // Get all conversations where user is a participant
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', id),
        orderBy('updatedAt', 'desc')
      );
      
      const conversationsSnap = await getDocs(conversationsQuery);
      const conversations = conversationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setUserConversations(conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);

    try {
      const messages = await messageService.getConversationMessages(conversation.id);
      setConversationMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
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

  if (!user) {
    return (
      <>
        <AdminSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
          <div className="max-w-7xl mx-auto">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <User className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">User Not Found</h2>
              <button
                onClick={() => navigate('/admin/users')}
                className="mt-4 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8c00] text-white font-medium transition-all"
              >
                Back to Users
              </button>
            </div>
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
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Users
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  User Management
                </h1>
                <p className="text-white/60">View and manage user account</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleViewMessages}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-medium transition-all flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  View Messages
                </button>
                {!user.suspended && !user.banned && (
                  <>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium transition-all flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      Reset Password
                    </button>
                    <button
                      onClick={() => setShowSuspendModal(true)}
                      className="px-4 py-2 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-medium transition-all flex items-center gap-2"
                    >
                      <UserX className="w-4 h-4" />
                      Suspend
                    </button>
                    <button
                      onClick={() => setShowBanModal(true)}
                      className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-all flex items-center gap-2"
                    >
                      <Ban className="w-4 h-4" />
                      Ban
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Information */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Profile Information</h3>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedUser(user);
                        }}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile Photo */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-medium text-2xl">
                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{user.displayName || 'Unknown'}</p>
                    <p className="text-white/60 text-sm">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Display Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.displayName || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, displayName: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50"
                      />
                    ) : (
                      <p className="text-white">{user.displayName || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Email</label>
                    <div className="flex items-center gap-2 text-white">
                      <Mail className="w-4 h-4 text-white/60" />
                      <span>{user.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Student ID</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.studentId || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, studentId: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50"
                      />
                    ) : (
                      <p className="text-white">{user.studentId || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedUser.phoneNumber || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, phoneNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50"
                      />
                    ) : (
                      <p className="text-white">{user.phoneNumber || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-white/60 text-sm mb-2 block">Account Created</label>
                    <div className="flex items-center gap-2 text-white">
                      <Calendar className="w-4 h-4 text-white/60" />
                      <span>{user.createdAt?.toDate().toLocaleString() || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              {(user.suspended || user.banned) && (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Account Status</h3>
                  
                  {user.suspended && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <p className="text-yellow-400 font-semibold">Account Suspended</p>
                      </div>
                      <p className="text-white/80 text-sm mb-2">
                        <span className="text-white/60">Reason:</span> {user.suspensionReason || 'No reason provided'}
                      </p>
                      {user.suspendedUntil && (
                        <p className="text-white/80 text-sm">
                          <span className="text-white/60">Until:</span> {user.suspendedUntil.toDate().toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {user.banned && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Ban className="w-5 h-5 text-red-400" />
                        <p className="text-red-400 font-semibold">Account Banned</p>
                      </div>
                      <p className="text-white/80 text-sm">
                        <span className="text-white/60">Reason:</span> {user.banReason || 'No reason provided'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* User's Items */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Posted Items ({userItems.length})</h3>
                
                {userItems.length === 0 ? (
                  <p className="text-white/60 text-center py-8">No items posted yet</p>
                ) : (
                  <div className="space-y-3">
                    {userItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/admin/items/${item.id}`)}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className={`w-5 h-5 ${
                              item.type === 'lost' ? 'text-red-400' : 'text-green-400'
                            }`} />
                            <div>
                              <p className="text-white font-medium">{item.title}</p>
                              <p className="text-white/60 text-sm">{item.category}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-3 py-1 rounded-lg ${
                            item.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            item.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                            item.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Statistics */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <Package className="w-4 h-4" />
                      <span className="text-sm">Items Posted</span>
                    </div>
                    <span className="text-white font-semibold">{userItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm">Messages</span>
                    </div>
                    <span className="text-white font-semibold">{user.messagesSent || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/60">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Reports</span>
                    </div>
                    <span className="text-white font-semibold">{user.reportsAgainst || 0}</span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Metadata</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-white/60">User ID:</span>
                    <p className="text-white/80 font-mono break-all">{user.uid}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Email Verified:</span>
                    <p className="text-white/80">{user.emailVerified ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <span className="text-white/60">Last Login:</span>
                    <p className="text-white/80">
                      {user.lastLogin?.toDate().toLocaleString() || 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Key className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Reset Password</h3>
                <p className="text-sm text-white/60">{user.displayName}</p>
              </div>
            </div>

            {user.providerData?.some((p: any) => p.providerId === 'google.com') ? (
              <>
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
                  <p className="text-sm text-yellow-200">
                    ⚠️ This user signed in with Google. Password reset is not available for Google accounts.
                  </p>
                </div>

                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                  <p className="text-sm text-blue-200 mb-3">
                    ℹ️ A secure password will be automatically generated and emailed to the user.
                  </p>
                  <div className="space-y-2 text-xs text-blue-200/80">
                    <p>• Password will be 12 characters long</p>
                    <p>• Contains uppercase, lowercase, numbers, and symbols</p>
                    <p>• User will receive email with new password</p>
                    <p>• User can change password after logging in</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                  <p className="text-sm text-white/80 mb-2">
                    <span className="text-white/60">Email:</span> {user.email}
                  </p>
                  <p className="text-sm text-white/80">
                    <span className="text-white/60">User will be notified via email</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      // setNewPassword('');
                      // setConfirmPassword('');
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePassword}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
                  >
                    {actionLoading ? 'Generating...' : 'Generate & Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <UserX className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Suspend User</h3>
                <p className="text-sm text-white/60">{user.displayName}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/70 text-sm mb-2">Duration (days)</label>
                <input
                  type="number"
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(parseInt(e.target.value))}
                  min="1"
                  max="365"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">Reason</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-yellow-500/50 resize-none"
                  placeholder="Explain why this user is being suspended..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendReason('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionLoading || !suspendReason.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Suspending...' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Ban User</h3>
                <p className="text-sm text-white/60">{user.displayName}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
              <p className="text-sm text-red-200">
                ⚠️ This action is permanent. The user will not be able to access the platform.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Reason</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50 resize-none"
                placeholder="Explain why this user is being banned..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={actionLoading || !banReason.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Banning...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {showMessagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">User Messages</h3>
                  <p className="text-sm text-white/60">{user.displayName}'s conversations</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMessagesModal(false);
                  setUserConversations([]);
                  setSelectedConversation(null);
                  setConversationMessages([]);
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
              {/* Conversations List */}
              <div className="md:col-span-1 border-r border-white/10 pr-4 flex flex-col overflow-hidden">
                <h4 className="text-sm font-semibold text-white/70 mb-3">
                  Conversations ({userConversations.length})
                </h4>
                
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : userConversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-10 h-10 text-white/40 mx-auto mb-2" />
                    <p className="text-white/60 text-sm">No conversations</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                    {userConversations.map((conv) => {
                      const otherUserId = conv.participants.find((p: string) => p !== id);
                      return (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            selectedConversation?.id === conv.id
                              ? 'bg-purple-500/20 border border-purple-500/30'
                              : 'bg-white/5 hover:bg-white/10 border border-white/10'
                          }`}
                        >
                          <p className="text-white font-medium text-sm truncate">
                            {conv.participantNames?.[otherUserId] || 'Unknown User'}
                          </p>
                          <p className="text-white/60 text-xs truncate">
                            {conv.lastMessage || 'No messages'}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {conv.updatedAt?.toDate().toLocaleDateString()}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Messages Display */}
              <div className="md:col-span-2 flex flex-col overflow-hidden">
                {!selectedConversation ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 text-white/40 mx-auto mb-3" />
                      <p className="text-white/60">Select a conversation to view messages</p>
                    </div>
                  </div>
                ) : loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <>
                    <div className="mb-3 pb-3 border-b border-white/10">
                      <p className="text-white font-semibold">
                        {conversationMessages.length} message{conversationMessages.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-white/60 text-sm">
                        Conversation about: {selectedConversation.itemTitle}
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {conversationMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-white/60">No messages in this conversation</p>
                        </div>
                      ) : (
                        conversationMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-4 rounded-xl ${
                              message.senderId === id
                                ? 'bg-purple-500/10 border border-purple-500/30 ml-8'
                                : 'bg-white/5 border border-white/10 mr-8'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                                  <User className="w-3 h-3 text-white/60" />
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">
                                    {message.senderName || 'Unknown'}
                                    {message.senderId === id && (
                                      <span className="ml-2 text-xs text-purple-400">(This User)</span>
                                    )}
                                  </p>
                                  <p className="text-white/40 text-xs">
                                    {message.createdAt?.toDate().toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <p className="text-white/80 text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            {message.imageUrl && (
                              <div className="mt-3">
                                <img
                                  src={message.imageUrl}
                                  alt="Message attachment"
                                  className="max-w-xs rounded-lg border border-white/10"
                                />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowMessagesModal(false);
                  setUserConversations([]);
                  setSelectedConversation(null);
                  setConversationMessages([]);
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
