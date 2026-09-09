import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
} catch (err) {
  console.error("Firebase init error:", err);
}

export async function getFirebaseMessaging() {
  if (messaging) return messaging;
  try {
    const supported = await isSupported();
    if (supported && app) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (err) {
    console.warn("Firebase messaging not supported:", err);
  }
  return null;
}

export { app };
