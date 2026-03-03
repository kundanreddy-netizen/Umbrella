// firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging
// Handles ALL notification display (data-only payloads from Cloud Function)

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

// ============================================================
// PUSH EVENT - Handle data-only messages from Cloud Function
// ============================================================
// Since we send data-only payloads (no notification key),
// FCM will NOT auto-display anything. We have full control here.

self.addEventListener('push', (event) => {
    console.log('[SW] Push event received:', event);

    let data = {};

    try {
        const payload = event.data?.json();
        console.log('[SW] Push payload:', payload);
        data = payload?.data || {};
    } catch (e) {
        console.error('[SW] Error parsing push payload:', e);
        data = { title: 'Umbrella', body: event.data?.text() || 'New update' };
    }

    const title = data.title || 'Umbrella Community';
    const options = {
        body: data.body || 'You have a new update',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        tag: 'umbrella-' + (data.type || 'general'),
        vibrate: [200, 100, 200],
        data: {
            link: data.link || 'https://kundanreddy-netizen.github.io/Umbrella/',
            type: data.type || 'general',
            announcementId: data.announcementId || null,
            timestamp: data.timestamp || Date.now().toString()
        },
        requireInteraction: false
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ============================================================
// NOTIFICATION CLICK - Open or focus the app
// ============================================================

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification);
    event.notification.close();

    const targetUrl = event.notification.data?.link || 'https://kundanreddy-netizen.github.io/Umbrella/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('/Umbrella') && 'focus' in client) {
                        console.log('[SW] Focusing existing tab:', client.url);
                        return client.focus();
                    }
                }
                console.log('[SW] Opening new tab:', targetUrl);
                return clients.openWindow(targetUrl);
            })
    );
});
