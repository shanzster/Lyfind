import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Share2, MessageCircle, CheckCircle, Loader2, Image as ImageIcon, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import LyceanSidebar from '@/components/lycean-sidebar'
import { itemService, Item } from '@/services/itemService'
import { userService } from '@/services/userService'
import { messageService } from '@/services/messageService'
import { useAuth } from '@/contexts/AuthContext'
import { getFloorPlan } from '@/lib/floorPlans'
import { toast } from 'sonner'

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

export default function ItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [resolvingItem, setResolvingItem] = useState(false)
  const [generatingPoster, setGeneratingPoster] = useState(false)
  // Teacher↔student messaging is blocked; this holds the contact info shown instead
  const [blockedContact, setBlockedContact] = useState<{ name: string; email: string } | null>(null)

  const handleMarkResolved = async () => {
    if (!item?.id || resolvingItem) return
    setResolvingItem(true)
    try {
      await itemService.updateItem(item.id, { status: 'resolved' })
      if (item.userId) {
        await userService.incrementItemsResolved(item.userId).catch(() => {})
      }
      setItem({ ...item, status: 'resolved' })
      toast.success('Item marked as resolved!')
    } catch (error) {
      console.error('[Item] Error resolving item:', error)
      toast.error('Failed to mark item as resolved')
    } finally {
      setResolvingItem(false)
    }
  }

  // Printable "scan to claim" poster with a QR code to the public item page
  const handleGeneratePoster = async () => {
    if (!item || generatingPoster) return
    setGeneratingPoster(true)
    try {
      const publicUrl = `${window.location.origin}/public/item/${item.id}`
      const qrDataUrl = await QRCode.toDataURL(publicUrl, { width: 400, margin: 2 })
      const posterWindow = window.open('', '_blank')
      if (!posterWindow) {
        toast.error('Please allow pop-ups to generate the poster')
        return
      }
      const typeLabel = item.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'
      const origin = window.location.origin
      const marks = (item as any).detailedDescription || item.description || '—'
      const whereLabel = item.type === 'lost' ? 'Where it was lost' : 'Where it was found'
      const whereValue = [item.location.address, item.roomNumber].filter(Boolean).join(' · ') || 'Lyceum of Subic Bay campus'
      const dateValue = item.createdAt?.toDate().toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) || ''
      posterWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>LyFind Poster — ${item.title}</title>
  <style>
    @font-face { font-family: 'Benzin'; src: url('${origin}/fonts/Benzin-Semibold.ttf'); font-weight: 600; }
    @font-face { font-family: 'Benzin'; src: url('${origin}/fonts/Benzin-Medium.ttf'); font-weight: 500; }
    @font-face { font-family: 'Movatif'; src: url('${origin}/fonts/movatif-regular.otf'); font-weight: 400; }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 0; }
    body {
      font-family: 'Movatif', -apple-system, 'Segoe UI', sans-serif;
      background: #fff; color: #111;
      display: flex; justify-content: center; padding: 24px;
    }
    .poster { width: 210mm; height: 297mm; padding: 14mm 18mm; text-align: center; overflow: hidden; }

    .brand { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 6px; }
    .brand img { width: 40px; height: 40px; object-fit: contain; }
    .brand-name { font-family: 'Benzin'; font-weight: 600; font-size: 22px; letter-spacing: 1px; }
    .brand-sub { font-size: 10px; letter-spacing: 4px; color: #999; text-transform: uppercase; margin-bottom: 18px; }

    .type { font-family: 'Benzin'; font-weight: 600; font-size: 28px; letter-spacing: 10px; padding-left: 10px; margin-bottom: 20px; }

    .photo { max-width: 80%; max-height: 230px; object-fit: contain; margin: 0 auto 22px; display: block; border: 1px solid #e5e5e5; border-radius: 8px; }
    .photo-placeholder { width: 60%; height: 180px; margin: 0 auto 22px; border: 1px dashed #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 14px; letter-spacing: 2px; }

    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 44px; text-align: left; max-width: 620px; margin: 0 auto 22px; }
    .col { border-top: 2px solid #111; padding-top: 14px; }
    .label { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #999; margin-bottom: 3px; }
    .value { font-size: 15px; color: #111; margin-bottom: 13px; line-height: 1.4; }
    .value.title { font-family: 'Benzin'; font-weight: 500; font-size: 18px; }

    .qr-section { border-top: 1px solid #e5e5e5; padding-top: 20px; }
    .scan { font-family: 'Benzin'; font-weight: 500; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px; }
    .qr { width: 150px; height: 150px; display: block; margin: 0 auto 8px; }
    .hint { font-size: 11px; color: #999; }

    .footer { margin-top: 18px; font-size: 10px; letter-spacing: 2px; color: #bbb; text-transform: uppercase; }

    @media print {
      body { padding: 0; display: block; }
      .poster { width: 100%; height: 100vh; page-break-inside: avoid; page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="poster">
    <div class="brand">
      <img src="${origin}/Untitled%20design%20(3).png" alt="LyFind" />
      <span class="brand-name">LyFind</span>
    </div>
    <div class="brand-sub">Campus Lost &amp; Found</div>

    <div class="type">${typeLabel}</div>

    ${item.photos?.[0]
      ? `<img class="photo" src="${item.photos[0]}" />`
      : `<div class="photo-placeholder">NO PHOTO AVAILABLE</div>`}

    <div class="cols">
      <div class="col">
        <div class="label">Item</div>
        <div class="value title">${item.title}</div>
        <div class="label">Category</div>
        <div class="value">${item.category}</div>
        <div class="label">Distinguishing marks</div>
        <div class="value">${marks}</div>
      </div>
      <div class="col">
        <div class="label">${whereLabel}</div>
        <div class="value">${whereValue}</div>
        <div class="label">Date</div>
        <div class="value">${dateValue}</div>
      </div>
    </div>

    <div class="qr-section">
      <div class="scan">Scan to view &amp; claim</div>
      <img class="qr" src="${qrDataUrl}" />
      <div class="hint">Open your phone camera and point it at the code</div>
    </div>

    <div class="footer">LyFind · Lyceum of Subic Bay</div>
  </div>
  <script>
    Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      ...Array.from(document.images).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; }))
    ]).then(() => setTimeout(() => window.print(), 400));
  </script>
</body>
</html>`)
      posterWindow.document.close()
    } catch (error) {
      console.error('[Item] Error generating poster:', error)
      toast.error('Failed to generate poster')
    } finally {
      setGeneratingPoster(false)
    }
  }

  // Get the return path from location state
  const returnPath = (location.state as any)?.from || '/browse';

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      if (!id) {
        toast.error('Invalid item ID')
        navigate('/browse')
        return
      }

      try {
        setLoading(true)
        console.log('[Item] Fetching item:', id)
        const fetchedItem = await itemService.getItemById(id)
        
        if (!fetchedItem) {
          toast.error('Item not found')
          navigate('/browse')
          return
        }

        // Fetch user photo if not available
        if (!fetchedItem.userPhotoURL && fetchedItem.userId) {
          try {
            const userProfile = await userService.getUserProfile(fetchedItem.userId)
            fetchedItem.userPhotoURL = userProfile?.photoURL
          } catch (error) {
            console.error('[Item] Error fetching user photo:', error)
          }
        }

        console.log('[Item] Item loaded:', fetchedItem)
        setItem(fetchedItem)
      } catch (error: any) {
        console.error('[Item] Error fetching item:', error)
        toast.error('Failed to load item')
        navigate('/browse')
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id, navigate])

  const handleSendMessage = async () => {
    if (!user || !item) return

    setCreatingConversation(true)
    try {
      // Get item owner's profile
      const ownerProfile = await userService.getUserProfile(item.userId)
      
      if (!ownerProfile) {
        toast.error('Could not find item owner')
        return
      }

      // Create or get conversation
      const conversationId = await messageService.createConversation(
        item.id!,
        item.title,
        item.photos?.[0] || '/placeholder.svg',
        item.type,
        item.userId,
        ownerProfile.displayName,
        user.uid,
        user.displayName || 'User',
        user.photoURL || undefined,
        ownerProfile.photoURL || undefined
      )

      // Navigate to messages page
      navigate('/messages', { state: { conversationId } })
      toast.success('Conversation started!')
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
      setCreatingConversation(false)
    }
  }

  if (loading) {
    return (
      <>
        <LyceanSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
          <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-[#ff7400] animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-lg">Loading item...</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  if (!item) {
    return null
  }

  return (
    <>
      <LyceanSidebar />
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Back Button */}
          <Link 
            to={returnPath}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 lg:mb-10 transition-colors group"
          >
            <ArrowLeft className="w-4 lg:w-5 h-4 lg:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm lg:text-base font-medium">
              {returnPath === '/photo-match' ? 'Back to Photo Match' : 'Back to Browse'}
            </span>
          </Link>

          <div className="grid lg:grid-cols-[1fr,1fr] gap-6 lg:gap-10 xl:gap-12">
            {/* Left Column - Images & Map */}
            <div className="space-y-6 lg:space-y-8">
              {/* Images Section */}
              <div className="space-y-4 lg:space-y-6">
                {/* Main Image */}
                <div className="relative aspect-[4/3] rounded-2xl lg:rounded-3xl overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl">
                  {item.photos && item.photos.length > 0 ? (
                    <img
                      src={item.photos[selectedImage]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                      <ImageIcon className="w-24 h-24 text-white/20" />
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className={`absolute top-4 lg:top-6 left-4 lg:left-6 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full text-sm lg:text-base font-medium backdrop-blur-md shadow-lg ${
                    item.type === 'lost'
                      ? 'bg-red-500/90 text-white'
                      : 'bg-green-500/90 text-white'
                  }`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-4 lg:top-6 right-4 lg:right-6 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full text-sm lg:text-base font-medium backdrop-blur-md shadow-lg bg-green-500/90 text-white">
                    {item.status === 'active' ? 'Active' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </div>
                </div>

                {/* Thumbnail Images */}
                {item.photos && item.photos.length > 1 && (
                  <div className="grid grid-cols-4 gap-3 lg:gap-4">
                    {item.photos.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`aspect-square rounded-xl lg:rounded-2xl overflow-hidden backdrop-blur-xl border-2 transition-all ${
                          selectedImage === index
                            ? 'border-[#ff7400] shadow-lg shadow-[#ff7400]/30'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img
                          src={photo}
                          alt={`${item.title} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Map Section */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl">
                <h3 className="text-white font-medium text-lg lg:text-xl mb-4 lg:mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#ff7400]" />
                  Location
                </h3>
                <div className="aspect-video rounded-xl lg:rounded-2xl overflow-hidden bg-gradient-to-br from-[#2f1632] to-[#1a0d1c] relative">
                  {item.floorPlanId && item.locationX !== undefined && item.locationY !== undefined ? (
                    // Show floor plan with pinned location
                    <>
                      <img
                        src={getFloorPlan(item.floorPlanId)?.imageUrl || '/floor-plans/ground_floor.png'}
                        alt="Floor Plan"
                        className="w-full h-full object-contain"
                      />
                      
                      {/* Pinned Location Marker */}
                      <div
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 animate-bounce"
                        style={{
                          left: `${item.locationX}%`,
                          top: `${item.locationY}%`,
                        }}
                      >
                        <div className="relative">
                          {/* Pulsing ring */}
                          <div className="absolute inset-0 rounded-full bg-[#ff7400] animate-ping opacity-75"></div>
                          {/* Main marker */}
                          <div className="relative w-10 h-10 rounded-full bg-[#ff7400] border-4 border-white shadow-2xl flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Room label overlay */}
                      {item.roomNumber && (
                        <div className="absolute bottom-4 left-4 right-4 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-3">
                          <p className="text-white font-medium text-sm">{item.roomNumber}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    // Fallback if no floor plan location
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-[#ff7400] mx-auto mb-3" />
                        <p className="text-white font-medium text-lg">{item.location.address || 'Campus Location'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6 lg:space-y-8">
              {/* Title & Category */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl lg:text-4xl font-medium text-white mb-3">{item.title}</h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm text-white/80">
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1.5 text-white/50 text-sm">
                        <Clock className="w-4 h-4" />
                        {formatTimestamp(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-white font-medium text-lg mb-3">Description</h3>
                  <p className="text-white/70 leading-relaxed">{item.description}</p>
                </div>
              </div>

              {/* User Info */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl">
                <h3 className="text-white font-medium text-lg mb-4">Posted By</h3>
                <div className="flex items-center gap-4">
                  {item.userPhotoURL ? (
                    <img
                      src={item.userPhotoURL}
                      alt={item.userName}
                      className="w-16 h-16 rounded-full bg-white/10 ring-2 ring-white/20 object-cover"
                      onError={(e) => {
                        // Fallback to UI Avatars if image fails to load
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=ff7400&color=fff&size=128`;
                      }}
                    />
                  ) : (
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=ff7400&color=fff&size=128`}
                      alt={item.userName}
                      className="w-16 h-16 rounded-full bg-white/10 ring-2 ring-white/20 object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-lg flex items-center gap-2 flex-wrap">
                      {item.userName}
                      {item.postedByFaculty && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium">
                          Verified Teacher
                        </span>
                      )}
                    </h4>
                    <p className="text-white/50 text-sm">{item.userEmail}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  {user && user.uid !== item.userId ? (
                    <button
                      onClick={handleSendMessage}
                      disabled={creatingConversation}
                      className="w-full px-6 py-4 bg-[#ff7400] text-white rounded-2xl font-medium hover:bg-[#ff7400]/90 transition-all shadow-lg shadow-[#ff7400]/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingConversation ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Starting conversation...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-5 h-5" />
                          Message Owner
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      {item.status === 'active' && (
                        <button
                          onClick={handleMarkResolved}
                          disabled={resolvingItem}
                          className="w-full px-6 py-4 bg-green-500 text-white rounded-2xl font-medium hover:bg-green-500/90 transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {resolvingItem ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                          {resolvingItem ? 'Resolving...' : 'Mark as Resolved'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const publicUrl = `${window.location.origin}/public/item/${item.id}`
                          navigator.clipboard.writeText(publicUrl)
                          toast.success('Public link copied to clipboard!')
                        }}
                        className="w-full px-6 py-4 backdrop-blur-xl bg-white/10 border border-white/20 text-white rounded-2xl font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-5 h-5" />
                        Share Item
                      </button>
                      <button
                        onClick={handleGeneratePoster}
                        disabled={generatingPoster}
                        className="w-full px-6 py-4 backdrop-blur-xl bg-white/10 border border-white/20 text-white rounded-2xl font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {generatingPoster ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <QrCode className="w-5 h-5" />
                        )}
                        Print QR Poster
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Guard Station notice */}
              {item.heldAtGuardStation && (
                <div className="p-5 rounded-2xl bg-blue-600/15 border border-blue-500/30">
                  <p className="text-blue-300 font-semibold mb-1">🏢 Held at Guard Station</p>
                  <p className="text-white/70 text-sm">
                    This item was turned in to campus security. To claim it, visit the
                    Guard Station / SSO office with your student ID — no meetup needed.
                  </p>
                </div>
              )}

              {/* Location Details */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl">
                <h3 className="text-white font-medium text-lg mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#ff7400]" />
                  Location Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-white/50 text-sm mb-1">Location</p>
                    <p className="text-white">{item.location.address || 'Campus Location'}</p>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm mb-1">Date {item.type === 'lost' ? 'Lost' : 'Found'}</p>
                    <p className="text-white">{formatTimestamp(item.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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
    </>
  )
}
