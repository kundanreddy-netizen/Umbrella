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

console.log('[SW] Firebase Messaging Service Worker loaded - Announcements only');

// Firebase automatically handles notification display when message contains notification payload.
// We do NOT add a custom push handler to avoid duplicate notifications.

// Handle notification click - open announcement popup in the app
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    // Extract announcementId from the FCM data payload
    const fcmData = event.notification.data?.FCM_MSG?.data || {};
    const announcementId = fcmData.announcementId || '';
    const baseUrl = 'https://kundanreddy-netizen.github.io/Umbrella/';
    const targetUrl = announcementId ? baseUrl + '?announcementId=' + announcementId : baseUrl;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If the app is already open in a tab, focus it and tell it to open the announcement
                for (const client of clientList) {
                    if (client.url.includes('/Umbrella') && 'focus' in client) {
                        // Send message to the page to open the announcement popup
                        if (announcementId) {
                            client.postMessage({
                                type: 'OPEN_ANNOUNCEMENT',
                                announcementId: announcementId
                            });
                        }
                        return client.focus();
                    }
                }
                // App not open - open it with the announcementId as URL parameter
                return clients.openWindow(targetUrl);
            })
    );
});
