import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Eye, Archive, Loader2, Image as ImageIcon, Sparkles, CheckCircle, X } from 'lucide-react'
import LyceanSidebar from '@/components/lycean-sidebar'
import { itemService, Item } from '@/services/itemService'
import { getItemMatches, markMatchesViewed } from '@/services/autoMatchService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

type ItemMatch = { item: Item; score: number; matchId: string }

const categories = ['All', 'Bags', 'Electronics', 'Jewelry', 'Accessories', 'Keys', 'Clothing', 'Books', 'Other']
const statuses = ['All', 'Active', 'Resolved', 'Archived']
const sortOptions = ['Newest First', 'Oldest First', 'Title A-Z', 'Title Z-A']

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

export default function MyItemsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [sortBy, setSortBy] = useState('Newest First')
  const [itemMatches, setItemMatches] = useState<Record<string, ItemMatch[]>>({})
  const [matchesModalItem, setMatchesModalItem] = useState<Item | null>(null)

  const [staleItems, setStaleItems] = useState<Item[]>([])

  const handleRenewItem = async (item: Item) => {
    try {
      await itemService.renewItem(item.id!)
      setStaleItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success(`"${item.title}" renewed for another 30 days`)
    } catch (error) {
      console.error('[MyItems] Renew failed:', error)
      toast.error('Failed to renew item')
    }
  }

  const handleArchiveStale = async (item: Item) => {
    try {
      await itemService.archiveItem(item.id!)
      setStaleItems((prev) => prev.filter((i) => i.id !== item.id))
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'archived' as const } : i))
      )
      toast.success(`"${item.title}" archived`)
    } catch (error) {
      console.error('[MyItems] Archive failed:', error)
      toast.error('Failed to archive item')
    }
  }

  useEffect(() => {
    fetchMyItems()
  }, [user])

  const fetchMyItems = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log('[MyItems] Fetching items for user:', user.uid)
      const fetchedItems = await itemService.getUserItems(user.uid)
      console.log('[MyItems] Fetched items:', fetchedItems.length)
      setItems(fetchedItems)
      loadMatches(fetchedItems)
      // Lifecycle: surface items older than 30 days for renew/archive
      setStaleItems(
        fetchedItems.filter(
          (i) => i.status === 'active' && itemService.itemAgeMs(i) > 30 * 86400000
        )
      )
    } catch (error: any) {
      console.error('[MyItems] Error fetching items:', error)
      toast.error('Failed to load your items')
    } finally {
      setLoading(false)
    }
  }

  // Load auto-match results for each active item (in the background)
  const loadMatches = async (fetchedItems: Item[]) => {
    const activeItems = fetchedItems.filter(i => i.status === 'active' && i.id)
    const results: Record<string, ItemMatch[]> = {}
    await Promise.all(
      activeItems.map(async item => {
        try {
          const matches = await getItemMatches(item.id!, item.type)
          if (matches.length > 0) {
            results[item.id!] = matches
          }
        } catch (error) {
          console.error('[MyItems] Failed to load matches for', item.id, error)
        }
      })
    )
    setItemMatches(results)
  }

  const openMatchesModal = (item: Item) => {
    setMatchesModalItem(item)
    const matches = itemMatches[item.id!] || []
    // Mark as viewed for this side (owner of a lost item views the lost side)
    markMatchesViewed(matches.map(m => m.matchId), item.type)
  }

  const handleMarkResolved = async (itemId: string) => {
    if (!window.confirm('Mark this item as resolved? This means it has been returned to its owner.')) {
      return
    }
    try {
      await itemService.updateItem(itemId, { status: 'resolved' })
      toast.success('Item marked as resolved!')
      fetchMyItems()
    } catch (error) {
      console.error('[MyItems] Error resolving item:', error)
      toast.error('Failed to mark item as resolved')
    }
  }

  const matchScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400'
    if (score >= 55) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const handleArchiveItem = async (itemId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'archived') {
        // Unarchive - set back to active
        await itemService.updateItem(itemId, { status: 'active' })
        toast.success('Item unarchived!')
      } else {
        // Archive the item
        await itemService.updateItem(itemId, { status: 'archived' })
        toast.success('Item archived!')
      }
      // Refresh the list
      fetchMyItems()
    } catch (error) {
      console.error('[MyItems] Error archiving item:', error)
      toast.error('Failed to archive item')
    }
  }

  // Filter and sort items
  const filteredAndSortedItems = items
    .filter((item) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        if (!item.title.toLowerCase().includes(searchLower) && 
            !item.description.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false
      }

      // Status filter
      if (selectedStatus !== 'All' && item.status !== selectedStatus.toLowerCase()) {
        return false
      }

      // Type filter
      if (selectedType !== 'All' && item.type !== selectedType.toLowerCase()) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'Newest First':
          return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
        case 'Oldest First':
          return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)
        case 'Title A-Z':
          return a.title.localeCompare(b.title)
        case 'Title Z-A':
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <>
        <LyceanSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
          <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#ff7400] animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-lg">Loading your items...</p>
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
          {/* Header */}
          <div className="mb-6 lg:mb-10">
            <Link 
              to="/profile"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors group"
            >
              <ArrowLeft className="w-4 lg:w-5 h-4 lg:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm lg:text-base font-medium">Back to Profile</span>
            </Link>
            <h1 className="text-3xl lg:text-5xl font-medium text-white mb-3">My Items</h1>
            <p className="text-white/60 text-base lg:text-lg">Manage all your posted items</p>
          </div>

          {/* Stale item renewal prompts (30+ days old) */}
          {staleItems.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-yellow-200 font-semibold mb-3">
                ⏳ Still looking? These posts are over 30 days old — renew them or archive
                them to keep Browse fresh. Unrenewed posts are archived after 45 days.
              </p>
              <div className="space-y-2">
                {staleItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    {item.photos?.[0] ? (
                      <img src={item.photos[0]} alt={item.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex-shrink-0" />
                    )}
                    <p className="text-white text-sm font-medium flex-1 min-w-0 truncate">{item.title}</p>
                    <button
                      onClick={() => handleRenewItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#ff7400] hover:bg-[#ff8500] text-white text-xs font-medium transition-all flex-shrink-0"
                    >
                      Renew
                    </button>
                    <button
                      onClick={() => handleArchiveStale(item)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium transition-all flex-shrink-0"
                    >
                      Archive
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-white/40 group-focus-within:text-[#ff7400] transition-colors" />
              <input
                type="text"
                placeholder="Search your items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 lg:pl-12 pr-3 lg:pr-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-sm lg:text-base text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap justify-center gap-2 lg:gap-3">
              <button
                onClick={() => setSelectedType('All')}
                className={`px-6 lg:px-8 py-2 lg:py-3 rounded-xl lg:rounded-2xl text-sm lg:text-base font-medium transition-all ${
                  selectedType === 'All'
                    ? 'bg-[#ff7400] text-white shadow-lg shadow-[#ff7400]/30'
                    : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedType('Lost')}
                className={`px-6 lg:px-8 py-2 lg:py-3 rounded-xl lg:rounded-2xl text-sm lg:text-base font-medium transition-all ${
                  selectedType === 'Lost'
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                Lost
              </button>
              <button
                onClick={() => setSelectedType('Found')}
                className={`px-6 lg:px-8 py-2 lg:py-3 rounded-xl lg:rounded-2xl text-sm lg:text-base font-medium transition-all ${
                  selectedType === 'Found'
                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : 'backdrop-blur-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                Found
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex [justify-content:safe_center] items-center gap-2 lg:gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-full text-xs lg:text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-white/15 text-white border border-white/30 shadow-lg'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Status & Sort */}
            <div className="flex gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex-1 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
              >
                {statuses.map((status) => (
                  <option key={status} value={status} className="bg-[#2f1632]">
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-4 py-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#2f1632]">
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 lg:mb-6">
            <p className="text-white/50 text-sm lg:text-base">
              <span className="text-white font-medium lg:text-lg">{filteredAndSortedItems.length}</span> items found
            </p>
          </div>

          {/* Items Grid */}
          {filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {filteredAndSortedItems.map((item) => (
                <div
                  key={item.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl overflow-hidden hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-[#ff7400]/10 transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="relative h-48 lg:h-56 overflow-hidden">
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
                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md shadow-lg ${
                      item.type === 'lost'
                        ? 'bg-red-500/90 text-white'
                        : 'bg-green-500/90 text-white'
                    }`}>
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </div>

                    {/* Status Badge */}
                    <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md shadow-lg ${
                      item.status === 'active'
                        ? 'bg-blue-500/90 text-white'
                        : item.status === 'resolved'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-gray-500/90 text-white'
                    }`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 lg:p-6">
                    <h3 className="text-lg lg:text-xl font-medium text-white mb-2 line-clamp-1 group-hover:text-[#ff7400] transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-white/50 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between text-white/40 text-xs mb-4">
                      <span>{item.category}</span>
                      <span>{formatTimestamp(item.createdAt)}</span>
                    </div>

                    {/* Auto-match results */}
                    {item.id && itemMatches[item.id] && itemMatches[item.id].length > 0 && (
                      <button
                        onClick={() => openMatchesModal(item)}
                        className="w-full mb-3 px-4 py-2 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-xl text-sm font-medium hover:bg-orange-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {itemMatches[item.id].length} possible {itemMatches[item.id].length === 1 ? 'match' : 'matches'} found
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        to={`/item/${item.id}`}
                        className="flex-1 px-4 py-2 bg-[#ff7400] text-white rounded-xl text-sm font-medium hover:bg-[#ff7400]/90 transition-all flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                      {item.status === 'active' && (
                        <button
                          onClick={() => handleMarkResolved(item.id!)}
                          className="px-4 py-2 backdrop-blur-xl bg-green-500/20 border border-green-500/30 text-green-300 rounded-xl hover:bg-green-500/30 transition-all"
                          title="Mark as Resolved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleArchiveItem(item.id!, item.status)}
                        className={`px-4 py-2 backdrop-blur-xl rounded-xl hover:bg-white/20 transition-all ${
                          item.status === 'archived'
                            ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                            : 'bg-white/10 border border-white/20 text-white'
                        }`}
                        title={item.status === 'archived' ? 'Unarchive' : 'Archive'}
                      >
                        <Archive className="w-4 h-4" />
                      </button>
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
              <p className="text-white/40 text-sm lg:text-base mb-4 lg:mb-6">Try adjusting your filters</p>
              <button 
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                  setSelectedStatus('All')
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

      {/* Matches Modal */}
      {matchesModalItem && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setMatchesModalItem(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-[#2f1632] border border-white/10 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <h2 className="text-xl font-bold text-white">Possible Matches</h2>
              </div>
              <button
                onClick={() => setMatchesModalItem(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Items that look similar to "{matchesModalItem.title}"
            </p>

            <div className="space-y-3">
              {(itemMatches[matchesModalItem.id!] || []).map(match => (
                <Link
                  key={match.matchId}
                  to={`/item/${match.item.id}`}
                  className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                    {match.item.photos && match.item.photos.length > 0 ? (
                      <img
                        src={match.item.photos[0]}
                        alt={match.item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{match.item.title}</h3>
                    <p className="text-white/50 text-xs mt-0.5">{match.item.category}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          match.item.type === 'lost'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {match.item.type === 'lost' ? 'Lost' : 'Found'}
                      </span>
                      <span className={`text-xs font-bold ${matchScoreColor(match.score)}`}>
                        {Math.round(match.score)}% match
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
