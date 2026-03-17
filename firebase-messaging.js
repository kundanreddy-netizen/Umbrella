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

console.log('[SW] Firebase Messaging Service Worker loaded - v3');

// Firebase auto-displays notifications from the notification payload.
// We only handle the CLICK - no custom push handler, no duplicate risk.

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();

    // FCM stores our data payload under notification.data.FCM_MSG.data
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
                console.log('[SW] Open clients:', clientList.length);

                // If app is already open, message it to show the announcement
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url.indexOf('/Umbrella') !== -1) {
                        console.log('[SW] Messaging existing tab');
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
