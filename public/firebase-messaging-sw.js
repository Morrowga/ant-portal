importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCi48qndoMHLWAhDAKdOzCwbGc-Rym4yNM",
  authDomain: "ants-a564b.firebaseapp.com",
  projectId: "ants-a564b",
  storageBucket: "ants-a564b.firebasestorage.app",
  messagingSenderId: "1078304215694",
  appId: "1:1078304215694:web:14c17548ddebdb18256fdf",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "New notification";
  self.registration.showNotification(title, {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/logo.png",
    requireInteraction: true,
    data: payload.data || {},
  });
});

function routeForType(type) {
  switch (type) {
    case "sleep_checkin":
    case "mood_water_checkin":
      return "/portal/health";
    case "presence_check":
      return "/portal";
    case "overtime_request":
    case "overtime_decision":
      return "/portal/overtime";
    default:
      return "/portal";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = routeForType(event.notification.data && event.notification.data.type);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus().then(() => {
            if ("navigate" in client) {
              return client.navigate(destination).catch(() => clients.openWindow(destination));
            }
            return clients.openWindow(destination);
          });
        }
      }
      return clients.openWindow(destination);
    }),
  );
});