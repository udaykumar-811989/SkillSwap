/* eslint-disable no-undef */
/*
 * Firebase Cloud Messaging Service Worker
 *
 * IMPORTANT: Replace the Firebase config below with your actual config
 * from Firebase Console > Project Settings > General > Web app.
 *
 * The Firebase API key is safe to expose here - it's a public identifier
 * protected by Firebase Security Rules, not a secret.
 */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  const title = data.title || "SkillSwap";
  const options = {
    body: data.body || "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag || "skillswap-notification",
    renotify: true,
    data: {
      type: data.type || "general",
      conversationId: data.conversationId || null,
      callId: data.callId || null,
      callerId: data.callerId || null,
      requestId: data.requestId || null,
      sessionId: data.sessionId || null,
      senderId: data.senderId || null,
      url: data.url || "/",
    },
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = "/";

  if (data.type === "chat_message" && data.conversationId) {
    url = `/?page=chat&conversationId=${data.conversationId}&senderId=${data.senderId}`;
  } else if (data.type === "incoming_call") {
    url = `/?page=chat&callId=${data.callId}&callerId=${data.callerId}`;
  } else if (data.type === "session_request") {
    url = `/?page=sessions&requestId=${data.requestId}&senderId=${data.senderId}`;
  } else if (data.type === "session_accepted") {
    url = `/?page=sessions&sessionId=${data.sessionId}`;
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({
            type: "NOTIFICATION_CLICKED",
            data: data,
          });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
