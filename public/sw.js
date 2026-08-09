/**
 * Service Worker de Tormentar
 * Imprescindible para recibir notificaciones push del navegador aunque
 * la pestana/app este cerrada. Se registra desde usePushNotifications.ts
 * (navigator.serviceWorker.register("/sw.js")). Este archivo vive en
 * public/ para que Expo lo copie tal cual a la raiz de dist/ al hacer
 * el build web (necesita quedar en la raiz del sitio para poder
 * controlar todas las paginas).
 */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Tormentar", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Tormentar";
  const options = {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.alertId ? `alert-${data.alertId}` : undefined,
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
