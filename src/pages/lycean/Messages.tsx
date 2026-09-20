import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, ArrowLeft, Loader2, MessageCircle, Package, Flag, X, AlertTriangle, Paperclip, MapPin, CheckCircle, Search } from 'lucide-react';
import LyceanSidebar from '@/components/lycean-sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { messageService, Conversation, Message } from '@/services/messageService';
import { userService } from '@/services/userService';
import { ratingService, RatingSummary } from '@/services/ratingService';
import { reportService } from '@/services/reportService';
import { storageService } from '@/services/storageService';
// import { itemService } from '@/services/itemService';
import { floorPlans, getFloorPlan } from '@/lib/floorPlans';
import { toast } from 'sonner';

export default function MessagesPage() {
  const { user, userProfile } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<'inappropriate' | 'spam' | 'fraud' | 'harassment' | 'other'>('harassment');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [claimingItem, setClaimingItem] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyQuestion, setVerifyQuestion] = useState('');
  const [claimAnswer, setClaimAnswer] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(floorPlans[0].id);
  const [locationPin, setLocationPin] = useState<{ x: number; y: number } | null>(null);
  const [roomNumber, setRoomNumber] = useState('');

  // Get conversation ID from navigation state
  const targetConversationId = (location.state as any)?.conversationId;

  // Live view of the selected conversation (the list listener keeps `conversations`
  // fresh; `selectedConversation` alone is a snapshot from selection time)
  const liveConversation = selectedConversation
    ? conversations.find((c) => c.id === selectedConversation.id) ?? selectedConversation
    : null;

  // Re-render periodically while a chat is open so the typing indicator expires
  const [, setTypingTick] = useState(0);
  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(() => setTypingTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, [selectedConversation]);

  const lastTypingSentRef = useRef(0);
  const notifyTyping = () => {
    if (!selectedConversation || !user) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      messageService.setTyping(selectedConversation.id!, user.uid);
    }
  };

  const isOtherUserTyping = () => {
    if (!liveConversation || !user) return false;
    const otherId = liveConversation.participants.find((id) => id !== user.uid);
    const ts = otherId ? liveConversation.typing?.[otherId] : undefined;
    return ts ? Date.now() - ts.toMillis() < 5000 : false;
  };

  // Trust badge + rating summary for the other participant
  const [otherUserReturns, setOtherUserReturns] = useState<number | null>(null);
  const [otherUserRating, setOtherUserRating] = useState<RatingSummary | null>(null);
  useEffect(() => {
    setOtherUserReturns(null);
    setOtherUserRating(null);
    if (!selectedConversation || !user) return;
    const otherId = selectedConversation.participants.find((id) => id !== user.uid);
    if (!otherId) return;
    userService
      .getReturnedCount(otherId)
      .then(setOtherUserReturns)
      .catch(() => setOtherUserReturns(null));
    ratingService
      .getUserRatingSummary(otherId)
      .then(setOtherUserRating)
      .catch(() => setOtherUserRating(null));
  }, [selectedConversation?.id, user]);

  // Rating prompt after a completed handover
  const [hasRated, setHasRated] = useState(true);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const handoverComplete = Boolean(
    liveConversation?.handover?.ownerConfirmed && liveConversation?.handover?.claimerConfirmed
  );
  useEffect(() => {
    if (!selectedConversation || !user || !handoverComplete) return;
    ratingService
      .hasRated(selectedConversation.id!, user.uid)
      .then((rated) => setHasRated(rated))
      .catch(() => setHasRated(true));
  }, [selectedConversation?.id, user, handoverComplete]);

  const handleSubmitRating = async () => {
    if (!liveConversation || !user || ratingStars < 1) return;
    const otherId = liveConversation.participants.find((id) => id !== user.uid);
    if (!otherId) return;
    setSubmittingRating(true);
    try {
      await ratingService.submitRating(
        liveConversation.id!,
        liveConversation.itemId,
        user.uid,
        otherId,
        ratingStars,
        ratingComment
      );
      setHasRated(true);
      toast.success('Thanks for rating the exchange!');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = messageService.listenToUserConversations(
      user.uid,
      (convs) => {
        setConversations(convs);
        setLoading(false);

        // Auto-select conversation if passed via navigation
        if (targetConversationId && !selectedConversation) {
          const targetConv = convs.find(c => c.id === targetConversationId);
          if (targetConv) {
            setSelectedConversation(targetConv);
            setShowMobileChat(true);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [user, targetConversationId]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = messageService.listenToMessages(
      selectedConversation.id!,
      (msgs) => {
        setMessages(msgs);
      }
    );

    // Mark as read
    if (user) {
      messageService.markAsRead(selectedConversation.id!, user.uid);
    }

    return () => unsubscribe();
  }, [selectedConversation, user]);

  // Keep marking as read while the chat is open so new incoming messages
  // don't stay "unread" (also powers the sender's Seen receipt)
  useEffect(() => {
    if (!selectedConversation || !user || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId !== user.uid && last.senderId !== 'system') {
      messageService.markAsRead(selectedConversation.id!, user.uid);
    }
  }, [messages, selectedConversation, user]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedImages.length === 0 && !locationPin) || !selectedConversation || !user) return;

    setSending(true);
    try {
      let imageUrls: string[] = [];
      
      // Upload images if any
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        imageUrls = await storageService.uploadItemPhotos(selectedImages);
        setUploadingImages(false);
      }

      // Prepare location data if pin is set
      let locationData: { floorPlanId: string; x: number; y: number; roomNumber?: string } | undefined;
      if (locationPin) {
        locationData = {
          floorPlanId: selectedFloorPlan,
          x: locationPin.x,
          y: locationPin.y,
          roomNumber: roomNumber || undefined,
        };
      }

      await messageService.sendMessage(
        selectedConversation.id!,
        user.uid,
        user.displayName || 'User',
        newMessage.trim() || (locationPin ? '📍 Location' : '📷 Image'),
        user.photoURL || undefined,
        imageUrls.length > 0 ? imageUrls : undefined,
        locationData
      );
      
      setNewMessage('');
      setSelectedImages([]);
      setLocationPin(null);
      setRoomNumber('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      setUploadingImages(false);
    }
  };

  const handleReportConversation = async () => {
    if (!user || !userProfile || !selectedConversation) {
      toast.error('Please log in to report')
      return
    }

    if (!reportDescription.trim()) {
      toast.error('Please provide a description')
      return
    }

    setSubmittingReport(true)

    try {
      const otherUser = getOtherParticipant(selectedConversation);
      
      const reportData: any = {
        reportedBy: user.uid,
        reporterName: userProfile.displayName || user.displayName || 'User',
        reporterEmail: user.email!,
        reason: reportCategory,
        category: reportCategory,
        description: reportDescription.trim()
      };

      // Add optional fields only if they exist
      if (selectedConversation.id) {
        reportData.conversationId = selectedConversation.id;
      }
      if (selectedConversation.itemTitle) {
        reportData.messageContent = `Conversation about: ${selectedConversation.itemTitle}`;
      }
      if (otherUser.id) {
        reportData.reportedUserId = otherUser.id;
      }
      if (otherUser.name) {
        reportData.reportedUserName = otherUser.name;
      }
      
      await reportService.createReport(reportData);

      toast.success('Report submitted successfully')
      setShowReportModal(false)
      setReportCategory('harassment')
      setReportDescription('')
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Failed to submit report')
    } finally {
      setSubmittingReport(false)
    }
  };

  const handleClaimItem = async () => {
    if (!user || !selectedConversation || !meetupLocation.trim()) {
      toast.error('Please provide a meetup location');
      return;
    }

    setClaimingItem(true);
    try {
      // participants[0] is always the item owner (per conversation creation),
      // so the claimer is the OTHER participant — not the owner clicking the button.
      const claimerId =
        selectedConversation.participants.find(p => p !== user.uid) || user.uid;

      await messageService.markItemAsClaimed(
        selectedConversation.id!,
        selectedConversation.itemId,
        selectedConversation.itemTitle,
        claimerId,
        { name: meetupLocation.trim() }
      );

      toast.success('Item marked as claimed!');
      setShowClaimModal(false);
      setMeetupLocation('');
    } catch (error) {
      console.error('Error claiming item:', error);
      toast.error('Failed to mark item as claimed');
    } finally {
      setClaimingItem(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setSelectedImages([...selectedImages, ...files]);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleFloorPlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLocationPin({ x, y });
  };

  const handleSendLocation = () => {
    if (!locationPin) {
      toast.error('Please select a location on the map');
      return;
    }
    setShowLocationModal(false);
    // Location will be sent when user clicks send button
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowMobileChat(true);
  };

  // ── Claim verification handlers ──────────────────────────────────────
  const handleAskQuestion = async () => {
    if (!liveConversation || !user || !verifyQuestion.trim()) return;
    const claimerId = liveConversation.participants.find((p) => p !== user.uid);
    if (!claimerId) return;
    setClaimBusy(true);
    try {
      await messageService.askClaimQuestion(liveConversation.id!, verifyQuestion.trim(), claimerId);
      setShowVerifyModal(false);
      setVerifyQuestion('');
      toast.success('Verification question sent!');
    } catch (error) {
      console.error('Error sending verification question:', error);
      toast.error('Failed to send question');
    } finally {
      setClaimBusy(false);
    }
  };

  const handleAnswerQuestion = async () => {
    if (!liveConversation?.claim || !claimAnswer.trim()) return;
    setClaimBusy(true);
    try {
      await messageService.answerClaimQuestion(liveConversation.id!, liveConversation.claim, claimAnswer.trim());
      setClaimAnswer('');
      toast.success('Answer submitted!');
    } catch (error) {
      console.error('Error answering verification question:', error);
      toast.error('Failed to submit answer');
    } finally {
      setClaimBusy(false);
    }
  };

  const handleReviewClaim = async (approved: boolean) => {
    if (!liveConversation?.claim) return;
    setClaimBusy(true);
    try {
      await messageService.reviewClaim(liveConversation.id!, liveConversation.claim, approved);
      toast.success(approved ? 'Ownership approved!' : 'Answer rejected');
    } catch (error) {
      console.error('Error reviewing claim:', error);
      toast.error('Failed to review answer');
    } finally {
      setClaimBusy(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (!liveConversation || !user) return;
    const isOwner = liveConversation.participants[0] === user.uid;
    setClaimBusy(true);
    try {
      await messageService.confirmHandover(liveConversation.id!, liveConversation.handover, isOwner);
      toast.success('Handover confirmed!');
    } catch (error) {
      console.error('Error confirming handover:', error);
      toast.error('Failed to confirm handover');
    } finally {
      setClaimBusy(false);
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    const otherUserId = conv.participants.find((id) => id !== user?.uid);
    return {
      id: otherUserId,
      name: conv.participantNames[otherUserId!],
      photo: conv.participantPhotos[otherUserId!],
    };
  };

  const getAvatarUrl = (name: string, photo?: string) =>
    photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=ff7400&color=fff&size=128`;

  // "Today" / "Yesterday" / "Mar 3" style labels for day separators
  const getDayLabel = (date: Date) => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    });
  };

  // Compact relative time for the conversation list ("now", "5m", "2h", "Mon", "Mar 3")
  const formatConvTime = (conv: Conversation) => {
    const ts = conv.lastMessageTime || conv.updatedAt;
    if (!ts) return '';
    const date = ts.toDate();
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 60000) return 'now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h`;
    if (diffMs < 7 * 86400000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isNewDay = (prev: Message | undefined, curr: Message) => {
    if (!prev) return true;
    const a = prev.createdAt.toDate();
    const b = curr.createdAt.toDate();
    return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth() || a.getDate() !== b.getDate();
  };

  if (!user) {
    return (
      <>
        <LyceanSidebar />
        <main className="min-h-screen pt-6 lg:pt-12 pb-24 lg:pb-12 px-4 lg:px-6 lg:pl-80 lg:pr-12">
          <div className="max-w-4xl mx-auto">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <MessageCircle className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
              <p className="text-white/60 mb-6">Please sign in to view your messages</p>
              <Link
                to="/login"
                className="inline-block px-6 py-3 bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium rounded-xl transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <LyceanSidebar hideMobileFab={showMobileChat} />

      <main className="min-h-screen pt-0 pb-0 lg:pl-80 bg-[#2f1632]">
        <div className="h-screen flex">
          {/* Conversations List - Left Sidebar */}
          <div
            className={`${
              showMobileChat ? 'hidden lg:flex' : 'flex'
            } w-full lg:w-96 flex-col border-r border-white/10 bg-[#2f1632]`}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/10">
              <h1 className="text-2xl font-bold text-white mb-3">Messages</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder="Search chats or items…"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            {/* Recent Chats Strip (Messenger-style) */}
            {!loading && conversations.length > 0 && (
              <div className="px-4 pb-3 border-b border-white/10">
                <div className="flex gap-4 overflow-x-auto pt-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {conversations.map((conv) => {
                    const otherUser = getOtherParticipant(conv);
                    const unreadCount = conv.unreadCount[user.uid] || 0;
                    const isActive = selectedConversation?.id === conv.id;

                    return (
                      <button
                        key={`strip-${conv.id}`}
                        onClick={() => handleSelectConversation(conv)}
                        className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 group"
                        title={`${otherUser.name} — ${conv.itemTitle}`}
                      >
                        <div className="relative">
                          {/* Avatar circle */}
                          <div
                            className={`w-14 h-14 rounded-full overflow-hidden bg-white/10 transition-all ${
                              isActive
                                ? 'ring-2 ring-[#ff7400] ring-offset-2 ring-offset-[#2f1632]'
                                : unreadCount > 0
                                ? 'ring-2 ring-[#ff7400]/70 ring-offset-2 ring-offset-[#2f1632]'
                                : 'group-hover:ring-2 group-hover:ring-white/30 group-hover:ring-offset-2 group-hover:ring-offset-[#2f1632]'
                            }`}
                          >
                            <img
                              src={getAvatarUrl(otherUser.name, otherUser.photo)}
                              alt={otherUser.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = getAvatarUrl(otherUser.name);
                              }}
                            />
                          </div>

                          {/* Item thumbnail badge */}
                          {conv.itemImage && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-[#2f1632] bg-white/10">
                              <img
                                src={conv.itemImage}
                                alt={conv.itemTitle}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {/* Unread badge */}
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#ff7400] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#2f1632]">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-white/70 truncate w-full text-center group-hover:text-white transition-colors">
                          {(otherUser.name || 'User').split(' ')[0]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
                  <MessageCircle className="w-12 h-12 text-white/40 mb-4" />
                  <p className="text-white/60 mb-2">No messages yet</p>
                  <p className="text-white/40 text-sm">
                    Start a conversation by clicking "Message" on an item
                  </p>
                </div>
              ) : (
                <div className="px-3 py-2 space-y-1.5">
                  {conversations
                    .filter((conv) => {
                      if (!convSearch.trim()) return true;
                      const q = convSearch.toLowerCase();
                      const otherUser = getOtherParticipant(conv);
                      return (
                        (otherUser.name || '').toLowerCase().includes(q) ||
                        (conv.itemTitle || '').toLowerCase().includes(q)
                      );
                    })
                    .map((conv) => {
                      const otherUser = getOtherParticipant(conv);
                      const unreadCount = conv.unreadCount[user.uid] || 0;
                      const isSelected = selectedConversation?.id === conv.id;

                      return (
                        <button
                          key={conv.id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`w-full p-3 rounded-2xl transition-colors text-left ${
                            isSelected
                              ? 'bg-white/10'
                              : unreadCount > 0
                              ? 'bg-[#ff7400]/10 hover:bg-[#ff7400]/15'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar with item thumbnail badge (matches strip) */}
                            <div className="relative flex-shrink-0">
                              <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                                <img
                                  src={getAvatarUrl(otherUser.name, otherUser.photo)}
                                  alt={otherUser.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = getAvatarUrl(otherUser.name);
                                  }}
                                />
                              </div>
                              {conv.itemImage && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full overflow-hidden border-2 border-[#2f1632]">
                                  <img
                                    src={conv.itemImage}
                                    alt={conv.itemTitle}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Name + time */}
                              <div className="flex items-baseline justify-between gap-2">
                                <p className={`truncate text-white text-[15px] ${unreadCount > 0 ? 'font-bold' : 'font-semibold'}`}>
                                  {otherUser.name}
                                </p>
                                <span className={`text-[11px] flex-shrink-0 ${unreadCount > 0 ? 'text-[#ff7400] font-semibold' : 'text-white/40'}`}>
                                  {formatConvTime(conv)}
                                </span>
                              </div>

                              {/* Preview: last message (or item title), unread on right */}
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className={`text-[13px] truncate flex-1 ${
                                  unreadCount > 0 ? 'text-white font-medium' : 'text-white/50'
                                }`}>
                                  {conv.lastMessage || `About: ${conv.itemTitle}`}
                                </p>
                                {unreadCount > 0 && (
                                  <span className="min-w-[18px] h-[18px] px-1 bg-[#ff7400] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </span>
                                )}
                              </div>

                              {/* Item context pill */}
                              <p className="text-[11px] text-white/35 truncate mt-0.5">
                                📦 {conv.itemTitle}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area - Right Side */}
          <div className={`${showMobileChat ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 bg-[#2f1632]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowMobileChat(false)}
                      className="lg:hidden text-white/60 hover:text-white"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                      {getOtherParticipant(selectedConversation).photo ? (
                        <img
                          src={getOtherParticipant(selectedConversation).photo}
                          alt={getOtherParticipant(selectedConversation).name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to UI Avatars if image fails to load
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getOtherParticipant(selectedConversation).name)}&background=ff7400&color=fff&size=128`;
                          }}
                        />
                      ) : (
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getOtherParticipant(selectedConversation).name)}&background=ff7400&color=fff&size=128`}
                          alt={getOtherParticipant(selectedConversation).name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          {getOtherParticipant(selectedConversation).name}
                        </p>
                        {otherUserReturns !== null && otherUserReturns > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-300 text-[11px] font-medium"
                            title={`This user has returned ${otherUserReturns} item${otherUserReturns !== 1 ? 's' : ''}`}
                          >
                            🏅 {otherUserReturns} returned
                          </span>
                        )}
                        {otherUserRating !== null && otherUserRating.count > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/25 text-yellow-300 text-[11px] font-medium"
                            title={`Rated ${otherUserRating.average}/5 across ${otherUserRating.count} exchange${otherUserRating.count !== 1 ? 's' : ''}`}
                          >
                            ⭐ {otherUserRating.average} ({otherUserRating.count})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/60">
                        Inquiring about item
                      </p>
                    </div>

                    <button
                      onClick={() => setShowReportModal(true)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all"
                      title="Report conversation"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Item Card */}
                <div className="p-4 border-b border-white/10 bg-white/5">
                  <Link
                    to={`/item/${selectedConversation.itemId}`}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <img
                      src={selectedConversation.itemImage}
                      alt={selectedConversation.itemTitle}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-white/60" />
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                            selectedConversation.itemType === 'lost'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}
                        >
                          {selectedConversation.itemType === 'lost' ? 'Lost' : 'Found'}
                        </span>
                      </div>
                      <p className="font-semibold text-white truncate">
                        {selectedConversation.itemTitle}
                      </p>
                      <p className="text-xs text-white/60">Click to view item details</p>
                    </div>
                  </Link>

                  {/* Ownership verification + claim + handover */}
                  {(() => {
                    const conv = liveConversation ?? selectedConversation;
                    const isOwner = conv.participants[0] === user.uid;
                    const claim = conv.claim;
                    const handover = conv.handover;

                    return (
                      <>
                        {/* Verification panel */}
                        {claim && (
                          <div
                            className={`mt-3 p-3 rounded-xl border text-sm ${
                              claim.status === 'approved'
                                ? 'bg-green-500/10 border-green-500/30'
                                : claim.status === 'rejected'
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-[#ff7400]/10 border-[#ff7400]/30'
                            }`}
                          >
                            <p className="text-white/80 font-medium mb-1">🔐 Ownership Verification</p>
                            <p className="text-white/60 mb-2">Q: {claim.question}</p>

                            {claim.status === 'awaiting_answer' && (
                              isOwner ? (
                                <p className="text-white/50 italic">Waiting for the claimer's answer…</p>
                              ) : (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={claimAnswer}
                                    onChange={(e) => setClaimAnswer(e.target.value)}
                                    placeholder="Type your answer…"
                                    disabled={claimBusy}
                                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
                                  />
                                  <button
                                    onClick={handleAnswerQuestion}
                                    disabled={claimBusy || !claimAnswer.trim()}
                                    className="px-4 py-2 bg-[#ff7400] hover:bg-[#ff8500] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                  >
                                    Submit
                                  </button>
                                </div>
                              )
                            )}

                            {claim.status === 'awaiting_review' && (
                              <>
                                <p className="text-white/80 mb-2">A: {claim.answer}</p>
                                {isOwner ? (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleReviewClaim(true)}
                                      disabled={claimBusy}
                                      className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                      ✓ Approve
                                    </button>
                                    <button
                                      onClick={() => handleReviewClaim(false)}
                                      disabled={claimBusy}
                                      className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                    >
                                      ✗ Reject
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-white/50 italic">Waiting for the owner to review your answer…</p>
                                )}
                              </>
                            )}

                            {claim.status === 'approved' && (
                              <p className="text-green-300 font-medium">✅ Ownership verified</p>
                            )}
                            {claim.status === 'rejected' && (
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-red-300 font-medium">❌ Verification failed</p>
                                {isOwner && (
                                  <button
                                    onClick={() => setShowVerifyModal(true)}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium"
                                  >
                                    Ask another question
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Owner actions before claiming */}
                        {isOwner && !handover && (
                          <div className="flex gap-2 mt-3">
                            {!claim && (
                              <button
                                onClick={() => setShowVerifyModal(true)}
                                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
                              >
                                🔐 Verify Claimer
                              </button>
                            )}
                            <button
                              onClick={() => setShowClaimModal(true)}
                              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark as Claimed
                            </button>
                          </div>
                        )}

                        {/* Two-sided handover confirmation */}
                        {handover && (
                          <div
                            className={`mt-3 p-3 rounded-xl border text-sm ${
                              handover.ownerConfirmed && handover.claimerConfirmed
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-blue-500/10 border-blue-500/30'
                            }`}
                          >
                            {handover.ownerConfirmed && handover.claimerConfirmed ? (
                              <div>
                                <p className="text-green-300 font-medium">🎉 Handover complete — item returned!</p>
                                {!hasRated && (
                                  <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-white/80 text-sm font-medium mb-2">
                                      Rate this exchange
                                    </p>
                                    <div className="flex gap-1 mb-2">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          onClick={() => setRatingStars(star)}
                                          className={`text-2xl transition-transform hover:scale-110 ${
                                            star <= ratingStars ? '' : 'grayscale opacity-40'
                                          }`}
                                        >
                                          ⭐
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={ratingComment}
                                        onChange={(e) => setRatingComment(e.target.value)}
                                        placeholder="Optional comment…"
                                        disabled={submittingRating}
                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50"
                                      />
                                      <button
                                        onClick={handleSubmitRating}
                                        disabled={submittingRating || ratingStars < 1}
                                        className="px-4 py-2 bg-[#ff7400] hover:bg-[#ff8500] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                      >
                                        {submittingRating ? '…' : 'Submit'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <p className="text-white/80 font-medium mb-2">
                                  🤝 Handover confirmation ({(handover.ownerConfirmed ? 1 : 0) + (handover.claimerConfirmed ? 1 : 0)}/2)
                                </p>
                                {(isOwner ? handover.ownerConfirmed : handover.claimerConfirmed) ? (
                                  <p className="text-white/50 italic">
                                    You confirmed — waiting for the other party…
                                  </p>
                                ) : (
                                  <button
                                    onClick={handleConfirmHandover}
                                    disabled={claimBusy}
                                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm disabled:opacity-50"
                                  >
                                    {isOwner ? 'I handed over the item' : 'I received the item'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Admin Monitoring Disclaimer */}
                <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
                  <p className="text-yellow-200/90 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" />
                    Admin monitors all conversations for safety and security
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, idx) => {
                    const isOwn = message.senderId === user.uid;
                    const isSystem = message.senderId === 'system';
                    const showDaySeparator = isNewDay(messages[idx - 1], message);

                    return (
                      <div key={message.id}>
                      {showDaySeparator && (
                        <div className="flex items-center gap-3 my-2">
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="text-[11px] font-medium text-white/40 uppercase tracking-wide">
                            {getDayLabel(message.createdAt.toDate())}
                          </span>
                          <div className="flex-1 h-px bg-white/10" />
                        </div>
                      )}
                      <div
                        className={`flex ${isSystem ? 'justify-center' : isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`${isSystem ? 'max-w-md' : 'max-w-xs lg:max-w-md'} px-4 py-3 rounded-2xl ${
                            isSystem
                              ? 'bg-blue-500/20 text-blue-200 text-center text-sm'
                              : isOwn
                              ? 'bg-[#ff7400] text-white'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          {message.content && <p className="text-sm break-words">{message.content}</p>}
                          
                          {/* Display images if any */}
                          {message.images && message.images.length > 0 && (
                            <div className={`grid gap-2 ${message.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${message.content ? 'mt-2' : ''}`}>
                              {message.images.map((imageUrl, idx) => (
                                <img
                                  key={idx}
                                  src={imageUrl}
                                  alt={`Attachment ${idx + 1}`}
                                  className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(imageUrl, '_blank')}
                                />
                              ))}
                            </div>
                          )}

                          {/* Display location if any */}
                          {message.location && (
                            <div className={`${message.content || message.images ? 'mt-2' : ''}`}>
                              <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1a0d1c] border border-white/10">
                                <img
                                  src={getFloorPlan(message.location.floorPlanId)?.imageUrl || '/floor-plans/ground_floor.png'}
                                  alt="Floor Plan"
                                  className="w-full h-full object-contain"
                                />
                                {/* Location Pin */}
                                <div
                                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 animate-bounce"
                                  style={{
                                    left: `${message.location.x}%`,
                                    top: `${message.location.y}%`,
                                  }}
                                >
                                  <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-[#ff7400] animate-ping opacity-75"></div>
                                    <div className="relative w-8 h-8 rounded-full bg-[#ff7400] border-2 border-white shadow-2xl flex items-center justify-center">
                                      <MapPin className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                </div>
                                {/* Room label */}
                                {message.location.roomNumber && (
                                  <div className="absolute bottom-2 left-2 right-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-2">
                                    <p className="text-white font-medium text-xs text-center">{message.location.roomNumber}</p>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs mt-1 opacity-70">
                                📍 {getFloorPlan(message.location.floorPlanId)?.name || 'Campus Location'}
                              </p>
                            </div>
                          )}
                          
                          {!isSystem && (
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? 'text-white/70' : 'text-white/50'
                              }`}
                            >
                              {message.createdAt.toDate().toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Seen receipt under my last message once the other side has read it */}
                      {(() => {
                        const otherId = liveConversation?.participants.find((id) => id !== user.uid);
                        const lastOwn = [...messages].reverse().find((m) => m.senderId === user.uid);
                        const otherHasRead = otherId != null && (liveConversation?.unreadCount[otherId] || 0) === 0;
                        return isOwn && message.id === lastOwn?.id && otherHasRead ? (
                          <p className="text-right text-[11px] text-white/40 mt-1 pr-1">Seen</p>
                        ) : null;
                      })()}
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isOtherUserTyping() && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-2xl bg-white/10 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-white/10 bg-[#2f1632]">
                  {/* Image Previews */}
                  {selectedImages.length > 0 && (
                    <div className="mb-3 flex gap-2 flex-wrap">
                      {selectedImages.map((file, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${idx + 1}`}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                          />
                          <button
                            onClick={() => removeSelectedImage(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Location Preview */}
                  {locationPin && (
                    <div className="mb-3">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1a0d1c] border border-[#ff7400]/50">
                        <img
                          src={getFloorPlan(selectedFloorPlan)?.imageUrl || '/floor-plans/ground_floor.png'}
                          alt="Floor Plan"
                          className="w-full h-full object-contain"
                        />
                        <div
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                          style={{
                            left: `${locationPin.x}%`,
                            top: `${locationPin.y}%`,
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-[#ff7400] border-2 border-white shadow-lg flex items-center justify-center">
                            <MapPin className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setLocationPin(null);
                            setRoomNumber('');
                          }}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                        {roomNumber && (
                          <div className="absolute bottom-2 left-2 right-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-1">
                            <p className="text-white font-medium text-xs text-center">{roomNumber}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-1">📍 {getFloorPlan(selectedFloorPlan)?.name}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {/* Image Upload Button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || uploadingImages}
                      className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 flex-shrink-0"
                      title="Attach images"
                    >
                      <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Location Pin Button */}
                    <button
                      onClick={() => setShowLocationModal(true)}
                      disabled={sending || uploadingImages}
                      className={`p-2.5 sm:p-3 border rounded-xl transition-all disabled:opacity-50 flex-shrink-0 ${
                        locationPin
                          ? 'bg-[#ff7400] border-[#ff7400] text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                      title="Share location"
                    >
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        notifyTyping();
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      disabled={sending || uploadingImages}
                      className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm sm:text-base placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 transition-all disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={(!newMessage.trim() && selectedImages.length === 0 && !locationPin) || sending || uploadingImages}
                      className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#ff7400] hover:bg-[#ff8500] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0"
                    >
                      {sending || uploadingImages ? (
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60 mb-2">Select a conversation</p>
                  <p className="text-white/40 text-sm">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
      {showReportModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 lg:p-8 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Flag className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-medium text-white">Report Conversation</h3>
                  <p className="text-white/60 text-sm">Report inappropriate behavior</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportCategory('harassment')
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
              {/* Conversation Preview */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <img
                  src={selectedConversation.itemImage}
                  alt={selectedConversation.itemTitle}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{selectedConversation.itemTitle}</h4>
                  <p className="text-white/50 text-sm truncate">
                    With: {getOtherParticipant(selectedConversation).name}
                  </p>
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
                    { value: 'harassment', label: 'Harassment', desc: 'Threatening or abusive messages' },
                    { value: 'spam', label: 'Spam', desc: 'Unwanted or repetitive messages' },
                    { value: 'fraud', label: 'Scam/Fraud', desc: 'Attempting to scam or defraud' },
                    { value: 'inappropriate', label: 'Inappropriate Content', desc: 'Offensive or explicit content' },
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
                  placeholder="Please provide more details about the issue..."
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
                  setReportCategory('harassment')
                  setReportDescription('')
                }}
                disabled={submittingReport}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReportConversation}
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

      {/* Ownership Verification Question Modal */}
      {showVerifyModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#ff7400]/20 flex items-center justify-center text-2xl">
                🔐
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Verify Ownership</h3>
                <p className="text-sm text-white/60">{selectedConversation.itemTitle}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-white/70 text-sm">
                Ask something only the true owner would know — e.g. "What's the phone wallpaper?",
                "What's written inside the cover?", "What's in the front pocket?"
              </p>
              <input
                type="text"
                value={verifyQuestion}
                onChange={(e) => setVerifyQuestion(e.target.value)}
                placeholder="Type your verification question…"
                disabled={claimBusy}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 transition-all disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyQuestion('');
                }}
                disabled={claimBusy}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAskQuestion}
                disabled={claimBusy || !verifyQuestion.trim()}
                className="flex-1 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {claimBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Item Modal */}
      {showClaimModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-lg w-full shadow-2xl p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Mark Item as Claimed</h3>
                <p className="text-sm text-white/60">{selectedConversation.itemTitle}</p>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4 mb-6">
              <p className="text-white/70 text-sm">
                Set a meetup location on campus where you'll hand over the item.
              </p>

              <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Meetup Location
                </label>
                <input
                  type="text"
                  value={meetupLocation}
                  onChange={(e) => setMeetupLocation(e.target.value)}
                  placeholder="e.g., Main Gate, Library Entrance, Cafeteria..."
                  disabled={claimingItem}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-green-500/50 transition-all disabled:opacity-50"
                />
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-200/90 text-sm">
                  💡 Choose a public, well-lit location on campus for safety.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setMeetupLocation('');
                }}
                disabled={claimingItem}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimItem}
                disabled={claimingItem || !meetupLocation.trim()}
                className="flex-1 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {claimingItem ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Claim
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#2f1632] border border-white/10 rounded-3xl max-w-4xl w-full shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#ff7400]/20 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-[#ff7400]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Share Location</h3>
                  <p className="text-sm text-white/60">Click on the map to set a pin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  if (!locationPin) {
                    setRoomNumber('');
                  }
                }}
                className="w-10 h-10 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Floor Plan Selector */}
            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2 font-medium">Select Floor</label>
              <div className="flex gap-2 flex-wrap">
                {floorPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => {
                      setSelectedFloorPlan(plan.id);
                      setLocationPin(null);
                    }}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      selectedFloorPlan === plan.id
                        ? 'bg-[#ff7400] text-white'
                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Floor Plan Map */}
            <div className="mb-4">
              <div
                className="relative aspect-video rounded-xl overflow-hidden bg-[#1a0d1c] border-2 border-white/10 cursor-crosshair hover:border-[#ff7400]/50 transition-all"
                onClick={handleFloorPlanClick}
              >
                <img
                  src={getFloorPlan(selectedFloorPlan)?.imageUrl || '/floor-plans/ground_floor.png'}
                  alt="Floor Plan"
                  className="w-full h-full object-contain pointer-events-none"
                />
                
                {/* Location Pin */}
                {locationPin && (
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 animate-bounce"
                    style={{
                      left: `${locationPin.x}%`,
                      top: `${locationPin.y}%`,
                    }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#ff7400] animate-ping opacity-75"></div>
                      <div className="relative w-10 h-10 rounded-full bg-[#ff7400] border-4 border-white shadow-2xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-white/50 mt-2 text-center">
                Click anywhere on the map to place your location pin
              </p>
            </div>

            {/* Room Number Input */}
            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2 font-medium">
                Room/Location Name (Optional)
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g., Room 301, Library Entrance, Cafeteria..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#ff7400]/50 transition-all"
              />
            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  if (!locationPin) {
                    setRoomNumber('');
                  }
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendLocation}
                disabled={!locationPin}
                className="flex-1 px-6 py-3 rounded-xl bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Set Location
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
