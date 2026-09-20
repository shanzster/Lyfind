// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyCvYOueHYtbbQm9NYNXQxzRhzOGkSWXDLw",
  authDomain: "lyfind-72845.firebaseapp.com",
  projectId: "lyfind-72845",
  storageBucket: "lyfind-72845.firebasestorage.app",
  messagingSenderId: "153935340746",
  appId: "1:153935340746:web:87ea7489649e48b3894033",
  measurementId: "G-JPED770NSS"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'LyFind';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/Untitled design (3).png',
    badge: '/Untitled design (3).png',
    tag: payload.data?.notificationId || 'default',
    data: {
      url: payload.data?.actionUrl || '/notifications',
      notificationId: payload.data?.notificationId,
    },
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              url: urlToOpen,
              notificationId: event.notification.data?.notificationId,
            });
            return;
          }
        }

        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
