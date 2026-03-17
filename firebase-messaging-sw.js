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
    const title          = payload.notification?.title  || payload.data?.title || 'The Umbrella Connect';
    const body           = payload.notification?.body   || payload.data?.body  || 'New update in your community';

    // Store in cache so app can open it on resume (iOS PWA path)
    if (postId || announcementId) {
        caches.open('umbrella-pending').then(cache => {
            cache.put('/__pending-notification', new Response(JSON.stringify({
                postId:         postId,
                postType:       postType,
                announcementId: announcementId,
                timestamp:      Date.now()
            })));
            console.log('[SW] Stored pending notification:', postType, postId || announcementId);
        }).catch(err => console.error('[SW] Cache error:', err));
    }

    // Show custom notification with data embedded in the notification object
    // This ensures notificationclick can always read postId/postType
    const notificationOptions = {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: postId || announcementId || 'umbrella-notif',
        renotify: true,
        data: {
            postId:         postId,
            postType:       postType,
            announcementId: announcementId,
            url:            'https://theumbrellaconnect.com/'
        }
    };

    return self.registration.showNotification(title, notificationOptions);
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
        // Our custom notification puts data directly in event.notification.data
        const nd = event.notification.data || {};
        postId         = nd.postId         || '';
        postType       = nd.postType       || 'announcement';
        announcementId = nd.announcementId || '';
        // Fallback: FCM auto-notification wraps data in FCM_MSG
        if (!postId && !announcementId) {
            const fcmData = (nd.FCM_MSG && nd.FCM_MSG.data) ? nd.FCM_MSG.data : {};
            postId         = fcmData.postId         || '';
            postType       = fcmData.postType       || 'announcement';
            announcementId = fcmData.announcementId || '';
        }
        console.log('[SW] click — postType:', postType, 'postId:', postId, 'announcementId:', announcementId);
    } catch (e) {
        console.error('[SW] Error reading notification data:', e);
    }

    const baseUrl = 'https://theumbrellaconnect.com/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // If app is already open, message it to show the announcement
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url.indexOf('theumbrellaconnect') !== -1) {
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
