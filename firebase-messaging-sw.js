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

console.log('[SW] Firebase Messaging Service Worker loaded - v4');

// ============================================================
// BACKGROUND MESSAGE HANDLER
// ============================================================
// When a push notification arrives while app is in background,
// store the announcementId so the app can open it when resumed.
// FCM still auto-displays the notification (we have notification key).
// This handler does NOT call showNotification - no duplicate risk.

messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    
    const announcementId = payload.data?.announcementId || '';
    if (announcementId) {
        // Store in Cache API - readable by the page on visibilitychange
        caches.open('umbrella-pending').then(cache => {
            cache.put('/__pending-notification', new Response(JSON.stringify({
                announcementId: announcementId,
                type: payload.data?.type || 'announcement',
                timestamp: Date.now()
            })));
            console.log('[SW] Stored pending notification:', announcementId);
        }).catch(err => console.error('[SW] Cache error:', err));
    }
});

// ============================================================
// NOTIFICATION CLICK HANDLER (Desktop / Android)
// ============================================================
// On iOS PWAs this may not fire, but the cache approach above covers that.

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    // Extract announcementId from FCM data
    let announcementId = '';
    try {
        const nd = event.notification.data || {};
        announcementId = (nd.FCM_MSG && nd.FCM_MSG.data && nd.FCM_MSG.data.announcementId) || '';
        console.log('[SW] announcementId:', announcementId);
    } catch (e) {
        console.error('[SW] Error reading data:', e);
    }

    const baseUrl = 'https://kundanreddy-netizen.github.io/Umbrella/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // If app is already open, message it to show the announcement
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url.indexOf('/Umbrella') !== -1) {
                        console.log('[SW] Messaging open tab');
                        if (announcementId) {
                            client.postMessage({
                                type: 'OPEN_ANNOUNCEMENT',
                                announcementId: announcementId
                            });
                        }
                        return client.focus();
                    }
                }
                // App not open - open with deep link
                var url = announcementId
                    ? baseUrl + '?announcementId=' + announcementId
                    : baseUrl;
                console.log('[SW] Opening:', url);
                return clients.openWindow(url);
            })
    );
});
