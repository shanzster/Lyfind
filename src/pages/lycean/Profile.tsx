import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, LogOut, Sparkles, Package, MessageSquare, Loader2, Edit, Camera, GraduationCap, X, Bookmark, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { itemService, Item } from '@/services/itemService';
import { bookmarkService } from '@/services/bookmarkService';
import { watchService, Watch } from '@/services/watchService';
import { userService } from '@/services/userService';
import { storageService } from '@/services/storageService';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { toast } from 'sonner';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  // const [userItems, setUserItems] = useState<any[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    studentId: '',
    department: '',
    yearLevel: '',
    phoneNumber: '',
  });
  const [stats, setStats] = useState({
    totalItems: 0,
    activeItems: 0,
    resolvedItems: 0
  });
  const [savedItems, setSavedItems] = useState<Item[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [watches, setWatches] = useState<Watch[]>([]);

  // PWA install prompt (browser fires beforeinstallprompt when installable)
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('LyFind installed! Find it on your home screen.');
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    watchService
      .getUserWatches(user.uid)
      .then(setWatches)
      .catch((error) => console.error('[Profile] Failed to load watches:', error));
  }, [user]);

  const handleDeleteWatch = async (watchId: string) => {
    try {
      await watchService.deleteWatch(watchId);
      setWatches((prev) => prev.filter((w) => w.id !== watchId));
      toast.success('Search alert removed');
    } catch (error) {
      console.error('[Profile] Failed to delete watch:', error);
      toast.error('Failed to remove alert');
    }
  };

  useEffect(() => {
    if (!user) return;
    bookmarkService
      .getBookmarkedItems(user.uid)
      .then(setSavedItems)
      .catch((error) => console.error('[Profile] Failed to load saved items:', error))
      .finally(() => setLoadingSaved(false));
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[Profile] Current user ID:', user.uid);
      console.log('[Profile] User email:', user.email);
      
      // Fix user profile if displayName is missing
      if (userProfile && (!userProfile.displayName || userProfile.displayName === '')) {
        const name = user.displayName || user.email?.split('@')[0] || 'User';
        await userService.fixUserProfile(user.uid, name);
        // Reload the page to get updated profile
        window.location.reload();
        return;
      }

      // Fetch user's items
      console.log('[Profile] Fetching items for user:', user.uid);
      const items = await itemService.getUserItems(user.uid);
      console.log('[Profile] Fetched user items:', items.length);
      console.log('[Profile] Items:', items);
      // setUserItems(items);

      // Calculate stats
      const activeItems = items.filter(item => item.status === 'active').length;
      const resolvedItems = items.filter(item => item.status === 'resolved').length;

      console.log('[Profile] Stats:', {
        totalItems: items.length,
        activeItems,
        resolvedItems
      });

      setStats({
        totalItems: items.length,
        activeItems,
        resolvedItems
      });
    } catch (error) {
      console.error('[Profile] Error loading user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const openEditModal = () => {
    setEditForm({
      displayName: userProfile?.displayName || '',
      studentId: userProfile?.studentId || '',
      department: userProfile?.department || '',
      yearLevel: userProfile?.yearLevel || '',
      phoneNumber: userProfile?.phoneNumber || '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editForm.displayName.trim()) {
      toast.error('Full name is required');
      return;
    }

    setSavingProfile(true);
    try {
      await userService.updateUserProfile(user.uid, {
        displayName: editForm.displayName.trim(),
        studentId: editForm.studentId.trim(),
        department: editForm.department.trim(),
        yearLevel: editForm.yearLevel,
        phoneNumber: editForm.phoneNumber.trim(),
      });
      toast.success('Profile updated!');
      setShowEditModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Upload to Cloudinary
      const photoURL = await storageService.uploadToCloudinary(file);

      // Update user profile in Firestore
      await userService.updateUserProfile(user.uid, { photoURL });

      toast.success('Profile picture updated!');
      
      // Reload page to show new photo
      window.location.reload();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link to="/browse" className="inline-flex items-center gap-2 text-primary hover:text-primary/80">
            <ArrowLeft className="h-4 w-4" />
            Back to Browse
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Account</h1>
          <p className="text-foreground/60">Manage your profile and access AI features</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/photo-match">
            <Card className="border-border bg-gradient-to-br from-primary/10 to-primary/5 p-6 hover:border-primary transition-all hover:shadow-lg cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Photo Matching AI
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">NEW</span>
                  </h3>
                  <p className="text-sm text-foreground/60">Find similar items with AI</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/my-items">
            <Card className="border-border bg-card p-6 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Package className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Items</h3>
                  <p className="text-sm text-foreground/60">{stats.totalItems} posts</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/messages">
            <Card className="border-border bg-card p-6 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-secondary/10">
                  <MessageSquare className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Messages</h3>
                  <p className="text-sm text-foreground/60">View conversations</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link to="/teacher-verification">
            <Card className="border-border bg-card p-6 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <GraduationCap className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Teacher Account
                    {(userProfile?.role === 'faculty' || userProfile?.teacherVerificationStatus === 'approved') && (
                      <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full">VERIFIED</span>
                    )}
                    {userProfile?.teacherVerificationStatus === 'pending' && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full">PENDING</span>
                    )}
                  </h3>
                  <p className="text-sm text-foreground/60">Verify your faculty ID</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Saved Items */}
        {!loadingSaved && savedItems.length > 0 && (
          <Card className="border-border bg-card p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bookmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Saved Items</h3>
                <p className="text-sm text-foreground/60">
                  {savedItems.length} item{savedItems.length !== 1 ? 's' : ''} you bookmarked
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {savedItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/item/${item.id}`}
                  className="group rounded-xl overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <div className="relative h-24 bg-background">
                    {item.photos?.[0] ? (
                      <img
                        src={item.photos[0]}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-foreground/20" />
                      </div>
                    )}
                    <span
                      className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${
                        item.type === 'lost' ? 'bg-red-500/90' : 'bg-green-500/90'
                      }`}
                    >
                      {item.type === 'lost' ? 'Lost' : 'Found'}
                    </span>
                  </div>
                  <p className="px-2 py-1.5 text-xs text-foreground truncate">{item.title}</p>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* PWA install banner */}
        {installPrompt && (
          <Card className="border-border bg-card p-4 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">📱</span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm">Install LyFind on your phone</p>
                <p className="text-foreground/60 text-xs">Full-screen app, right from your home screen</p>
              </div>
            </div>
            <Button onClick={handleInstall} size="sm" className="flex-shrink-0">
              Install
            </Button>
          </Card>
        )}

        {/* Search Alerts */}
        {watches.length > 0 && (
          <Card className="border-border bg-card p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 text-lg">🔔</div>
              <div>
                <h3 className="font-semibold text-foreground">Search Alerts</h3>
                <p className="text-sm text-foreground/60">
                  You'll be notified when new items match these searches
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {watches.map((watch) => (
                <div
                  key={watch.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">"{watch.keywords}"</p>
                    <p className="text-foreground/50 text-xs">
                      {watch.category ? `Category: ${watch.category}` : 'All categories'}
                    </p>
                  </div>
                  <button
                    onClick={() => watch.id && handleDeleteWatch(watch.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-foreground/40 hover:text-red-500 transition-all flex-shrink-0"
                    title="Remove alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Profile Info */}
        <Card className="border-border bg-card p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {userProfile?.photoURL ? (
                  <img 
                    src={userProfile.photoURL} 
                    alt={userProfile.displayName} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to UI Avatars if image fails to load
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=ff7400&color=fff&size=128`;
                    }}
                  />
                ) : (
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || 'User')}&background=ff7400&color=fff&size=128`}
                    alt={userProfile?.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {/* Upload Button Overlay */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all shadow-lg disabled:opacity-50"
                title="Change profile picture"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{userProfile?.displayName || 'User'}</h2>
              <p className="text-foreground/60">{user?.email}</p>
              {userProfile?.studentId && (
                <p className="text-sm text-foreground/40 mt-1">Student ID: {userProfile.studentId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-primary">{stats.totalItems}</p>
              <p className="text-sm text-foreground/60 mt-1">Items Posted</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-accent">{stats.activeItems}</p>
              <p className="text-sm text-foreground/60 mt-1">Active Items</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-background">
              <p className="text-3xl font-bold text-secondary">{stats.resolvedItems}</p>
              <p className="text-sm text-foreground/60 mt-1">Resolved</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <label className="text-sm font-medium text-foreground/60">Full Name</label>
              <p className="text-foreground mt-1">{userProfile?.displayName || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/60">Email</label>
              <p className="text-foreground mt-1">{user?.email}</p>
            </div>
            {userProfile?.studentId && (
              <div>
                <label className="text-sm font-medium text-foreground/60">Student ID</label>
                <p className="text-foreground mt-1">{userProfile.studentId}</p>
              </div>
            )}
            {userProfile?.department && (
              <div>
                <label className="text-sm font-medium text-foreground/60">Department</label>
                <p className="text-foreground mt-1">{userProfile.department}</p>
              </div>
            )}
            {userProfile?.yearLevel && (
              <div>
                <label className="text-sm font-medium text-foreground/60">Year Level</label>
                <p className="text-foreground mt-1">{userProfile.yearLevel}</p>
              </div>
            )}
            {userProfile?.phoneNumber && (
              <div>
                <label className="text-sm font-medium text-foreground/60">Phone Number</label>
                <p className="text-foreground mt-1">{userProfile.phoneNumber}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground/60">Member Since</label>
              <p className="text-foreground mt-1">{formatDate(userProfile?.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/60">Email Verified</label>
              <p className="text-foreground mt-1">
                {user?.emailVerified ? (
                  <span className="text-green-500">✓ Verified</span>
                ) : (
                  <span className="text-yellow-500">⚠ Not verified</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-border">
            <Button variant="outline" onClick={openEditModal}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </Card>

        {/* Push Notifications */}
        <div className="mt-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Notification Settings</h2>
          <PushNotificationPrompt compact />
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="border-border bg-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-foreground/60 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground/60">Full Name *</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/60">Student ID</label>
                <input
                  type="text"
                  value={editForm.studentId}
                  onChange={e => setEditForm({ ...editForm, studentId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/60">Department</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/60">Year Level</label>
                <select
                  value={editForm.yearLevel}
                  onChange={e => setEditForm({ ...editForm, yearLevel: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                  <option value="Faculty/Staff">Faculty/Staff</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground/60">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
                disabled={savingProfile}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
