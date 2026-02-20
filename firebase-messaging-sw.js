// Service Worker for Umbrella App
// This enables push notifications and offline functionality

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDY_2X7mk9eCM24sVj0glrJhG7n2PSAff8",
    authDomain: "umbrella-6b57a.firebaseapp.com",
    projectId: "umbrella-6b57a",
    storageBucket: "umbrella-6b57a.firebasestorage.app",
    messagingSenderId: "636033970250",
    appId: "1:636033970250:web:a49918b1f0d6e46cdcb6b3",
    measurementId: "G-Y7VH8K070Z"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification.title || 'Umbrella';
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/umbrella-icon-192.png',
        badge: '/umbrella-icon-72.png',
        tag: payload.data?.type || 'announcement',
        requireInteraction: false,
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    event.notification.close();

    // Open the app
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Cache for offline functionality
const CACHE_NAME = 'umbrella-v1';
const urlsToCache = [
    '/',
    '/index.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
