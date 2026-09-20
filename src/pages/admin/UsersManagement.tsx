import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, UserX, Ban, Mail, Calendar, Package, MessageSquare, AlertTriangle, UserPlus, Loader2 } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { adminService } from '@/services/adminService';
import { emailService } from '@/services/emailService';
import { toast } from 'sonner';

export default function UsersManagement() {
  const { adminProfile } = useAdminAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [banReason, setBanReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    email: '',
    displayName: '',
    studentId: '',
    department: '',
    yearLevel: '',
    phoneNumber: '',
    role: 'user' as 'user' | 'admin'
  });
  const [adminRole, setAdminRole] = useState<'super_admin'>('super_admin');
  const [createdPassword, setCreatedPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllUsers();
      
      // Fetch approved items count for each user
      const usersWithStats = await Promise.all(
        data.map(async (user) => {
          try {
            // Get only active/approved items for this user
            const userItems = await adminService.getAllItems({ 
              status: 'active'
            });
            const approvedItemsCount = userItems.filter(item => item.userId === user.uid).length;
            
            return {
              ...user,
              itemsPosted: approvedItemsCount
            };
          } catch (error) {
            console.error('Error fetching items for user:', user.uid, error);
            return {
              ...user,
              itemsPosted: 0
            };
          }
        })
      );
      
      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!adminProfile || !selectedUser || !suspendReason.trim()) {
      toast.error('Please provide a suspension reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.suspendUser(selectedUser.uid, adminProfile.uid, suspendReason, suspendDuration);
      toast.success('User suspended successfully');
      await loadUsers();
      setShowSuspendModal(false);
      setSelectedUser(null);
      setSuspendReason('');
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async () => {
    if (!adminProfile || !selectedUser || !banReason.trim()) {
      toast.error('Please provide a ban reason');
      return;
    }

    setActionLoading(true);
    try {
      await adminService.banUser(selectedUser.uid, adminProfile.uid, banReason);
      toast.success('User banned successfully');
      await loadUsers();
      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason('');
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!adminProfile) {
      toast.error('Admin profile not found');
      return;
    }

    // Validate required fields
    if (!createUserData.email || !createUserData.displayName) {
      toast.error('Email and display name are required');
      return;
    }

    // Validate email format
    if (!createUserData.email.toLowerCase().endsWith('@lsb.edu.ph')) {
      toast.error('Only @lsb.edu.ph email addresses are allowed');
      return;
    }

    setActionLoading(true);
    try {
      // Create user account
      const result = await adminService.createUserAccount(
        adminProfile.uid,
        createUserData,
        createUserData.role === 'admin' ? adminRole : undefined
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to create user account');
        setActionLoading(false);
        return;
      }

      // Send credentials email
      const emailResult = await emailService.sendAccountCredentials(
        createUserData.email,
        createUserData.displayName,
        result.password!,
        createUserData.role
      );

      if (emailResult.success) {
        toast.success(`${createUserData.role === 'admin' ? 'Admin' : 'User'} account created and credentials emailed!`);
        setCreatedPassword(result.password!);
        setShowCreateModal(false);
        setShowPasswordModal(true);
        
        // Reset form
        setCreateUserData({
          email: '',
          displayName: '',
          studentId: '',
          department: '',
          yearLevel: '',
          phoneNumber: '',
          role: 'user'
        });
        setAdminRole('super_admin');
        
        await loadUsers();
      } else {
        toast.warning('User created but email failed to send. Password: ' + result.password);
        setCreatedPassword(result.password!);
        setShowCreateModal(false);
        setShowPasswordModal(true);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user account');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'active') return matchesSearch && !user.suspended && !user.banned;
    if (filterStatus === 'suspended') return matchesSearch && user.suspended;
    if (filterStatus === 'banned') return matchesSearch && user.banned;
    
    return matchesSearch;
  });

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

  return (
    <>
      <AdminSidebar />
      
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12 bg-[#2f1632]">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Users Management
              </h1>
              <p className="text-white/60">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all shadow-lg hover:shadow-xl"
            >
              <UserPlus className="w-5 h-5" />
              Create User
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Stats</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.uid} 
                      onClick={() => navigate(`/admin/users/${user.uid}`)}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-white font-medium">
                                {user.displayName?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.displayName || 'Unknown'}</p>
                            <p className="text-xs text-white/60">{user.studentId || 'No ID'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-white/80">
                          <Mail className="w-4 h-4 text-white/40" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-white/80">
                          <Calendar className="w-4 h-4 text-white/40" />
                          <span className="text-sm">
                            {user.createdAt?.toDate().toLocaleDateString() || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.banned ? (
                          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                            Banned
                          </span>
                        ) : user.suspended ? (
                          <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4 text-sm text-white/60">
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            <span>{user.itemsPosted || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{user.messagesSent || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!user.suspended && !user.banned && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setShowSuspendModal(true);
                                }}
                                className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors"
                                title="Suspend User"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUser(user);
                                  setShowBanModal(true);
                                }}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Ban User"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No users found</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Suspend Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <UserX className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Suspend User</h3>
                <p className="text-sm text-white/60">{selectedUser.displayName}</p>
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
                  setSelectedUser(null);
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
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Ban User</h3>
                <p className="text-sm text-white/60">{selectedUser.displayName}</p>
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
                  setSelectedUser(null);
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-2xl w-full my-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#ff7400]/20 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-[#ff7400]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Create New User</h3>
                <p className="text-sm text-white/60">Account details will be emailed to the user</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Role Selection */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <label className="block text-white/70 text-sm mb-3">
                  Account Type <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateUserData({ ...createUserData, role: 'user' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      createUserData.role === 'user'
                        ? 'border-[#ff7400] bg-[#ff7400]/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">👤</div>
                      <div className="font-semibold text-white">Regular User</div>
                      <div className="text-xs text-white/60 mt-1">Student/Faculty</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateUserData({ ...createUserData, role: 'admin' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      createUserData.role === 'admin'
                        ? 'border-[#ff7400] bg-[#ff7400]/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">👑</div>
                      <div className="font-semibold text-white">Admin</div>
                      <div className="text-xs text-white/60 mt-1">System Administrator</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Admin Role Selection (only if admin is selected) */}
              {createUserData.role === 'admin' && (
                <div className="p-4 rounded-xl bg-[#ff7400]/10 border border-[#ff7400]/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">👑</div>
                    <div>
                      <p className="font-semibold text-white">Super Admin</p>
                      <p className="text-xs text-white/60">Full system access and control</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/60 mt-2">
                    🔓 Complete access to all features including user management, content moderation, system settings, and analytics
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={createUserData.email}
                    onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                    placeholder="student@lsb.edu.ph"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={createUserData.displayName}
                    onChange={(e) => setCreateUserData({ ...createUserData, displayName: e.target.value })}
                    placeholder="Juan Dela Cruz"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Student ID</label>
                  <input
                    type="text"
                    value={createUserData.studentId}
                    onChange={(e) => setCreateUserData({ ...createUserData, studentId: e.target.value })}
                    placeholder="2024-12345"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Department</label>
                  <input
                    type="text"
                    value={createUserData.department}
                    onChange={(e) => setCreateUserData({ ...createUserData, department: e.target.value })}
                    placeholder="Computer Science"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Year Level</label>
                  <select
                    value={createUserData.yearLevel}
                    onChange={(e) => setCreateUserData({ ...createUserData, yearLevel: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={createUserData.phoneNumber}
                    onChange={(e) => setCreateUserData({ ...createUserData, phoneNumber: e.target.value })}
                    placeholder="+63 912 345 6789"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#ff7400]/10 border border-[#ff7400]/20 mb-6">
              <p className="text-sm text-[#ff7400]">
                ℹ️ A temporary password will be generated and emailed to the user along with login instructions.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateUserData({
                    email: '',
                    displayName: '',
                    studentId: '',
                    department: '',
                    yearLevel: '',
                    phoneNumber: '',
                    role: 'user'
                  });
                  setAdminRole('super_admin');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={actionLoading || !createUserData.email || !createUserData.displayName}
                className="flex-1 px-4 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create & Email'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Display Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Mail className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Account Created!</h3>
                <p className="text-sm text-white/60">Credentials have been emailed</p>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-white/5 border border-white/10 mb-6">
              <p className="text-sm text-white/60 mb-3">Temporary Password:</p>
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#ff7400]/10 border border-[#ff7400]/30">
                <span className="text-2xl font-mono font-bold text-[#ff7400] tracking-wider">
                  {createdPassword}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdPassword);
                    toast.success('Password copied to clipboard');
                  }}
                  className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-6">
              <p className="text-sm text-green-200">
                ✅ The user will receive an email with their login credentials and instructions.
              </p>
            </div>

            <button
              onClick={() => {
                setShowPasswordModal(false);
                setCreatedPassword('');
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
