import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { supabase } from "./supabase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let currentToken = null;
let foregroundUnsubscribe = null;

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.warn("Notification permission error:", err);
    return false;
  }
}

export async function registerDeviceToken(userId) {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      console.warn("Firebase messaging not available");
      return null;
    }

    const permission = await requestNotificationPermission();
    if (!permission) {
      console.warn("Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn("Failed to get FCM token");
      return null;
    }

    if (token === currentToken) return token;
    currentToken = token;

    const platform = /android/i.test(navigator.userAgent)
      ? "android"
      : /iphone|ipad|iPod/i.test(navigator.userAgent)
      ? "ios"
      : "web";

    const { error: upsertError } = await supabase.from("device_tokens").upsert(
      {
        user_id: userId,
        token: token,
        platform: platform,
        active: true,
      },
      { onConflict: "token" }
    );

    if (upsertError) {
      console.error("Failed to save device token:", upsertError);
    }

    return token;
  } catch (err) {
    console.error("registerDeviceToken error:", err);
    return null;
  }
}

export async function removeDeviceToken(token) {
  try {
    await supabase
      .from("device_tokens")
      .update({ active: false })
      .eq("token", token);
  } catch (err) {
    console.error("removeDeviceToken error:", err);
  }
}

export function listenForForegroundMessages(onMessageCallback) {
  try {
    getFirebaseMessaging().then((messaging) => {
      if (!messaging) return;
      if (foregroundUnsubscribe) foregroundUnsubscribe();
      foregroundUnsubscribe = onMessage(messaging, (payload) => {
        if (onMessageCallback) onMessageCallback(payload);
      });
    });
  } catch (err) {
    console.error("listenForForegroundMessages error:", err);
  }
}

export function stopListeningForMessages() {
  if (foregroundUnsubscribe) {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }
}

export async function sendPushNotification(targetUserId, notification) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/send-notification`;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      console.warn("No auth token for sending push notification");
      return;
    }

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        targetUserId,
        notification,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Push notification failed:", response.status, errText);
    }
  } catch (err) {
    console.error("sendPushNotification error:", err);
  }
}

export function isUserActiveInChat(activeChatUserId, senderId) {
  return activeChatUserId === senderId;
}
