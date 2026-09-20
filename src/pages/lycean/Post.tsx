import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, MapPin, Calendar, Tag, FileText, Image as ImageIcon, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import LyceanSidebar from '@/components/lycean-sidebar'
import { itemService } from '@/services/itemService'
import { storageService } from '@/services/storageService'
// import { userService } from '@/services/userService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { LocationPickerWithOCR } from '@/components/LocationPickerWithOCR'
import { autoMatchNewItem } from '@/services/autoMatchService'
import { watchService } from '@/services/watchService'
import { geminiService } from '@/services/geminiService'

const categories = ['Bags', 'Electronics', 'Jewelry', 'Accessories', 'Keys', 'Clothing', 'Books', 'Other']

export default function PostPage() {
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost')
  const [title, setTitle] = useState('')
  const [blindDescription, setBlindDescription] = useState('')
  const [detailedDescription, setDetailedDescription] = useState('')
  const [category, setCategory] = useState('')
  const [floorPlanLocation, setFloorPlanLocation] = useState<{
    floorPlanId: string;
    x: number;
    y: number;
    roomNumber?: string;
  } | null>(null)
  const [date, setDate] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [additionalDetails, setAdditionalDetails] = useState({
    color: '',
    brand: '',
    identifyingFeatures: ''
  })
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [aiFilling, setAiFilling] = useState(false)

  // Gemini: draft title/category/descriptions from the first photo
  const handleAiAutofill = async () => {
    if (imageFiles.length === 0) {
      toast.error('Upload a photo first')
      return
    }
    setAiFilling(true)
    try {
      const analysis = await geminiService.analyzeItemPhoto(imageFiles[0])
      setTitle(analysis.title)
      setCategory(analysis.category)
      setBlindDescription(analysis.description)
      setDetailedDescription(analysis.distinguishingMarks)
      toast.success('✨ Details drafted from your photo — review and edit before posting!')
    } catch (error) {
      console.error('[Post] AI autofill failed:', error)
      toast.error('AI could not analyze the photo — please fill in the details manually')
    } finally {
      setAiFilling(false)
    }
  }
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      const totalFiles = imageFiles.length + newFiles.length
      
      if (totalFiles > 5) {
        toast.error('Maximum 5 photos allowed')
        return
      }
      
      // Validate file sizes and types
      for (const file of newFiles) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB`)
          return
        }
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`)
          return
        }
      }
      
      // Create previews
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setImageFiles([...imageFiles, ...newFiles])
      setImagePreviews([...imagePreviews, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviews[index])
    setImageFiles(imageFiles.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!title.trim()) {
      toast.error('Please enter an item name')
      return
    }
    if (!blindDescription.trim()) {
      toast.error('Please enter a blind description')
      return
    }
    if (!category) {
      toast.error('Please select a category')
      return
    }
    if (!floorPlanLocation) {
      toast.error('Please select a location on the floor plan')
      return
    }
    if (!date) {
      toast.error('Please select a date')
      return
    }
    if (imageFiles.length === 0) {
      toast.error('Please upload at least one photo')
      return
    }
    
    setShowConfirmModal(true)
  }

  const confirmPost = async () => {
    if (!user) {
      toast.error('You must be logged in to post items')
      navigate('/login')
      return
    }
    
    setShowConfirmModal(false)
    setUploading(true)
    
    try {
      // Upload photos to Cloudinary
      console.log('[Post] Uploading', imageFiles.length, 'photos to Cloudinary...')
      toast.info('Uploading photos...')
      const photoUrls = await storageService.uploadItemPhotos(imageFiles)
      console.log('[Post] Photos uploaded successfully:', photoUrls)
      
      // Create item in Firestore
      console.log('[Post] Creating item in Firestore...')
      console.log('[Post] User photo URL:', userProfile?.photoURL || user.photoURL)
      toast.info('Creating item post...')
      
      if (!floorPlanLocation) {
        toast.error('Please select a location on the floor plan');
        return;
      }
      
      // Verified teachers skip the approval queue — their posts go live immediately
      const isFaculty = userProfile?.role === 'faculty';
      const isCustodian = userProfile?.role === 'custodian';

      const itemData: any = {
        type: itemType,
        title: title.trim(),
        description: blindDescription.trim(), // Public blind description
        category,
        location: {
          lat: 0, // Not using lat/lng anymore
          lng: 0,
          address: floorPlanLocation.roomNumber || 'Room not specified',
        },
        floorPlanId: floorPlanLocation.floorPlanId,
        locationX: floorPlanLocation.x,
        locationY: floorPlanLocation.y,
        roomNumber: floorPlanLocation.roomNumber,
        photos: photoUrls,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous',
        userEmail: user.email!,
        status: (isFaculty || isCustodian ? 'active' : 'pending_approval') as any,
        ...(isFaculty ? { postedByFaculty: true } : {}),
        // Custodian posts are live immediately and flagged as held at the guard desk
        ...(isCustodian ? { heldAtGuardStation: true } : {}),
        approval: isFaculty || isCustodian
          ? {
              status: 'approved',
              submittedAt: new Date(),
              submittedBy: user.uid,
              riskLevel: 'low',
              autoApproved: true
            }
          : {
              status: 'pending_approval',
              submittedAt: new Date(),
              submittedBy: user.uid,
              riskLevel: 'medium',
              autoApproved: false
            }
      };

      // Only add optional fields if they have values
      const photoURL = userProfile?.photoURL || user.photoURL;
      if (photoURL) {
        itemData.userPhotoURL = photoURL;
      }

      const detailedDesc = detailedDescription.trim();
      if (detailedDesc) {
        itemData.detailedDescription = detailedDesc;
      }
      
      const itemId = await itemService.createItem(itemData);
      console.log('[Post] Item created with ID:', itemId)

      if (isFaculty || isCustodian) {
        // Faculty/custodian posts are live immediately — run auto-match and
        // saved-search alerts right away. (Non-faculty posts run these after
        // admin approval instead.)
        console.log('[Post] Triggering auto-match (live post)...')
        autoMatchNewItem(itemId, { id: itemId, ...itemData } as any).catch(error => {
          console.error('[Post] Auto-match failed:', error);
          // Don't show error to user - matching is optional
        });
        watchService.notifyWatchersForNewItem({ id: itemId, ...itemData } as any).catch(error => {
          console.error('[Post] Watch alerts failed:', error);
        });
        toast.success(
          isCustodian
            ? 'Item posted! It is marked as held at the Guard Station.'
            : 'Item posted! As a verified teacher, your post is live immediately.'
        )
      } else {
        toast.success('Item submitted for approval!')
      }
      setShowSuccessToast(true)
      
      // Reset form
      setTimeout(() => {
        setShowSuccessToast(false)
        navigate('/my-items') // Redirect to my items instead of browse
      }, 2000)
      
    } catch (error: any) {
      console.error('[Post] Error posting item:', error)
      toast.error(error.message || 'Failed to post item. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <LyceanSidebar />
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 lg:mb-12">
            <h1 className="text-3xl lg:text-5xl font-medium text-white mb-3 lg:mb-4">Post an Item</h1>
            <p className="text-white/60 text-base lg:text-lg">Help reunite lost items with their owners</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
            {/* Approval Process Info */}
            <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/20 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-lg mb-2">Admin Approval Required</h3>
                  <p className="text-blue-200/80 text-sm lg:text-base mb-3">
                    All posts must be approved by an admin before being published. This prevents fraudulent claims and ensures platform security.
                  </p>
                  <div className="space-y-2 text-sm text-blue-200/70">
                    <p>• <strong>Blind Description:</strong> Public info (keep it vague)</p>
                    <p>• <strong>Detailed Description:</strong> Private verification details (only you and admins see this)</p>
                    <p>• <strong>Review Time:</strong> Usually within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Type Selection */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl">
              <h2 className="text-white font-medium text-lg lg:text-xl mb-4 lg:mb-6">What would you like to report?</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setItemType('lost')}
                  className={`p-6 lg:p-8 rounded-2xl border-2 transition-all ${
                    itemType === 'lost'
                      ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="text-4xl lg:text-5xl mb-3 lg:mb-4">😢</div>
                  <h3 className="text-white font-medium text-lg lg:text-xl mb-2">Lost Item</h3>
                  <p className="text-white/50 text-sm">I lost something</p>
                </button>

                <button
                  type="button"
                  onClick={() => setItemType('found')}
                  className={`p-6 lg:p-8 rounded-2xl border-2 transition-all ${
                    itemType === 'found'
                      ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="text-4xl lg:text-5xl mb-3 lg:mb-4">🎉</div>
                  <h3 className="text-white font-medium text-lg lg:text-xl mb-2">Found Item</h3>
                  <p className="text-white/50 text-sm">I found something</p>
                </button>
              </div>
            </div>

            {/* Image Upload - Priority Section */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-medium text-lg lg:text-xl flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Photos *
                </h2>
                <span className="text-white/50 text-sm">{imageFiles.length}/5</span>
              </div>

              {/* Upload Area */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-xl lg:rounded-2xl overflow-hidden group">
                    <img src={preview} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}

                {imageFiles.length < 5 && (
                  <label className="aspect-square rounded-xl lg:rounded-2xl border-2 border-dashed border-white/20 hover:border-[#ff7400]/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/5">
                    <Upload className="w-8 h-8 text-white/40 mb-2" />
                    <span className="text-white/40 text-sm">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 backdrop-blur-xl bg-[#ff7400]/10 border border-[#ff7400]/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-[#ff7400] flex-shrink-0 mt-0.5" />
                <p className="text-[#ff7400]/90 text-sm">
                  <strong>Important:</strong> Clear photos are essential for identification. Upload at least one photo from different angles.
                </p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-white font-medium text-lg lg:text-xl">Basic Information</h2>
                {geminiService.isConfigured() && (
                  <button
                    type="button"
                    onClick={handleAiAutofill}
                    disabled={aiFilling || imageFiles.length === 0}
                    title={imageFiles.length === 0 ? 'Upload a photo first' : 'Let AI draft the details from your photo'}
                    className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff7400] text-white text-sm font-medium shadow-lg shadow-[#ff7400]/30 hover:bg-[#ff8500] hover:shadow-[#ff7400]/50 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none flex-shrink-0"
                  >
                    {aiFilling ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Analyzing…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span>Auto-fill</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-white/70 text-sm lg:text-base mb-2 block flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Item Name *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Blue Nike Backpack"
                  required
                  className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-white/70 text-sm lg:text-base mb-2 block">Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2.5 lg:py-3 rounded-xl text-sm lg:text-base font-medium transition-all ${
                        category === cat
                          ? 'bg-[#ff7400] text-white shadow-lg shadow-[#ff7400]/30'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blind Description (Public) */}
              <div>
                <label className="text-white/70 text-sm lg:text-base mb-2 block flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Blind Description (Public) *
                </label>
                <textarea
                  value={blindDescription}
                  onChange={(e) => setBlindDescription(e.target.value)}
                  placeholder="General description without specific details (e.g., 'Black backpack with laptop compartment')"
                  required
                  rows={3}
                  className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all resize-none"
                />
                <p className="text-white/40 text-xs lg:text-sm mt-2">
                  ⚠️ Keep it vague - don't include specific details that could enable false claims
                </p>
              </div>

              {/* Detailed Description (Private) */}
              <div>
                <label className="text-white/70 text-sm lg:text-base mb-2 block flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Detailed Description (Private - For Verification)
                </label>
                <textarea
                  value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  placeholder="Specific details for verification (e.g., 'Has a red keychain with initials JD, scratch on bottom left corner, contains a blue notebook')"
                  rows={4}
                  className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all resize-none"
                />
                <div className="flex items-start gap-3 p-3 backdrop-blur-xl bg-blue-500/10 border border-blue-500/20 rounded-xl mt-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-400/90 text-xs lg:text-sm">
                    <strong>Private:</strong> Only you and admins can see this. Use it to verify true ownership when someone claims the item.
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Date with Floor Plan */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
              <h2 className="text-white font-medium text-lg lg:text-xl">Location & Date</h2>

              {/* Floor Plan Location Picker */}
              <div>
                <label className="text-white/70 text-sm lg:text-base mb-3 block flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Where was it {itemType === 'lost' ? 'lost' : 'found'}? *
                </label>
                
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                  <LocationPickerWithOCR
                    value={floorPlanLocation || undefined}
                    onChange={setFloorPlanLocation}
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-white/70 text-sm lg:text-base mb-2 block flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date {itemType === 'lost' ? 'Lost' : 'Found'} *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
              <h2 className="text-white font-medium text-lg lg:text-xl">Additional Details (Optional)</h2>

              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <label className="text-white/70 text-sm lg:text-base mb-2 block">Color</label>
                  <input
                    type="text"
                    value={additionalDetails.color}
                    onChange={(e) => setAdditionalDetails({...additionalDetails, color: e.target.value})}
                    placeholder="e.g., Blue, Red, Black"
                    className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-white/70 text-sm lg:text-base mb-2 block">Brand</label>
                  <input
                    type="text"
                    value={additionalDetails.brand}
                    onChange={(e) => setAdditionalDetails({...additionalDetails, brand: e.target.value})}
                    placeholder="e.g., Nike, Apple, Samsung"
                    className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/70 text-sm lg:text-base mb-2 block">Identifying Features</label>
                <input
                  type="text"
                  value={additionalDetails.identifyingFeatures}
                  onChange={(e) => setAdditionalDetails({...additionalDetails, identifyingFeatures: e.target.value})}
                  placeholder="e.g., Scratches, stickers, unique marks"
                  className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/browse')}
                disabled={uploading}
                className="flex-1 px-6 py-4 lg:py-5 backdrop-blur-xl bg-white/5 border border-white/10 text-white rounded-2xl lg:rounded-3xl hover:bg-white/10 transition-all text-base lg:text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 px-6 py-4 lg:py-5 bg-[#ff7400] text-white rounded-2xl lg:rounded-3xl hover:bg-[#ff7400]/90 transition-all shadow-lg shadow-[#ff7400]/30 text-base lg:text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Item'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#ff7400]/10 border border-[#ff7400]/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-3">Submit for Approval</h3>
              <p className="text-white/60">
                Your {itemType} item will be reviewed by an admin before being published.
              </p>
            </div>

            {/* Item Preview */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-4">
                {imagePreviews[0] && (
                  <img
                    src={imagePreviews[0]}
                    alt={title}
                    className="w-20 h-20 rounded-xl object-cover ring-2 ring-white/10"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${
                    itemType === 'lost'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                  </div>
                  <h4 className="text-white font-medium text-lg mb-1">{title}</h4>
                  <p className="text-white/50 text-sm line-clamp-2">{blindDescription}</p>
                  <div className="flex items-center gap-4 mt-2 text-white/40 text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {floorPlanLocation?.roomNumber || 'Location selected'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {date}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-6 py-3 backdrop-blur-xl bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmPost}
                className="flex-1 px-6 py-3 bg-[#ff7400] text-white rounded-2xl font-medium hover:bg-[#ff7400]/90 transition-all shadow-lg shadow-[#ff7400]/30"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-50 animate-slideIn">
          <div className="backdrop-blur-xl bg-green-500/20 border border-green-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[320px]">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Submitted for Approval!</h4>
              <p className="text-green-300/80 text-sm">Your {itemType} item will be reviewed by an admin.</p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
