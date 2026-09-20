import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, MapPin, Eye, Mail, Clock, X, Loader2, Image as ImageIcon, Flag, AlertTriangle, Bookmark } from 'lucide-react'
import LyceanSidebar from '@/components/lycean-sidebar'
import { itemService, Item } from '@/services/itemService'
import { bookmarkService } from '@/services/bookmarkService'
import { watchService } from '@/services/watchService'
import { announcementService, Announcement } from '@/services/announcementService'
import { userService } from '@/services/userService'
import { useAuth } from '@/contexts/AuthContext'
import { messageService } from '@/services/messageService'
import { reportService } from '@/services/reportService'
import { getFloorPlan } from '@/lib/floorPlans'
import { toast } from 'sonner'

const categories = ['All', 'Bags', 'Electronics', 'Jewelry', 'Accessories', 'Keys', 'Clothing', 'Books', 'Other']

// Helper function to format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'Unknown'
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  return date.toLocaleDateString()
}

export default function BrowsePage() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all')
  const [reunitedCount, setReunitedCount] = useState<number | null>(null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedItemForMap, setSelectedItemForMap] = useState<Item | null>(null)
  const [messagingItemId, setMessagingItemId] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedItemForReport, setSelectedItemForReport] = useState<Item | null>(null)
  const [reportCategory, setReportCategory] = useState<'inappropriate' | 'spam' | 'fraud' | 'duplicate' | 'other'>('spam')
  const [reportDescription, setReportDescription] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  // Teacher↔student messaging is blocked; this holds the contact info shown instead
  const [blockedContact, setBlockedContact] = useState<{ name: string; email: string } | null>(null)

  // Fetch items from Firestore
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true)
        const filters: any = { status: 'active' }
        
        if (selectedType !== 'All') {
          filters.type = selectedType.toLowerCase()
        }
        
        if (selectedCategory !== 'All') {
          filters.category = selectedCategory
        }
        
        console.log('[Browse] Fetching items with filters:', filters)
        const fetchedItems = await itemService.getAllItems(filters)
        console.log('[Browse] Fetched items:', fetchedItems.length)
        
        // Fetch user photos for items that don't have userPhotoURL
        const itemsWithPhotos = await Promise.all(
          fetchedItems.map(async (item) => {
            if (!item.userPhotoURL && item.userId) {
              try {
                const userProfile = await userService.getUserProfile(item.userId)
                return { ...item, userPhotoURL: userProfile?.photoURL }
              } catch (error) {
                console.error('[Browse] Error fetching user photo for', item.userId, error)
                return item
              }
            }
            return item
          })
        )
        
        if (itemsWithPhotos.length > 0) {
          console.log('[Browse] Sample item with photo:', {
            title: itemsWithPhotos[0].title,
            userPhotoURL: itemsWithPhotos[0].userPhotoURL,
            userName: itemsWithPhotos[0].userName
          })
        }
        setItems(itemsWithPhotos)
      } catch (error: any) {
        console.error('[Browse] Error fetching items:', error)
        console.error('[Browse] Error code:', error?.code)
        console.error('[Browse] Error message:', error?.message)
        toast.error(`Failed to load items: ${error?.message || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [selectedType, selectedCategory])

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!user) return
    bookmarkService
      .getBookmarkedItemIds(user.uid)
      .then(setBookmarkedIds)
      .catch((error) => console.error('[Browse] Failed to load bookmarks:', error))
  }, [user])

  const handleToggleBookmark = async (item: Item) => {
    if (!user) return
    // Optimistic update
    const wasBookmarked = bookmarkedIds.has(item.id!)
    setBookmarkedIds((prev) => {
      const next = new Set(prev)
      wasBookmarked ? next.delete(item.id!) : next.add(item.id!)
      return next
    })
    try {
      await bookmarkService.toggle(user.uid, item.id!)
      toast.success(wasBookmarked ? 'Removed from saved items' : 'Saved! Find it in your profile')
    } catch (error) {
      console.error('[Browse] Bookmark toggle failed:', error)
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        wasBookmarked ? next.add(item.id!) : next.delete(item.id!)
        return next
      })
      toast.error('Failed to update saved items')
    }
  }

  // Reunited counter (success stat)
  useEffect(() => {
    itemService
      .getResolvedCount()
      .then(setReunitedCount)
      .catch((error) => console.error('[Browse] Failed to load reunited count:', error))
  }, [])

  // Campus announcement banner (dismissed ids remembered per browser)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  useEffect(() => {
    announcementService
      .getLatestActive()
      .then((a) => {
        if (!a) return
        const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]')
        if (!dismissed.includes(a.id)) setAnnouncement(a)
      })
      .catch((error) => console.error('[Browse] Failed to load announcement:', error))
  }, [])

  const dismissAnnouncement = () => {
    if (!announcement?.id) return
    const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]')
    localStorage.setItem('dismissedAnnouncements', JSON.stringify([...dismissed, announcement.id]))
    setAnnouncement(null)
  }

  // Client-side search + date filtering and sorting
  const filteredItems = items
    .filter((item) => {
      if (dateRange !== 'all') {
        const days = dateRange === '7d' ? 7 : 30
        const cutoff = Date.now() - days * 86400000
        if ((item.createdAt?.toMillis() || 0) < cutoff) return false
      }
      if (searchQuery === '') return true
      const searchLower = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      )
    })
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime
    })

  const handleShowMap = (item: Item) => {
    setSelectedItemForMap(item)
    setShowMapModal(true)
  }

  const handleMessageOwner = async (item: Item) => {
    if (!user || !userProfile) {
      toast.error('Please log in to send messages')
      navigate('/login')
      return
    }

    if (item.userId === user.uid) {
      toast.error('You cannot message yourself')
      return
    }

    setMessagingItemId(item.id!)
    
    try {
      // Create or get conversation
      const conversationId = await messageService.createConversation(
        item.id!,
        item.title,
        item.photos?.[0] || '',
        item.type,
        item.userId,
        item.userName,
        user.uid,
        userProfile.displayName || user.displayName || 'User',
        userProfile.photoURL || user.photoURL || undefined,
        item.userPhotoURL
      )

      // Navigate to messages with the conversation ID
      navigate('/messages', { state: { conversationId } })
    } catch (error: any) {
      if (error?.code === 'teacher-student-blocked') {
        setBlockedContact({
          name: error.contactName || item.userName,
          email: error.contactEmail || item.userEmail,
        })
      } else {
        console.error('Error creating conversation:', error)
        toast.error('Failed to start conversation')
      }
    } finally {
      setMessagingItemId(null)
    }
  }

  const handleReportItem = async () => {
    if (!user || !userProfile) {
      toast.error('Please log in to report items')
      return
    }

    if (!selectedItemForReport) return

    if (!reportDescription.trim()) {
      toast.error('Please provide a description')
      return
    }

    setSubmittingReport(true)

    try {
      // Check if user already reported this item
      const hasReported = await reportService.hasUserReported(selectedItemForReport.id!, user.uid)
      
      if (hasReported) {
        toast.error('You have already reported this item')
        setShowReportModal(false)
        return
      }

      await reportService.createReport({
        itemId: selectedItemForReport.id!,
        itemTitle: selectedItemForReport.title,
        reportedBy: user.uid,
        reporterName: userProfile.displayName || user.displayName || 'User',
        reporterEmail: user.email!,
        reason: reportCategory,
        category: reportCategory,
        description: reportDescription.trim()
      })

      toast.success('Report submitted successfully')
      setShowReportModal(false)
      setSelectedItemForReport(null)
      setReportCategory('spam')
      setReportDescription('')
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Failed to submit report')
    } finally {
      setSubmittingReport(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <>
        <LyceanSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
          <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#ff7400] animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-lg">Loading items...</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <LyceanSidebar />
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-7xl mx-auto">
          {/* Campus Announcement Banner */}
          {announcement && (
            <div className="mb-6 p-4 rounded-2xl bg-[#ff7400]/15 border border-[#ff7400]/40 flex items-start gap-3">
              <span className="text-xl flex-shrink-0">📢</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm lg:text-base">{announcement.title}</p>
                <p className="text-white/70 text-xs lg:text-sm mt-0.5">{announcement.message}</p>
              </div>
              <button
                onClick={dismissAnnouncement}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all flex-shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 lg:mb-10">
            <h1 className="text-3xl lg:text-5xl font-normal text-white mb-2 lg:mb-3">
              Lost & Found
            </h1>
            <p className="text-white/50 text-sm lg:text-lg">Discover and reunite with lost items</p>
            {reunitedCount !== null && reunitedCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="text-lg">🎉</span>
                <span className="text-green-300 text-sm lg:text-base font-medium">
                  {reunitedCount} item{reunitedCount !== 1 ? 's' : ''} reunited with their owners
                </span>
              </div>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="mb-4 lg:mb-6 flex flex-col gap-3 lg:gap-4">
            {/* Search */}
            <div className="w-full">
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-white/40 group-focus-within:text-[#ff7400] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search for items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 lg:pl-12 pr-3 lg:pr-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-sm lg:text-base text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 focus:shadow-lg focus:shadow-[#ff7400]/10 transition-all"
                  />
                </div>
                {/* Saved-search alert: watch this query for new posts */}
                {searchQuery.trim().length >= 3 && (
                  <button
                    onClick={async () => {
                      if (!user) return
                      try {
                        await watchService.createWatch(user.uid, searchQuery, selectedCategory)
                        toast.success(`🔔 You'll be notified when items matching "${searchQuery}" are posted`)
                      } catch (error) {
                        console.error('[Browse] Failed to create watch:', error)
                        toast.error('Failed to save search alert')
                      }
                    }}
                    className="px-3 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl bg-[#ff7400]/20 border border-[#ff7400]/40 text-[#ff7400] text-sm lg:text-base font-medium hover:bg-[#ff7400]/30 transition-all whitespace-nowrap"
                    title="Get notified when a new item matches this search"
                  >
                    🔔 <span className="hidden sm:inline">Alert me</span>
                  </button>
                )}
              </div>
            </div>

            {/* Type Filter Pills - Centered */}
            <div className="flex flex-wrap justify-center gap-2 lg:gap-3">
              <button
                onClick={() => setSelectedType('All')}
                className={`px-8 lg:px-10 py-2.5 lg:py-4 rounded-xl lg:rounded-2xl text-sm lg:text-base font-medium transition-all ${
                  selectedType === 'All'
                    ? 'bg-[#ff7400] text-white shadow-lg shadow-[#ff7400]/30 scale-105'
                    : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:scale-105'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedType('Lost')}
                className={`px-8 lg:px-10 py-2.5 lg:py-4 rounded-xl lg:rounded-2xl text-sm lg:text-base font-medium transition-all ${
                  selectedType === 'Lost'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                    : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:scale-105'
                }`}
              >
                Lost
              </button>
              <button
                onClick={() => setSelectedType('Found')}
                className={`px-8 lg:px-10 py-2.5 lg:py-4 rounded-xl lg:rounded-2xl text-sm lg:text-base font-medium transition-all ${
                  selectedType === 'Found'
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                    : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:scale-105'
                }`}
              >
                Found
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="mb-6 lg:mb-8 flex [justify-content:safe_center] items-center gap-2 lg:gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-full text-xs lg:text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-white/15 text-white border border-white/30 shadow-lg scale-105'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80 hover:scale-105'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="mb-4 lg:mb-6 flex items-center justify-between">
            <p className="text-white/50 text-sm lg:text-base">
              <span className="text-white font-medium lg:text-lg">{filteredItems.length}</span> items found
            </p>
            <div className="flex items-center gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'all' | '7d' | '30d')}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs lg:text-sm focus:outline-none focus:border-[#ff7400]/50 [&>option]:bg-[#2f1632]"
              >
                <option value="all">Any time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs lg:text-sm focus:outline-none focus:border-[#ff7400]/50 [&>option]:bg-[#2f1632]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>

          {/* Items Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
              {filteredItems.map((item, index) => (
                <div
                  key={item.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl overflow-hidden hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-[#ff7400]/10 transition-all duration-300 group animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Image */}
                  <div className="relative h-32 lg:h-56 overflow-hidden">
                    {item.photos && item.photos.length > 0 ? (
                      <img
                        src={item.photos[0]}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2f1632] via-transparent to-transparent opacity-60"></div>
                    
                    {/* Type Badge */}
                    <div className={`absolute top-2 lg:top-4 left-2 lg:left-4 px-2 lg:px-4 py-1 lg:py-1.5 rounded-full text-[10px] lg:text-xs font-medium backdrop-blur-md shadow-lg ${
                      item.type === 'lost'
                        ? 'bg-red-500/90 text-white'
                        : 'bg-green-500/90 text-white'
                    }`}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </div>

                    {/* Guard Station badge */}
                    {item.heldAtGuardStation && (
                      <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-white text-[10px] lg:text-xs font-medium text-center shadow-lg">
                        🏢 Held at Guard Station
                      </div>
                    )}

                    {/* Bookmark Button */}
                    <button
                      onClick={() => handleToggleBookmark(item)}
                      className="absolute top-2 lg:top-4 right-2 lg:right-4 w-8 h-8 lg:w-9 lg:h-9 rounded-full backdrop-blur-md bg-black/30 border border-white/20 flex items-center justify-center hover:bg-black/50 hover:scale-110 transition-all"
                      title={bookmarkedIds.has(item.id!) ? 'Remove from saved' : 'Save item'}
                    >
                      <Bookmark
                        className={`w-4 h-4 transition-colors ${
                          bookmarkedIds.has(item.id!)
                            ? 'text-[#ff7400] fill-[#ff7400]'
                            : 'text-white/80'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3 lg:p-6">
                    {/* Title */}
                    <h3 className="text-sm lg:text-xl font-medium text-white mb-1 lg:mb-2 line-clamp-1 group-hover:text-[#ff7400] transition-colors">
                      {item.title}
                    </h3>

                    {/* Description - Hidden on mobile */}
                    <p className="hidden lg:block text-white/50 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Location & Time */}
                    <div className="space-y-1 lg:space-y-2 mb-3 lg:mb-5">
                      <div className="flex items-center gap-1.5 lg:gap-2 text-white/40 text-[10px] lg:text-sm">
                        <MapPin className="w-3 lg:w-4 h-3 lg:h-4 flex-shrink-0 text-[#ff7400]" />
                        <span className="line-clamp-1">{item.location.address || `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`}</span>
                      </div>
                      <div className="flex items-center gap-1.5 lg:gap-2 text-white/40 text-[10px] lg:text-sm">
                        <Clock className="w-3 lg:w-4 h-3 lg:h-4 flex-shrink-0 text-[#ff7400]" />
                        <span>{formatTimestamp(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* User Info & Actions */}
                    <div className="flex items-center justify-between pt-3 lg:pt-5 border-t border-white/10">
                      {/* User - Avatar only on mobile, full info on desktop */}
                      <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                        <img
                          src={item.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=ff7400&color=fff&size=128`}
                          alt={item.userName}
                          className="w-7 lg:w-10 h-7 lg:h-10 rounded-full bg-white/10 ring-1 lg:ring-2 ring-white/10 group-hover:ring-[#ff7400]/30 transition-all flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=ff7400&color=fff&size=128`;
                          }}
                        />
                        <div className="hidden lg:flex flex-col min-w-0">
                          <span className="text-white/80 text-sm font-medium truncate">{item.userName}</span>
                          <span className="text-white/30 text-xs">{item.category}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                        <Link
                          to={`/item/${item.id}`}
                          className="w-7 lg:w-10 h-7 lg:h-10 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-[#ff7400] hover:border-[#ff7400] hover:scale-110 transition-all group/btn"
                        >
                          <Eye className="w-3 lg:w-4 h-3 lg:h-4 text-white/60 group-hover/btn:text-white" />
                        </Link>
                        
                        <button className="w-7 lg:w-10 h-7 lg:h-10 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-[#ff7400] hover:border-[#ff7400] hover:scale-110 transition-all group/btn"
                          onClick={() => handleShowMap(item)}
                        >
                          <MapPin className="w-3 lg:w-4 h-3 lg:h-4 text-white/60 group-hover/btn:text-white" />
                        </button>
                        
                        <button 
                          onClick={() => handleMessageOwner(item)}
                          disabled={messagingItemId === item.id || item.userId === user?.uid}
                          className="w-7 lg:w-10 h-7 lg:h-10 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-[#ff7400] hover:border-[#ff7400] hover:scale-110 transition-all group/btn relative disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {messagingItemId === item.id ? (
                            <Loader2 className="w-3 lg:w-4 h-3 lg:h-4 text-white/60 animate-spin" />
                          ) : (
                            <Mail className="w-3 lg:w-4 h-3 lg:h-4 text-white/60 group-hover/btn:text-white" />
                          )}
                        </button>

                        <button 
                          onClick={() => {
                            setSelectedItemForReport(item)
                            setShowReportModal(true)
                          }}
                          disabled={item.userId === user?.uid}
                          className="w-7 lg:w-10 h-7 lg:h-10 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-red-500 hover:border-red-500 hover:scale-110 transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Flag className="w-3 lg:w-4 h-3 lg:h-4 text-white/60 group-hover/btn:text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-12 lg:p-16 text-center">
              <div className="w-16 lg:w-20 h-16 lg:h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <Search className="w-8 lg:w-10 h-8 lg:h-10 text-white/30" />
              </div>
              <p className="text-white/60 text-lg lg:text-xl mb-2">No items found</p>
              <p className="text-white/40 text-sm lg:text-base mb-4 lg:mb-6">Try adjusting your search or filters</p>
              <button 
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                  setSelectedType('All')
                }}
                className="px-5 lg:px-6 py-2.5 lg:py-3 bg-[#ff7400] text-white text-sm lg:text-base rounded-xl lg:rounded-2xl hover:bg-[#ff7400]/90 transition-all"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Map Modal */}
      {showMapModal && selectedItemForMap && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 lg:p-8 border-b border-white/10">
              <div className="flex-1">
                <h3 className="text-2xl lg:text-3xl font-medium text-white mb-2">Item Location</h3>
                <p className="text-white/60 text-sm lg:text-base">{selectedItemForMap.title}</p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all flex-shrink-0 ml-4"
              >
                <X className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </button>
            </div>

            {/* Map Content */}
            <div className="relative h-[400px] lg:h-[600px] bg-gradient-to-br from-[#2f1632] to-[#1a0d1c] overflow-hidden">
              {selectedItemForMap.floorPlanId && selectedItemForMap.locationX !== undefined && selectedItemForMap.locationY !== undefined ? (
                // Show floor plan with pinned location
                <div className="absolute inset-0">
                  <img
                    src={getFloorPlan(selectedItemForMap.floorPlanId)?.imageUrl || '/floor-plans/ground_floor.png'}
                    alt="Floor Plan"
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Pinned Location Marker */}
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 animate-bounce"
                    style={{
                      left: `${selectedItemForMap.locationX}%`,
                      top: `${selectedItemForMap.locationY}%`,
                    }}
                  >
                    <div className="relative">
                      {/* Pulsing ring */}
                      <div className="absolute inset-0 rounded-full bg-[#ff7400] animate-ping opacity-75"></div>
                      {/* Main marker */}
                      <div className="relative w-12 h-12 rounded-full bg-[#ff7400] border-4 border-white shadow-2xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Fallback if no floor plan location
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-4">
                    <div className="w-20 lg:w-24 h-20 lg:h-24 rounded-full bg-[#ff7400]/10 border border-[#ff7400]/20 flex items-center justify-center mx-auto mb-6">
                      <MapPin className="w-10 lg:w-12 h-10 lg:h-12 text-[#ff7400]" />
                    </div>
                    <h4 className="text-white text-xl lg:text-2xl font-medium mb-3">Location Not Available</h4>
                    <p className="text-white/50 text-base lg:text-lg mb-6">
                      {selectedItemForMap.location.address || 'No specific location pinned'}
                    </p>
                  </div>
                </div>
              )}

              {/* Location Info Overlay */}
              <div className="absolute bottom-6 lg:bottom-8 left-6 lg:left-8 right-6 lg:right-8 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl lg:rounded-3xl p-5 lg:p-8 shadow-2xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#ff7400] flex items-center justify-center flex-shrink-0 shadow-lg">
                    <MapPin className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-white font-medium text-lg lg:text-xl mb-2">
                      {selectedItemForMap.roomNumber || selectedItemForMap.location.address || 'Campus Location'}
                    </h5>
                    <p className="text-white/60 text-sm lg:text-base mb-3">
                      {selectedItemForMap.type === 'lost' ? 'Last seen at this location' : 'Found at this location'}
                    </p>
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimestamp(selectedItemForMap.createdAt)}</span>
                    </div>
                  </div>
                  <Link
                    to={`/item/${selectedItemForMap.id}`}
                    onClick={() => setShowMapModal(false)}
                    className="w-full lg:w-auto px-6 lg:px-8 py-3 lg:py-4 bg-[#ff7400] text-white rounded-xl lg:rounded-2xl text-sm lg:text-base font-medium hover:bg-[#ff7400]/90 transition-all shadow-lg shadow-[#ff7400]/30 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    View Details
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer with Item Preview */}
            <div className="p-6 lg:p-8 border-t border-white/10 bg-white/5">
              <div className="flex items-center gap-4">
                {selectedItemForMap.photos && selectedItemForMap.photos.length > 0 ? (
                  <img
                    src={selectedItemForMap.photos[0]}
                    alt={selectedItemForMap.title}
                    className="w-16 lg:w-20 h-16 lg:h-20 rounded-xl object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-16 lg:w-20 h-16 lg:h-20 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center ring-2 ring-white/10">
                    <ImageIcon className="w-8 h-8 text-white/20" />
                  </div>
                )}
                <div className="flex-1">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                    selectedItemForMap.type === 'lost'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {selectedItemForMap.type.charAt(0).toUpperCase() + selectedItemForMap.type.slice(1)}
                  </div>
                  <h6 className="text-white font-medium text-base lg:text-lg">{selectedItemForMap.title}</h6>
                  <p className="text-white/50 text-sm line-clamp-1">{selectedItemForMap.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher contact disclaimer (messaging blocked) */}
      {blockedContact && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-md w-full shadow-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
              🎓
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Messaging Not Available</h3>
            <p className="text-white/70 text-sm mb-4">
              Direct messaging between students and teachers is not allowed on LyFind.
              Please contact {blockedContact.name} through their school email instead:
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(blockedContact.email)
                toast.success('Email copied to clipboard!')
              }}
              className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              title="Click to copy"
            >
              <span className="text-[#ff7400] font-medium break-all">{blockedContact.email}</span>
              <span className="block text-white/40 text-xs mt-1">tap to copy</span>
            </button>
            <button
              onClick={() => setBlockedContact(null)}
              className="w-full px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedItemForReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 lg:p-8 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Flag className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-medium text-white">Report Post</h3>
                  <p className="text-white/60 text-sm">Help us keep the community safe</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setSelectedItemForReport(null)
                  setReportCategory('spam')
                  setReportDescription('')
                }}
                disabled={submittingReport}
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="p-6 lg:p-8 space-y-6 overflow-y-auto flex-1">
              {/* Item Preview */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                {selectedItemForReport.photos?.[0] ? (
                  <img
                    src={selectedItemForReport.photos[0]}
                    alt={selectedItemForReport.title}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{selectedItemForReport.title}</h4>
                  <p className="text-white/50 text-sm truncate">{selectedItemForReport.description}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-200/90 text-sm">
                  False reports may result in account suspension. Please only report genuine violations.
                </p>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-white/70 text-sm mb-3 font-medium">
                  Reason for Report
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'spam', label: 'Spam or Misleading', desc: 'Fake or irrelevant content' },
                    { value: 'fraud', label: 'Fraudulent Activity', desc: 'Scam or false claims' },
                    { value: 'inappropriate', label: 'Inappropriate Content', desc: 'Offensive or harmful' },
                    { value: 'duplicate', label: 'Duplicate Post', desc: 'Already posted' },
                    { value: 'other', label: 'Other', desc: 'Something else' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setReportCategory(option.value as any)}
                      disabled={submittingReport}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        reportCategory === option.value
                          ? 'bg-red-500/20 border-2 border-red-500'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium text-sm">{option.label}</p>
                          <p className="text-white/50 text-xs">{option.desc}</p>
                        </div>
                        {reportCategory === option.value && (
                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                  Additional Details
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Please provide more details about why you're reporting this post..."
                  disabled={submittingReport}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-red-500/50 transition-all resize-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 lg:p-8 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setSelectedItemForReport(null)
                  setReportCategory('spam')
                  setReportDescription('')
                }}
                disabled={submittingReport}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportItem}
                disabled={submittingReport || !reportDescription.trim()}
                className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingReport ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
