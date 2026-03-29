// Firebase Messaging Service Worker
// Required for FCM push notifications on HTTPS (GitHub Pages)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDY_2X7mk9eCM24sVj0glrJhG7n2PSAff8",
    authDomain: "umbrella-6b57a.firebaseapp.com",
    projectId: "umbrella-6b57a",
    storageBucket: "umbrella-6b57a.firebasestorage.app",
    messagingSenderId: "636033970250",
    appId: "1:636033970250:web:a49918b1f0d6e46cdcb6b3"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const title = payload.notification?.title || payload.data?.title || 'New notification';
    const body  = payload.notification?.body  || payload.data?.body  || '';
    const postId   = payload.data?.postId   || '';
    const postType = payload.data?.postType || 'announcement';

    const options = {
        body,
        icon:  '/Umbrella/logo-icon.png',
        badge: '/Umbrella/logo-icon.png',
        data:  { postId, postType, url: '/Umbrella/resident.html' }
    };

    self.registration.showNotification(title, options);
});

// Handle notification click — open app and navigate to the post
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const { postId, postType, url } = event.notification.data || {};
    const target = postId
        ? url + '?postId=' + postId + '&postType=' + postType
        : (url || '/Umbrella/resident.html');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes('/Umbrella/') && 'focus' in client) {
                    client.postMessage({ type: 'OPEN_POST', postId, postType });
                    return client.focus();
                }
            }
            return clients.openWindow(target);
        })
    );
});
