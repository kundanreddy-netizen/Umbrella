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
    const postId         = payload.data?.postId         || '';
    const postType       = payload.data?.postType       || 'announcement';

    // Store whichever ID is present so the app can open it on resume
    if (postId || announcementId) {
        caches.open('umbrella-pending').then(cache => {
            cache.put('/__pending-notification', new Response(JSON.stringify({
                postId:         postId,
                postType:       postType,
                announcementId: announcementId, // legacy fallback
                timestamp:      Date.now()
            })));
            console.log('[SW] Stored pending notification:', postType, postId || announcementId);
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
    let postId         = '';
    let postType       = 'announcement';
    try {
        const nd = event.notification.data || {};
        const fcmData = (nd.FCM_MSG && nd.FCM_MSG.data) ? nd.FCM_MSG.data : nd;
        announcementId = fcmData.announcementId || '';
        postId         = fcmData.postId         || '';
        postType       = fcmData.postType       || 'announcement';
        console.log('[SW] click data — postType:', postType, 'postId:', postId, 'announcementId:', announcementId);
    } catch (e) {
        console.error('[SW] Error reading notification data:', e);
    }

    const baseUrl = 'https://kundanreddy-netizen.github.io/Umbrella/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // If app is already open, message it to show the announcement
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url.indexOf('/Umbrella') !== -1 ||
                        client.url.indexOf('theumbrellaconnect') !== -1) {
                        console.log('[SW] Messaging open tab');
                        if (postId) {
                            client.postMessage({ type: 'OPEN_POST', postId: postId, postType: postType });
                        } else if (announcementId) {
                            client.postMessage({ type: 'OPEN_ANNOUNCEMENT', announcementId: announcementId });
                        }
                        return client.focus();
                    }
                }
                // App not open - build deep link URL with correct params
                var url = postId
                    ? baseUrl + '?postId=' + postId + '&postType=' + postType
                    : (announcementId ? baseUrl + '?announcementId=' + announcementId : baseUrl);
                console.log('[SW] Opening:', url);
                return clients.openWindow(url);
            })
    );
});
