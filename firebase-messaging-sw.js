// firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
    apiKey: "AIzaSyDY_2X7mk9eCM24sVj0glrJhG7n2PSAff8",
    authDomain: "umbrella-6b57a.firebaseapp.com",
    projectId: "umbrella-6b57a",
    storageBucket: "umbrella-6b57a.firebasestorage.app",
    messagingSenderId: "636033970250",
    appId: "1:636033970250:web:a49918b1f0d6e46cdcb6b3"
});

const messaging = firebase.messaging();

// Handle background messages (data-only)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    // Extract data from payload
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Umbrella';
    const notificationBody = payload.notification?.body || payload.data?.body || 'New announcement';
    
    const notificationOptions = {
        body: notificationBody,
        // Removed icon and badge to avoid 404 errors
        tag: 'announcement',
        requireInteraction: false,
        data: {
            url: payload.data?.click_action || self.location.origin,
            type: payload.data?.type
        }
    };
    
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked');
    
    event.notification.close();
    
    // Open the app at the correct URL
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Check if app is already open
            for (let client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not open, open new window with full URL
            if (clients.openWindow) {
                return clients.openWindow(self.location.origin);
            }
        })
    );
});
