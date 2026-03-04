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

console.log('[SW] Firebase Messaging Service Worker loaded');

// FCM auto-displays notifications when the message contains a notification key.
// We do NOT add a custom push handler to avoid duplicate notifications.
// The Cloud Function sends notification + data payload, so FCM handles display.

// Handle notification click - open or focus the app
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    const targetUrl = event.notification.data?.FCM_MSG?.data?.link
        || event.notification.data?.link
        || 'https://kundanreddy-netizen.github.io/Umbrella/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open in a tab, focus it
                for (const client of clientList) {
                    if (client.url.includes('/Umbrella') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new tab
                return clients.openWindow(targetUrl);
            })
    );
});
