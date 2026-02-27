// Firebase Messaging Service Worker
// This handles push notifications when the app is in the background or closed

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

// Handle background messages
messaging.onBackgroundMessage(async (payload) => {
    console.log('[Service Worker] Received background message:', payload);

    // Check if any client window is currently visible and focused
    const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    });
    
    console.log('[Service Worker] Total clients:', allClients.length);
    
    let hasVisibleClient = false;
    for (const client of allClients) {
        console.log('[Service Worker] Client:', client.url, 'Visibility:', client.visibilityState, 'Focused:', client.focused);
        if (client.visibilityState === 'visible') {
            hasVisibleClient = true;
            console.log('[Service Worker] Found visible client - suppressing notification');
            break;
        }
    }
    
    // Only show notification if no visible clients
    if (!hasVisibleClient) {
        console.log('[Service Worker] No visible clients - showing notification');
        const notificationTitle = payload.notification?.title || 'New Update from Umbrella';
        const notificationOptions = {
            body: payload.notification?.body || 'You have a new notification',
            tag: payload.data?.type || 'general',
            data: payload.data,
            vibrate: [200, 100, 200],
            requireInteraction: false
        };

        return self.registration.showNotification(notificationTitle, notificationOptions);
    } else {
        console.log('[Service Worker] Notification suppressed - app is visible');
        return Promise.resolve();
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click received:', event.notification.tag);

    event.notification.close();

    // Open the app or bring it to focus
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open, focus it
            for (let client of clientList) {
                if (client.url.includes('umbrella') && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Otherwise open new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
