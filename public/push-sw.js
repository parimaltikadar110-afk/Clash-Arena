// Push-only service worker. Kichu cache kore na, tai purono/stale data ashbe na.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.map(c => caches.delete(c)))).then(() => self.clients.claim())));

self.addEventListener("fetch", () => {}); // install-able hobar jonno; kichu intercept kore na

self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch { d = { title: "ClashX7", body: e.data?.text() || "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "ClashX7", {
    body: d.body, icon: "/icon-192.png", badge: "/icon-192.png", data: { url: d.url || "/" }, vibrate: [120, 60, 120],
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    const c = cs[0]; return c ? c.focus() : clients.openWindow(e.notification.data?.url || "/");
  }));
});
