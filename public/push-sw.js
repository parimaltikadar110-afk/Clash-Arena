/* ClashX7 push service worker
   Does NOT cache the app.
   Does NOT reload the app.
   Prevents white-screen / reload loops.
*/

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      body: event.data ? event.data.text() : ""
    };
  }

  const title = data.title || "ClashX7";

  const options = {
    body: data.body || "You have a new ClashX7 notification.",
    icon: data.icon || "/favicon-192.png",
    badge: data.badge || "/favicon-192.png",
    data: {
      url: data.url || "/"
    },
    vibrate: [120, 60, 120],
    tag: data.tag || "clashx7"
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const target =
    event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(list => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(target).catch(() => {});
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(target);
        }
      })
  );
});
