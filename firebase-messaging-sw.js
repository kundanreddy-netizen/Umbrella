// Firebase Messaging Service Worker - ANNOUNCEMENTS ONLY
// Simple, minimal implementation
// Background notifications only (when app is closed/minimized)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyDY_2X7mk9eCM24sVj0glrJhG7n2PSAff8",
    authDomain: "umbrella-6b57a.firebaseapp.com",
    projectId: "umbrella-6b57a",
    storageBucket: "umbrella-6b57a.firebasestorage.app",
    messagingSenderId: "636033970250",
    appId: "1:636033970250:web:a49918b1f0d6e46cdcb6b3"
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || 'New Announcement';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/umbrella-icon.png',
        badge: '/umbrella-badge.png',
        tag: 'umbrella-announcement', // Same tag prevents duplicates
        requireInteraction: false,
        data: payload.data
    };

    console.log('[SW] Showing notification:', notificationTitle);
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();
    
    // Open the app
    event.waitUntil(
        clients.openWindow('https://kundanreddy-netizen.github.io/Umbrella/')
    );
});

console.log('[SW] Service worker loaded - Announcements only');
