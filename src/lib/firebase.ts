/**
 * Firebase Cloud Messaging (web push) init. This is the browser-side
 * counterpart to the already-working backend (app/integrations/firebase.py) --
 * the backend has been able to SEND pushes all along, this file is what
 * makes the browser able to RECEIVE them: request permission, get a
 * registration token, and hand that token to the backend so it has
 * somewhere to send to.
 */
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCi48qndoMHLWAhDAKdOzCwbGc-Rym4yNM",
  authDomain: "ants-a564b.firebaseapp.com",
  projectId: "ants-a564b",
  storageBucket: "ants-a564b.firebasestorage.app",
  messagingSenderId: "1078304215694",
  appId: "1:1078304215694:web:14c17548ddebdb18256fdf",
};

// Web Push certificate -- required specifically for web (mobile doesn't
// need this), used when requesting a registration token from the browser.
const VAPID_KEY = "BCcXMl35SoNOclUM5SNZ05srSM9Zxrk5oqt9ziJJtRmpCSLAFIFbKeH6u4sMI5SuWuwsmT8vipzF08y3HvnDw-8";

const app = initializeApp(firebaseConfig);

/** Requests notification permission, registers the service worker, and
 * returns a device token -- or null if the browser doesn't support push,
 * or the person declines permission. Never throws; push is a nice-to-have,
 * not something that should ever break the app if it fails. */
export async function requestPushToken(): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    return token || null;
  } catch (err) {
    console.warn("Push notification setup failed (non-fatal):", err);
    return null;
  }
}

/** Foreground messages -- FCM does NOT auto-show a browser notification
 * when the tab is focused (only background/closed-tab messages go through
 * the service worker automatically), so this has to be handled manually.
 * Call once, e.g. from the portal shell, and it fires for every message
 * that arrives while the tab is open and focused. Passes through the
 * data payload (not just title/body) so the caller can route based on
 * extra_data.type. */
export async function listenForForegroundMessages(
  onMessageReceived: (title: string, body: string, data: Record<string, string>) => void,
) {
  const supported = await isSupported();
  if (!supported) return;
  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "New notification";
    const body = payload.notification?.body ?? "";
    onMessageReceived(title, body, payload.data ?? {});
  });
}