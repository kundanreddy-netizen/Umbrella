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

// Handle background messages (data-only messages from Edge Function)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    // Data-only messages have everything in payload.data (all lowercase keys)
    const title = payload.data?.title || 'New notification';
    const body  = payload.data?.body  || '';
    const postid   = payload.data?.postid   || '';
    const posttype = payload.data?.posttype || payload.data?.type || 'announcement';

    const options = {
        body,
        icon:  '/Umbrella/logo-icon.png',
        badge: '/Umbrella/logo-icon.png',
        tag: postid || Date.now().toString(), // Prevent duplicate notifications
        renotify: true,
        data: { postid: postid, posttype: posttype, url: '/Umbrella/resident.html' }
    };

    self.registration.showNotification(title, options);
});

// Handle notification click — open app and navigate to the post
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const { postid, posttype, url } = event.notification.data || {};
    
    console.log('[SW] Notification clicked:', { postid, posttype });
    
    // Build target URL with lowercase params (matches resident.html)
    const target = postid
        ? (url || '/Umbrella/resident.html') + '?postid=' + postid + '&posttype=' + posttype
        : (url || '/Umbrella/resident.html');

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            // If app is already open, focus it and send message to open the post
            for (const client of list) {
                if (client.url.includes('/Umbrella/') && 'focus' in client) {
                    console.log('[SW] App already open, sending OPEN_POST message');
                    client.postMessage({ type: 'OPEN_POST', postid, posttype });
                    return client.focus();
                }
            }
            // Otherwise open a new window with the deep link
            console.log('[SW] Opening new window:', target);
            return clients.openWindow(target);
        })
    );
});
