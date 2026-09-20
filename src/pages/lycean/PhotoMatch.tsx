import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Clock, TrendingUp, AlertCircle, History } from 'lucide-react';
import LyceanSidebar from '@/components/lycean-sidebar';
import { photoMatchService, PhotoMatchRequest } from '@/services/photoMatchService';
import { AIMatchResult } from '@/services/aiMatchingService';
import { useAuth } from '@/contexts/AuthContext';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export default function PhotoMatchPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<PhotoMatchRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<PhotoMatchRequest[]>([]);
  const [matchHistory, setMatchHistory] = useState<AIMatchResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  // const [showLimitModal, setShowLimitModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [usageCount, setUsageCount] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Debug: Log user state
  useEffect(() => {
    console.log('[PhotoMatch] User state:', user ? { uid: user.uid, email: user.email } : 'Not logged in');
  }, [user]);

  // Load match history
  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      try {
        const q = query(
          collection(db, 'aiMatches'),
          where('matchedBy', '==', user.uid)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const history = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as AIMatchResult));
          
          // Sort by createdAt descending
          history.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });
          
          setMatchHistory(history);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('[PhotoMatch] Failed to load history:', error);
      }
    };

    loadHistory();
  }, [user]);

  // Check usage limit
  useEffect(() => {
    if (!user) return;

    const checkUsageLimit = () => {
      const today = new Date().toDateString();
      const usageKey = `photoMatch_${user.uid}_${today}`;
      const lastResetKey = `photoMatch_${user.uid}_lastReset`;
      
      const storedUsage = localStorage.getItem(usageKey);
      const lastReset = localStorage.getItem(lastResetKey);
      
      // Check if we need to reset (12 hours have passed)
      if (lastReset) {
        const lastResetTime = new Date(lastReset).getTime();
        const now = new Date().getTime();
        const hoursPassed = (now - lastResetTime) / (1000 * 60 * 60);
        
        if (hoursPassed >= 12) {
          // Reset usage
          localStorage.removeItem(usageKey);
          localStorage.removeItem(lastResetKey);
          setUsageCount(0);
          return;
        }
      }
      
      const count = parseInt(storedUsage || '0');
      setUsageCount(count);
    };

    checkUsageLimit();
    // Check every minute
    const interval = setInterval(checkUsageLimit, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Update remaining time for cooldown
  useEffect(() => {
    if (!user || usageCount < 2) return;

    const updateRemainingTime = () => {
      const lastResetKey = `photoMatch_${user.uid}_lastReset`;
      const lastReset = localStorage.getItem(lastResetKey);
      
      if (!lastReset) return;
      
      const lastResetTime = new Date(lastReset).getTime();
      const now = new Date().getTime();
      const cooldownEnd = lastResetTime + (12 * 60 * 60 * 1000); // 12 hours
      const remaining = cooldownEnd - now;
      
      if (remaining <= 0) {
        setRemainingTime('');
        return;
      }
      
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      setRemainingTime(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(interval);
  }, [user, usageCount]);

  // Subscribe to real-time updates for ALL match requests (global queue)
  useEffect(() => {
    if (!user) return;

    // Subscribe to all requests to show global queue
    const q = query(
      collection(db, 'photoMatches'),
      where('status', 'in', ['queued', 'processing'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as PhotoMatchRequest));
      
      // Sort client-side by createdAt ascending (oldest first)
      requests.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return aTime - bTime;
      });
      
      // Update positions
      requests.forEach((req, index) => {
        req.position = index + 1;
      });
      
      setQueue(requests);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to completed requests for the current user (temporary - will be deleted)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'photoMatches'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' || change.type === 'modified') {
          const request = {
            id: change.doc.id,
            ...change.doc.data(),
          } as PhotoMatchRequest;
          
          if (request.status === 'completed' && request.results) {
            // Add to completed requests temporarily
            setCompletedRequests(prev => {
              // Check if already exists
              const exists = prev.some(r => r.id === request.id);
              if (exists) {
                return prev.map(r => r.id === request.id ? request : r);
              }
              return [request, ...prev];
            });
            
            // Delete from Firestore after 2 seconds (enough time to show results)
            setTimeout(async () => {
              try {
                if (request.id) {
                  await photoMatchService.deleteMatchRequest(request.id);
                  console.log('[PhotoMatch] Deleted completed request:', request.id);
                }
              } catch (error) {
                console.error('[PhotoMatch] Failed to delete request:', error);
              }
            }, 2000);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must be less than 10MB');
        setShowErrorModal(true);
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please upload an image file');
        setShowErrorModal(true);
        return;
      }

      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      setErrorMessage('Please select an image first');
      setShowErrorModal(true);
      return;
    }
    
    if (!user) {
      setErrorMessage('You must be logged in to use photo matching. Please log in first.');
      setShowErrorModal(true);
      return;
    }

    // Check usage limit
    if (usageCount >= 2) {
      // setShowLimitModal(true);
      toast.error('You have reached your daily limit of 2 photo matches');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmUpload = async () => {
    if (!selectedImage || !user) return;

    setShowConfirmModal(false);
    console.log('[PhotoMatch] Starting upload...', { user: user.uid, file: selectedImage.name });
    setIsUploading(true);

    try {
      // Upload image to Firebase Storage
      console.log('[PhotoMatch] Uploading image to Firebase Storage...');
      const imageUrl = await photoMatchService.uploadImage(selectedImage);
      console.log('[PhotoMatch] Image uploaded:', imageUrl);
      
      // Create match request
      console.log('[PhotoMatch] Creating match request...');
      const requestId = await photoMatchService.createMatchRequest(user.uid, imageUrl);
      console.log('[PhotoMatch] Match request created:', requestId);
      
      // Increment usage count
      const today = new Date().toDateString();
      const usageKey = `photoMatch_${user.uid}_${today}`;
      const lastResetKey = `photoMatch_${user.uid}_lastReset`;
      const newCount = usageCount + 1;
      localStorage.setItem(usageKey, newCount.toString());
      
      // Set last reset time if this is the first use
      if (usageCount === 0) {
        localStorage.setItem(lastResetKey, new Date().toISOString());
      }
      
      setUsageCount(newCount);
      
      // Start processing in background
      console.log('[PhotoMatch] Starting background processing...');
      photoMatchService.processMatchRequest(requestId).catch(error => {
        console.error('[PhotoMatch] Background processing failed:', error);
      });
      
      // Clear form
      setSelectedImage(null);
      setPreviewUrl('');
      
      console.log('[PhotoMatch] Upload complete');
    } catch (error) {
      console.error('[PhotoMatch] Upload failed:', error);
      setErrorMessage(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
      setShowErrorModal(true);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusIcon = (status: PhotoMatchRequest['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'processing':
        return (
          <div className="w-5 h-5 animate-spin">
            <img 
              src="/Untitled design (3).png" 
              alt="Processing" 
              className="w-full h-full object-contain grayscale brightness-200"
            />
          </div>
        );
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const getStatusText = (status: PhotoMatchRequest['status'], position?: number) => {
    switch (status) {
      case 'queued':
        return `Queued - Position #${position}`;
      case 'processing':
        return 'Analyzing image...';
      case 'completed':
        return 'Analysis complete';
      case 'failed':
        return 'Analysis failed';
    }
  };

  const activeQueueCount = queue.filter(q => q.status === 'queued' || q.status === 'processing').length;

  // Show login message if not authenticated
  if (!user) {
    return (
      <>
        <LyceanSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 lg:mb-12">
              <h1 className="text-3xl lg:text-5xl font-medium text-white mb-3 lg:mb-4">Photo Matcher</h1>
              <p className="text-white/60 text-base lg:text-lg">Upload a photo to find similar items instantly</p>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Authentication Required</h2>
              <p className="text-white/60 mb-6">You must be logged in to use the photo matcher</p>
              <Link to="/auth" className="inline-block px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff7400]/90 text-white font-semibold transition-colors">
                Go to Login
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }



  return (
    <>
      <LyceanSidebar />
      
      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-400" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-3">Oops!</h2>
              
              {/* Message */}
              <p className="text-white/70 mb-6 leading-relaxed">
                {errorMessage}
              </p>
              
              {/* Close Button */}
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-white/10 border border-[#ff7400]/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-16 h-16 mb-6 rounded-full bg-[#ff7400]/20 flex items-center justify-center">
                <Upload className="h-10 w-10 text-[#ff7400]" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-3">Add to Queue?</h2>
              
              {/* Message */}
              <p className="text-white/70 mb-6 leading-relaxed">
                Your photo will be added to the processing queue. This will use 1 of your {2 - usageCount} remaining matches for today.
              </p>

              {/* Preview */}
              {previewUrl && (
                <div className="w-full mb-6 rounded-2xl overflow-hidden border border-white/10">
                  <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                </div>
              )}
              
              {/* Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpload}
                  disabled={isUploading}
                  className="flex-1 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff7400]/90 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Adding...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 lg:mb-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl lg:text-5xl font-medium text-white mb-3 lg:mb-4">Photo Matcher</h1>
                <p className="text-white/60 text-base lg:text-lg">Upload a photo to find similar items instantly</p>
              </div>
              <div className="flex items-center gap-3">
                {/* History Button */}
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden lg:inline">History</span>
                  {matchHistory.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#ff7400] text-white text-xs">
                      {matchHistory.length}
                    </span>
                  )}
                </button>
                {/* Usage Indicator */}
                <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex gap-1">
                    {[0, 1].map((i) => (
                      <div 
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < usageCount ? 'bg-[#ff7400]' : 'bg-white/20'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-white/70">
                    {2 - usageCount} uses left today
                  </span>
                  {/* Dev-only: unlimited test matches (stripped from production builds) */}
                  {import.meta.env.DEV && user && (
                    <button
                      onClick={() => {
                        const today = new Date().toDateString();
                        localStorage.setItem(`photoMatch_${user.uid}_${today}`, '-97');
                        setUsageCount(-97);
                        toast.success('🎰 Test mode: 99 matches unlocked!');
                      }}
                      className="ml-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-all"
                      title="Dev only — resets the usage limit for testing"
                    >
                      🎰 +99 test spins
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Upload Photo</h2>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    usageCount >= 2 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {2 - usageCount} uses left today
                  </div>
                  <div className="px-3 py-1 rounded-full bg-[#ff7400]/20 text-[#ff7400] text-sm font-medium">
                    Step 1
                  </div>
                </div>
              </div>
              
              {usageCount >= 2 ? (
                // Daily Limit Reached - Show Timer
                <div className="text-center py-8">
                  <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 animate-spin">
                      <img 
                        src="/Untitled design (3).png" 
                        alt="LyFind Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">Daily Limit Reached</h3>
                  <p className="text-white/60 text-sm mb-6">
                    Wait for 12 hours to use photo matching again
                  </p>

                  {remainingTime && (
                    <div
                      onClick={() => {
                        // Dev-only: clicking the timer offers to clear the cooldown
                        if (!import.meta.env.DEV || !user) return;
                        if (window.confirm('Do you want to override the time reset? (dev only)')) {
                          const today = new Date().toDateString();
                          localStorage.removeItem(`photoMatch_${user.uid}_${today}`);
                          localStorage.removeItem(`photoMatch_${user.uid}_lastReset`);
                          setUsageCount(0);
                          setRemainingTime('');
                          toast.success('⏱️ Cooldown cleared — 2 matches available again!');
                        }
                      }}
                      className={`mb-6 p-6 rounded-2xl bg-[#ff7400]/10 border border-[#ff7400]/30 ${
                        import.meta.env.DEV ? 'cursor-pointer hover:bg-[#ff7400]/20 transition-all' : ''
                      }`}
                      title={import.meta.env.DEV ? 'Dev only: click to override the time reset' : undefined}
                    >
                      <div className="text-4xl font-bold text-[#ff7400] font-mono tracking-wider">
                        {remainingTime}
                      </div>
                      {import.meta.env.DEV && (
                        <p className="text-[11px] text-white/40 mt-2">dev: click to override</p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-white/50 mb-4">
                    You've used all 2 photo matches for today. The cooldown resets 12 hours after your first use.
                  </p>

                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-white/80">
                      💡 You can still view your match history and browse the queue while waiting
                    </p>
                  </div>
                </div>
              ) : !previewUrl ? (
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 p-12 cursor-pointer hover:border-[#ff7400]/50 transition-all bg-white/5 hover:bg-white/10">
                  <div className="w-16 h-16 rounded-full bg-[#ff7400]/20 flex items-center justify-center mb-4">
                    <ImageIcon className="h-8 w-8 text-[#ff7400]" />
                  </div>
                  <p className="font-semibold text-white mb-1">Click to upload</p>
                  <p className="text-sm text-white/60">PNG, JPG, WebP up to 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                    <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
                    <button
                      onClick={() => { setPreviewUrl(''); setSelectedImage(null); }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-[#ff7400] to-[#ff7400]/80 hover:shadow-lg hover:shadow-[#ff7400]/30 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Adding to Queue...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Add to Queue ({2 - usageCount} left)
                      </>
                    )}
                  </button>
                </div>
              )}

              {usageCount < 2 && (
                <div className="mt-6 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-white/80 leading-relaxed">
                    <strong className="text-white">How it works:</strong> Upload a photo of your lost or found item, and we'll search through all posted items to find the best matches based on visual similarity. Results typically ready in under 10 seconds!
                  </p>
                </div>
              )}
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Processing Queue</h2>
                <div className="px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium">
                  {activeQueueCount} Active
                </div>
              </div>

              {queue.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-white/40" />
                  </div>
                  <p className="text-white/60 mb-1">No items in queue</p>
                  <p className="text-sm text-white/40">Upload a photo to start matching</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {queue.map((item) => {
                    const isCurrentUser = item.userId === user?.uid;
                    // const estimatedWait = index * 10; // 10 seconds per position
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`rounded-2xl border p-4 ${
                          isCurrentUser 
                            ? 'border-[#ff7400] bg-[#ff7400]/10' 
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <img src={item.imageUrl} alt="Queued" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(item.status)}
                              <span className="font-medium text-white text-sm">
                                {getStatusText(item.status, item.position)}
                              </span>
                              {isCurrentUser && (
                                <span className="text-xs bg-[#ff7400] text-white px-2 py-0.5 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50">{item.createdAt?.toDate().toLocaleString()}</p>
                          
                          {item.status === 'processing' && (
                            <div className="mt-3">
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#ff7400] to-[#ff7400]/60 transition-all duration-500 ease-out" style={{ width: `${item.progress || 0}%` }} />
                              </div>
                              <p className="text-xs text-white/50 mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1 h-1 bg-[#ff7400] rounded-full animate-pulse"></span>
                                {item.progress}% - {item.currentStep}
                              </p>
                            </div>
                          )}

                          {item.status === 'queued' && (
                            <div className="mt-2 text-xs text-yellow-400/80">
                              ⏱️ Estimated wait: ~{item.position! * 8}s
                            </div>
                          )}

                          {item.status === 'completed' && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                              <TrendingUp className="h-3 w-3" />
                              Found {item.results?.length || 0} matches
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          </div>

          {completedRequests.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Match Results</h2>
              </div>
              
              {completedRequests.filter(q => q.results).map((item) => (
                <div key={item.id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
                  {/* Analysis Header */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
                    <img src={item.imageUrl} alt="Query" className="w-24 h-24 rounded-2xl object-cover border-2 border-[#ff7400]/30" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                        Your Photo
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ Analyzed</span>
                      </h3>
                      <p className="text-sm text-white/60 mb-2">
                        Found {item.results?.length || 0} similar items • Processed in {item.analysisDetails?.processingTime.toFixed(1)}s
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-white/70">
                          📐 {item.analysisDetails?.imageSize}
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-white/70">
                          🔍 {item.analysisDetails?.features} features
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-white/5 text-white/70">
                          📊 {item.analysisDetails?.comparedItems} items compared
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Details */}
                  {item.analysisDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
                      <div className="rounded-2xl bg-white/5 p-4">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-xs">🎨</span>
                          Detected Colors
                        </h4>
                        <div className="flex gap-2">
                          {item.analysisDetails.dominantColors.map((color, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div 
                                className="w-8 h-8 rounded-lg border border-white/20 shadow-lg" 
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs text-white/60">{color}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/5 p-4">
                        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs">🏷️</span>
                          Detected Objects
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {item.analysisDetails.detectedObjects.map((obj, idx) => (
                            <span key={idx} className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Match Results */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1">Top Matches</h3>
                    <p className="text-sm text-white/60">Ranked by visual similarity score</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {item.results?.map((result, idx) => (
                      <Link 
                        key={result.itemId} 
                        to={`/item/${result.itemId}`}
                        state={{ from: '/photo-match' }}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-[#ff7400]/50 transition-all group relative"
                      >
                        {idx === 0 && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xs font-bold shadow-lg z-10">
                            #1
                          </div>
                        )}
                        <div className="relative mb-3">
                          <img src={result.imageUrl} alt={result.title} className="w-full h-32 object-cover rounded-xl" />
                          <div className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg ${
                            result.score >= 70 ? 'bg-green-500' : result.score >= 55 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}>
                            {result.score}%
                          </div>
                          <span className={`absolute top-2 left-2 text-xs font-medium px-2 py-1 rounded-lg ${result.type === 'lost' ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white'}`}>
                            {result.type === 'lost' ? 'Lost' : 'Found'}
                          </span>
                        </div>
                        <h4 className="font-semibold text-white mb-2 group-hover:text-[#ff7400] transition-colors line-clamp-1">{result.title}</h4>
                        <p className="text-sm text-white/60 mb-1 line-clamp-1">📍 {result.location}</p>
                        <p className="text-xs text-white/40">
                          By {result.postedBy} • {new Date(result.date).toLocaleDateString()}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl p-4 sm:p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <History className="w-6 h-6 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Match History</h3>
                  <p className="text-white/60 text-xs sm:text-sm truncate">Your photo matching history</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all"
              >
                <XCircle className="w-5 h-5 text-white" />
              </button>
            </div>

            {matchHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <History className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/60 mb-1">No match history yet</p>
                <p className="text-sm text-white/40">Your photo match results will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matchHistory.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 hover:bg-white/10 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start flex-shrink-0">
                        <img
                          src={match.queryImageUrl}
                          alt="Query"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10"
                        />
                        <div className="text-white/40 flex items-center text-xl sm:text-2xl">→</div>
                        <img
                          src={match.matchedImageUrl}
                          alt="Match"
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-white/10"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap ${
                            match.similarityScore >= 70 ? 'bg-green-500/20 text-green-400' :
                            match.similarityScore >= 55 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>
                            {match.similarityScore}% Match
                          </span>
                          <span className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                            match.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            match.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                          </span>
                        </div>
                        <h4 className="text-white font-semibold mb-1 truncate">{match.matchedItemTitle}</h4>
                        <p className="text-white/50 text-xs sm:text-sm mb-3">
                          {match.createdAt?.toDate().toLocaleString()}
                        </p>
                        <Link
                          to={`/item/${match.matchedItemId}`}
                          className="inline-block w-full sm:w-auto text-center px-4 py-2 rounded-lg bg-[#ff7400] hover:bg-[#ff7400]/90 text-white text-sm font-medium transition-all"
                        >
                          View Item
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}
