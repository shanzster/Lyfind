# LyFind Notification Server

Simple Node.js backend server that sends push notifications via Firebase Cloud Messaging.

## Features

- ✅ Send push notifications to individual users
- ✅ Batch send to multiple users
- ✅ Automatic invalid token cleanup
- ✅ Multi-device support per user
- ✅ Health check endpoint
- ✅ CORS enabled
- ✅ Environment-based configuration

## Setup

### 1. Install Dependencies

```bash
cd notification-server
npm install
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `lyfind-72845`
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file as `service-account-key.json` in this directory

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase credentials from the service account JSON:

```env
FIREBASE_PROJECT_ID=lyfind-72845
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@lyfind-72845.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----\n"
PORT=3001
API_SECRET=your-random-secret-key
```

**Important:** The private key must include `\n` for line breaks.

### 4. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Send Single Notification

```bash
POST /api/send-notification
Content-Type: application/json
X-API-Secret: your-secret-key

{
  "userId": "user123",
  "title": "New Message",
  "message": "You have a new message from John",
  "actionUrl": "/messages",
  "type": "message"
}
```

### Send Batch Notifications

```bash
POST /api/send-batch-notifications
Content-Type: application/json
X-API-Secret: your-secret-key

{
  "notifications": [
    {
      "userId": "user1",
      "title": "Match Found",
      "message": "Your lost item may have been found!",
      "actionUrl": "/matches"
    },
    {
      "userId": "user2",
      "title": "Item Approved",
      "message": "Your post has been approved",
      "actionUrl": "/my-items"
    }
  ]
}
```

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

## Integration with Your App

Update your notification service to call this backend:

```typescript
// src/services/notificationService.ts

const NOTIFICATION_SERVER_URL = 'https://your-server.com'; // or http://localhost:3001 for dev
const API_SECRET = 'your-secret-key';

export const notificationService = {
  async createNotification(notificationData) {
    // Save to Firestore (existing code)
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      read: false,
      createdAt: Timestamp.now(),
    });

    // Send push notification via backend
    try {
      await fetch(`${NOTIFICATION_SERVER_URL}/api/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': API_SECRET,
        },
        body: JSON.stringify({
          userId: notificationData.userId,
          title: notificationData.title,
          message: notificationData.message,
          actionUrl: notificationData.actionUrl,
          type: notificationData.type,
          notificationId: docRef.id,
        }),
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
      // Don't throw - notification is still saved in Firestore
    }

    return docRef.id;
  },
};
```

## Deployment

### Option 1: Render.com (Recommended - FREE)

1. Create account at [render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** lyfind-notifications
   - **Environment:** Node
   - **Build Command:** `cd notification-server && npm install`
   - **Start Command:** `cd notification-server && npm start`
   - **Plan:** Free
5. Add environment variables from your `.env`
6. Deploy!

Your server will be at: `https://lyfind-notifications.onrender.com`

### Option 2: Railway.app (FREE)

1. Create account at [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select your repo
4. Add environment variables
5. Deploy!

### Option 3: Vercel (FREE)

1. Create account at [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Configure as Node.js project
4. Add environment variables
5. Deploy!

## Security

- ✅ Use `X-API-Secret` header for authentication
- ✅ Keep `.env` file secret (never commit)
- ✅ Use HTTPS in production
- ✅ Rotate API secrets regularly
- ✅ Monitor for unusual activity

## Monitoring

Check server health:
```bash
curl https://your-server.com/health
```

View logs on your hosting platform's dashboard.

## Troubleshooting

### Server won't start
- Check if port 3001 is available
- Verify Firebase credentials in `.env`
- Check Node.js version (requires 18+)

### Notifications not sending
- Verify FCM tokens exist in Firestore
- Check Firebase Admin SDK credentials
- Verify user has granted notification permission
- Check server logs for errors

### Invalid tokens
- Server automatically removes invalid tokens
- Users need to re-grant permission if token expires

## Cost

**FREE** on:
- Render.com (750 hours/month free)
- Railway.app ($5 credit/month)
- Vercel (unlimited hobby projects)

For a campus app, you'll likely stay within free tier limits.

## Support

For issues, check:
1. Server logs
2. Firebase Console → Cloud Messaging
3. Browser console for FCM errors
4. Network tab for API calls
