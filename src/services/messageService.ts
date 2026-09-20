import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notificationService } from './notificationService';

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  images?: string[]; // Array of image URLs
  location?: {
    floorPlanId: string;
    x: number;
    y: number;
    roomNumber?: string;
  };
  read: boolean;
  createdAt: Timestamp;
}

// Ownership verification: the item owner asks a question only the true owner
// of the lost item could answer; the claimer replies; the owner approves.
export interface ClaimVerification {
  status: 'awaiting_answer' | 'awaiting_review' | 'approved' | 'rejected';
  question: string;
  answer?: string;
  claimerId: string;
  updatedAt: Timestamp;
}

// Two-sided handover: both parties confirm the physical exchange happened
export interface HandoverState {
  ownerConfirmed: boolean;
  claimerConfirmed: boolean;
}

export interface Conversation {
  id?: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  itemType: 'lost' | 'found';
  participants: string[]; // [itemOwnerId, inquirerId]
  participantNames: { [userId: string]: string };
  participantPhotos: { [userId: string]: string };
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount: { [userId: string]: number };
  // Per-user "last typed at" timestamps; a recent timestamp = currently typing
  typing?: { [userId: string]: Timestamp };
  claim?: ClaimVerification;
  handover?: HandoverState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

export const messageService = {
  // Create or get existing conversation.
  // Policy: teacher ↔ student direct messaging is not allowed — students are
  // told to contact the teacher via email instead. Throws an error with
  // code 'teacher-student-blocked' and contactEmail set.
  async createConversation(
    itemId: string,
    itemTitle: string,
    itemImage: string,
    itemType: 'lost' | 'found',
    itemOwnerId: string,
    itemOwnerName: string,
    inquirerId: string,
    inquirerName: string,
    inquirerPhoto?: string,
    itemOwnerPhoto?: string
  ): Promise<string> {
    // Enforce the no-teacher↔student-messaging policy before anything else
    const { userService } = await import('./userService');
    const [ownerProfile, inquirerProfile] = await Promise.all([
      userService.getUserProfile(itemOwnerId),
      userService.getUserProfile(inquirerId),
    ]);
    const rolePair = [ownerProfile?.role, inquirerProfile?.role];
    if (rolePair.includes('faculty') && rolePair.includes('student')) {
      const error: any = new Error('Teacher-student messaging is not allowed');
      error.code = 'teacher-student-blocked';
      error.contactEmail = ownerProfile?.email || '';
      error.contactName = ownerProfile?.displayName || 'the poster';
      throw error;
    }

    // Check if conversation already exists
    const existingConv = await this.getConversationByItemAndUsers(
      itemId,
      itemOwnerId,
      inquirerId
    );

    if (existingConv) {
      return existingConv.id!;
    }

    // Create new conversation
    const conversationData: Omit<Conversation, 'id'> = {
      itemId,
      itemTitle,
      itemImage,
      itemType,
      participants: [itemOwnerId, inquirerId],
      participantNames: {
        [itemOwnerId]: itemOwnerName,
        [inquirerId]: inquirerName,
      },
      participantPhotos: {
        [itemOwnerId]: itemOwnerPhoto || '',
        [inquirerId]: inquirerPhoto || '',
      },
      unreadCount: {
        [itemOwnerId]: 0,
        [inquirerId]: 0,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, CONVERSATIONS_COLLECTION),
      conversationData
    );
    return docRef.id;
  },

  // Get conversation by item and users
  // NOTE: security rules only allow reading conversations the CURRENT user
  // participates in, so the array-contains filter must use the caller's uid
  // (userId2 = inquirer = current user in the createConversation flow).
  async getConversationByItemAndUsers(
    itemId: string,
    userId1: string,
    userId2: string
  ): Promise<Conversation | null> {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('itemId', '==', itemId),
      where('participants', 'array-contains', userId2)
    );

    const snapshot = await getDocs(q);
    const conversation = snapshot.docs.find((doc) => {
      const data = doc.data();
      return data.participants.includes(userId1);
    });

    if (conversation) {
      return { id: conversation.id, ...conversation.data() } as Conversation;
    }
    return null;
  },

  // Get user's conversations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Conversation)
    );
  },

  // Listen to user's conversations (real-time)
  listenToUserConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ) {
    const q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Conversation)
      );
      callback(conversations);
    });
  },

  // Send message
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    content: string,
    senderPhoto?: string,
    images?: string[],
    location?: { floorPlanId: string; x: number; y: number; roomNumber?: string }
  ): Promise<void> {
    // Add message - only include senderPhoto if it exists
    const messageData: any = {
      conversationId,
      senderId,
      senderName,
      content,
      read: false,
      createdAt: Timestamp.now(),
    };

    // Only add senderPhoto if it has a value
    if (senderPhoto) {
      messageData.senderPhoto = senderPhoto;
    }

    // Only add images if they exist
    if (images && images.length > 0) {
      messageData.images = images;
    }

    // Only add location if it exists
    if (location) {
      messageData.location = location;
    }

    await addDoc(collection(db, MESSAGES_COLLECTION), messageData);

    // Update conversation
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    const conversationData = conversationSnap.data() as Conversation;

    // Increment unread count for other participant
    const otherUserId = conversationData.participants.find(
      (id) => id !== senderId
    )!;
    const newUnreadCount = {
      ...conversationData.unreadCount,
      [otherUserId]: (conversationData.unreadCount[otherUserId] || 0) + 1,
    };

    await updateDoc(conversationRef, {
      lastMessage: content,
      lastMessageTime: Timestamp.now(),
      updatedAt: Timestamp.now(),
      unreadCount: newUnreadCount,
    });

    // Send notification to recipient
    try {
      await notificationService.notifyNewMessage(
        otherUserId,
        senderName,
        senderId,
        conversationId
      );
    } catch (error) {
      console.error('[MessageService] Failed to send notification:', error);
      // Don't throw - message was sent successfully
    }
  },

  // Get messages for conversation
  async getMessages(conversationId: string): Promise<Message[]> {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Message)
    );
  },

  // Alias for getMessages (for consistency)
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.getMessages(conversationId);
  },

  // Listen to messages (real-time)
  listenToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ) {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Message)
      );
      callback(messages);
    });
  },

  // Mark conversation as read
  // Update this user's typing timestamp on the conversation (throttled by caller).
  // Recent timestamp = typing; stale/absent = not typing. Fire-and-forget.
  async setTyping(conversationId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
        [`typing.${userId}`]: Timestamp.now(),
      });
    } catch {
      // Non-critical; ignore failures
    }
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    const conversationData = conversationSnap.data() as Conversation;

    const newUnreadCount = {
      ...conversationData.unreadCount,
      [userId]: 0,
    };

    await updateDoc(conversationRef, {
      unreadCount: newUnreadCount,
    });

    // Mark all messages as read
    const messagesQuery = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(messagesQuery);
    const updatePromises = snapshot.docs
      .filter((doc) => doc.data().senderId !== userId)
      .map((doc) => updateDoc(doc.ref, { read: true }));

    await Promise.all(updatePromises);
  },

  // Get total unread count for user
  async getTotalUnreadCount(userId: string): Promise<number> {
    const conversations = await this.getUserConversations(userId);
    return conversations.reduce(
      (total, conv) => total + (conv.unreadCount[userId] || 0),
      0
    );
  },

  // Mark item as claimed.
  // `claimedBy` must be the RECEIVING party (the other participant in the
  // conversation), not the item owner performing the action.
  // ── Claim verification flow ────────────────────────────────────────────

  async sendSystemMessage(conversationId: string, content: string): Promise<void> {
    await addDoc(collection(db, MESSAGES_COLLECTION), {
      conversationId,
      senderId: 'system',
      senderName: 'System',
      content,
      read: false,
      createdAt: Timestamp.now(),
    });
  },

  // Owner asks the claimer a question only the true owner could answer
  async askClaimQuestion(
    conversationId: string,
    question: string,
    claimerId: string
  ): Promise<void> {
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      claim: {
        status: 'awaiting_answer',
        question,
        claimerId,
        updatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });
    await this.sendSystemMessage(
      conversationId,
      `🔐 Ownership verification started — a question was sent to the claimer: "${question}"`
    );
  },

  async answerClaimQuestion(
    conversationId: string,
    claim: ClaimVerification,
    answer: string
  ): Promise<void> {
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      claim: { ...claim, status: 'awaiting_review', answer, updatedAt: Timestamp.now() },
      updatedAt: Timestamp.now(),
    });
    await this.sendSystemMessage(
      conversationId,
      '📝 The claimer submitted an answer — waiting for the owner to review it.'
    );
  },

  async reviewClaim(
    conversationId: string,
    claim: ClaimVerification,
    approved: boolean
  ): Promise<void> {
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      claim: {
        ...claim,
        status: approved ? 'approved' : 'rejected',
        updatedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });
    await this.sendSystemMessage(
      conversationId,
      approved
        ? '✅ Ownership verified! The owner approved the answer. You can now arrange the handover.'
        : '❌ Verification failed — the owner rejected the answer.'
    );
  },

  // Two-sided handover confirmation. When both sides have confirmed, a
  // completion message is posted.
  async confirmHandover(
    conversationId: string,
    handover: HandoverState | undefined,
    isOwner: boolean
  ): Promise<void> {
    const next: HandoverState = {
      ownerConfirmed: (handover?.ownerConfirmed || false) || isOwner,
      claimerConfirmed: (handover?.claimerConfirmed || false) || !isOwner,
    };
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      handover: next,
      updatedAt: Timestamp.now(),
    });
    if (next.ownerConfirmed && next.claimerConfirmed) {
      await this.sendSystemMessage(
        conversationId,
        '🎉 Handover complete! Both sides confirmed the item was returned. Another successful reunion on LyFind!'
      );
    } else {
      await this.sendSystemMessage(
        conversationId,
        isOwner
          ? '🤝 The owner confirmed handing over the item — waiting for the claimer to confirm receiving it.'
          : '🤝 The claimer confirmed receiving the item — waiting for the owner to confirm.'
      );
    }
  },

  async markItemAsClaimed(
    conversationId: string,
    itemId: string,
    itemTitle: string,
    claimedBy: string,
    meetupLocation: { name: string; coordinates?: { lat: number; lng: number } }
  ): Promise<void> {
    // Update item status
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      status: 'resolved',
      claimedBy,
      claimedAt: Timestamp.now(),
      meetupLocation,
      updatedAt: Timestamp.now(),
    });

    // Start the two-sided handover confirmation
    await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
      handover: { ownerConfirmed: false, claimerConfirmed: false },
      updatedAt: Timestamp.now(),
    });

    // Send system message to conversation
    await addDoc(collection(db, MESSAGES_COLLECTION), {
      conversationId,
      senderId: 'system',
      senderName: 'System',
      content: `Item marked as claimed! Meetup location: ${meetupLocation.name}`,
      read: false,
      createdAt: Timestamp.now(),
    });

    // Notify the claimer (non-fatal)
    try {
      const { notificationService } = await import('./notificationService');
      await notificationService.notifyItemClaimed(claimedBy, itemTitle, itemId, meetupLocation.name);
    } catch (error) {
      console.error('[MessageService] Failed to send claim notification:', error);
    }
  },
};
