import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://lyfind-72845.web.app',
    'https://lyfind-72845.firebaseapp.com',
    'https://lyfind-campus-item-finder.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Secret']
}));
app.use(express.json());

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
try {
  let credential;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Decode base64 service account
    const serviceAccountJson = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    credential = admin.credential.cert(serviceAccount);
    console.log('✅ Using base64 encoded service account');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Use JSON string from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
    console.log('✅ Using JSON service account');
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    // Use individual environment variables
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    console.log('✅ Using individual environment variables');
  } else {
    throw new Error('No Firebase credentials found. Please set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT_JSON');
  }

  admin.initializeApp({ credential });
  console.log('🔥 Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.startsWith('FIREBASE')));
  process.exit(1);
}

const db = admin.firestore();
const messaging = admin.messaging();

// Helper function to send push notification
async function sendPushNotification(userId, notification) {
  console.log('🔔 [NEWLY UPDATED] === SENDING PUSH NOTIFICATION ===');
  console.log('👤 [NEWLY UPDATED] User ID:', userId);
  console.log('📧 [NEWLY UPDATED] Title:', notification.title);
  console.log('💬 [NEWLY UPDATED] Message:', notification.message);
  
  try {
    // Get user's FCM tokens
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`❌ [NEWLY UPDATED] User ${userId} not found`);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || [];

    console.log(`🔑 [NEWLY UPDATED] Found ${fcmTokens.length} FCM token(s) for user ${userId}`);
    
    if (fcmTokens.length === 0) {
      console.log(`❌ [NEWLY UPDATED] No FCM tokens for user ${userId}`);
      return { success: false, error: 'No FCM tokens' };
    }

    console.log(`📤 [NEWLY UPDATED] Sending notification to ${fcmTokens.length} device(s) for user ${userId}`);

    // Send to all user's devices
    const results = await Promise.allSettled(
      fcmTokens.map(async (token, index) => {
        console.log(`📱 [NEWLY UPDATED] Sending to device ${index + 1}/${fcmTokens.length}`);
        try {
          const response = await messaging.send({
            token,
            notification: {
              title: notification.title,
              body: notification.message,
            },
            data: {
              actionUrl: notification.actionUrl || '/notifications',
              notificationId: notification.notificationId || Date.now().toString(),
              type: notification.type || 'general',
            },
            webpush: {
              fcmOptions: {
                link: notification.actionUrl || '/notifications',
              },
              notification: {
                icon: '/Untitled design (3).png',
                badge: '/Untitled design (3).png',
                requireInteraction: false,
              },
            },
          });

          console.log(`✅ [NEWLY UPDATED] Notification sent successfully to device ${index + 1}:`, response);
          return { success: true, messageId: response };
        } catch (error) {
          console.error(`❌ [NEWLY UPDATED] Failed to send to device ${index + 1}:`, error.message);
          console.error(`❌ [NEWLY UPDATED] Error code:`, error.code);
          
          // Handle invalid tokens
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            console.log(`🗑️ [NEWLY UPDATED] Removing invalid token for user ${userId}`);
            // Remove invalid token
            await db.collection('users').doc(userId).update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
            });
          }
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 [NEWLY UPDATED] Notification results: ${successful} sent, ${failed} failed`);

    return {
      success: successful > 0,
      sent: successful,
      failed: failed,
      results,
    };
  } catch (error) {
    console.error('❌ [NEWLY UPDATED] Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

// API endpoint to send notification
app.post('/api/send-notification', async (req, res) => {
  console.log('🆕 [NEWLY UPDATED] Received notification request');
  console.log('📥 [NEWLY UPDATED] Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔑 [NEWLY UPDATED] API Secret provided:', req.headers['x-api-secret'] ? 'Yes' : 'No');
  
  try {
    const { userId, title, message, actionUrl, type, notificationId } = req.body;

    // Validate required fields
    if (!userId || !title || !message) {
      console.log('❌ [NEWLY UPDATED] Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, title, message',
      });
    }

    console.log('✅ [NEWLY UPDATED] All required fields present');

    // Optional: Verify API secret for security
    const apiSecret = req.headers['x-api-secret'];
    if (process.env.API_SECRET && apiSecret !== process.env.API_SECRET) {
      console.log('❌ [NEWLY UPDATED] Unauthorized - API secret mismatch');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    console.log('🚀 [NEWLY UPDATED] Calling sendPushNotification for user:', userId);
    const result = await sendPushNotification(userId, {
      title,
      message,
      actionUrl,
      type,
      notificationId,
    });

    console.log('📤 [NEWLY UPDATED] Push notification result:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('❌ [NEWLY UPDATED] Error in /api/send-notification:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Batch send notifications
app.post('/api/send-batch-notifications', async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'notifications must be a non-empty array',
      });
    }

    // Optional: Verify API secret
    const apiSecret = req.headers['x-api-secret'];
    if (process.env.API_SECRET && apiSecret !== process.env.API_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const results = await Promise.allSettled(
      notifications.map(notif => 
        sendPushNotification(notif.userId, {
          title: notif.title,
          message: notif.message,
          actionUrl: notif.actionUrl,
          type: notif.type,
          notificationId: notif.notificationId,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    res.json({
      success: true,
      total: notifications.length,
      successful,
      failed: notifications.length - successful,
      results,
    });
  } catch (error) {
    console.error('Error in /api/send-batch-notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'LyFind Notification Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      sendNotification: 'POST /api/send-notification',
      sendBatch: 'POST /api/send-batch-notifications',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🆕 ========================================');
  console.log('🆕 [NEWLY UPDATED] NOTIFICATION SERVER');
  console.log('🆕 ========================================');
  console.log(`🚀 [NEWLY UPDATED] Server running on port ${PORT}`);
  console.log(`📍 [NEWLY UPDATED] Health check: http://localhost:${PORT}/health`);
  console.log(`📍 [NEWLY UPDATED] API endpoint: http://localhost:${PORT}/api/send-notification`);
  console.log('🆕 ========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
