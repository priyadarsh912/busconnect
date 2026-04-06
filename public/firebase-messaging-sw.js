importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyALRQwCghwF4WFVOlG-iqbTg6hTn9GZdqc",
  authDomain: "bus-connect-1bfe7.firebaseapp.com",
  projectId: "bus-connect-1bfe7",
  storageBucket: "bus-connect-1bfe7.firebasestorage.app",
  messagingSenderId: "460177790787",
  appId: "1:460177790787:web:d0210ffde8766c5e73c1f6"
};

try {
  // Initialize the Firebase app in the service worker by passing the generated config
  firebase.initializeApp(firebaseConfig);

  // Retrieve an instance of Firebase Messaging
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title || "BusConnect Alert";
    const notificationOptions = {
      body: payload.notification.body || "You have a new notification regarding your journey.",
      icon: '/vite.svg'
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error("Firebase Service Worker error:", error);
}
