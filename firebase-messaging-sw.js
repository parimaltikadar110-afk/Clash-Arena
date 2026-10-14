importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBSXD78Ghvt7IDP83i46alGaV46ceB9Zq8",
  authDomain: "clashx7.firebaseapp.com",
  projectId: "clashx7",
  storageBucket: "clashx7.firebasestorage.app",
  messagingSenderId: "199379966933",
  appId: "1:199379966933:web:f05e046c07ef7e41567b5c"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
