# LyFind - Lost & Found Platform

A full-stack application with Node.js/Express backend, Vite React frontend, and Firebase integration.

## Project Structure

```
/client          - Vite React frontend (moved to root)
/server          - Express Node.js backend
/src             - React source code
  /components    - Reusable UI components
  /pages         - Page components
  /contexts      - React contexts (Auth, etc.)
  /services      - Firebase services
  /lib           - Utilities and Firebase config
```

## Tech Stack

### Frontend
- React 19
- Vite
- React Router
- TailwindCSS
- shadcn/ui Components
- Firebase SDK (Auth, Firestore, Storage)

### Backend
- Node.js
- Express
- TypeScript
- CORS

### Firebase Services
- Authentication (Email/Password)
- Firestore Database
- Cloud Storage
- Analytics

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Firebase project (already configured)

### Install Dependencies

```bash
npm install
```

### Firebase Configuration

Firebase is already configured in `src/lib/firebase.ts` with:
- Authentication
- Firestore Database
- Cloud Storage
- Analytics

### Run Development Servers

```bash
# Frontend (Vite)
npm run dev

# Backend (Express) - in separate terminal
npm run server
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## Firebase Services

### Authentication
- Email/Password sign up and login
- User profile management
- Protected routes

### Firestore Collections
- `items` - Lost and found items
- `photoMatches` - AI photo matching requests
- `messages` - User messages
- `notifications` - User notifications

### Storage Buckets
- `items/{userId}/{itemId}/` - Item photos
- `photo-matches/{userId}/` - Photo match uploads

## Features

### Implemented
✅ Firebase Authentication
✅ Firestore Database Integration
✅ Cloud Storage for Images
✅ Photo Matching AI (Frontend with Queue System)
✅ Item Management Service
✅ Image Upload & Compression
✅ Real-time Auth State Management

### To Implement
- [ ] Cloud Functions for AI Processing
- [ ] Real-time Notifications
- [ ] Messaging System
- [ ] Campus Map Integration (Leaflet)
- [ ] PWA Features
- [ ] TensorFlow.js Integration

## API Endpoints

### Backend (Express)
- `GET /api/health` - Health check
- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Firebase Services (Client-side)
- `itemService` - CRUD operations for items
- `photoMatchService` - Photo matching requests
- `storageService` - Image upload and management

## Environment Variables

Create `.env` file in root:

```env
# Firebase (already configured in code)
VITE_FIREBASE_API_KEY=AIzaSyCvYOueHYtbbQm9NYNXQxzRhzOGkSWXDLw
VITE_FIREBASE_AUTH_DOMAIN=lyfind-72845.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lyfind-72845
```

## Development

### Project Commands

```bash
# Install dependencies
npm install

# Run frontend dev server
npm run dev

# Run backend dev server
npm run server

# Build for production
npm run build

# Preview production build
npm run preview
```

### Firebase Emulators (Optional)

For local development with Firebase emulators:

```bash
firebase emulators:start
```

## Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render)
```bash
cd server
npm run build
npm start
```

### Firebase Hosting
```bash
npm run build
firebase deploy
```

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT
