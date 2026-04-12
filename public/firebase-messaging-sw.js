// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyALRQwCghwF4WFVOlG-iqbTg6hTn9GZdqc",
  authDomain: "bus-connect-1bfe7.firebaseapp.com",
  projectId: "bus-connect-1bfe7",
  storageBucket: "bus-connect-1bfe7.firebasestorage.app",
  messagingSenderId: "460177790787",
  appId: "1:460177790787:web:d0210ffde8766c5e73c1f6",
  measurementId: "G-KBQ5PHJPB7"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'BusConnect Update';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
