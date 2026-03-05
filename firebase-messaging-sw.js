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

console.log('[SW] Firebase Messaging Service Worker loaded - v2');

// Firebase automatically handles notification display when message contains notification payload.
// We do NOT add a custom push handler to avoid duplicate notifications.

// Store pending announcement ID for when the app opens
let pendingAnnouncementId = null;

// Handle notification click - open announcement popup in the app
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    console.log('[SW] Notification data:', JSON.stringify(event.notification.data));
    event.notification.close();

    // Extract announcementId - FCM stores data under FCM_MSG.data
    let announcementId = '';
    try {
        const notifData = event.notification.data || {};
        // FCM puts custom data under FCM_MSG.data when using notification+data payload
        announcementId = notifData?.FCM_MSG?.data?.announcementId 
                      || notifData?.announcementId 
                      || '';
        console.log('[SW] Extracted announcementId:', announcementId);
    } catch (e) {
        console.error('[SW] Error extracting announcementId:', e);
    }

    const baseUrl = 'https://kundanreddy-netizen.github.io/Umbrella/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                console.log('[SW] Found', clientList.length, 'open clients');

                // If the app is already open, message it to open the announcement
                for (const client of clientList) {
                    if (client.url.includes('/Umbrella')) {
                        console.log('[SW] Found open Umbrella tab, sending message');
                        if (announcementId) {
                            client.postMessage({
                                type: 'OPEN_ANNOUNCEMENT',
                                announcementId: announcementId
                            });
                        }
                        return client.focus();
                    }
                }

                // App not open - open with announcementId in URL
                const targetUrl = announcementId 
                    ? baseUrl + '?announcementId=' + announcementId 
                    : baseUrl;
                console.log('[SW] Opening new window:', targetUrl);
                return clients.openWindow(targetUrl);
            })
    );
});

// Respond to page asking for pending announcement
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_PENDING_ANNOUNCEMENT') {
        event.ports[0].postMessage({ announcementId: pendingAnnouncementId });
        pendingAnnouncementId = null;
    }
});
