// TaskFlow service worker — handles Web Push delivery for the Daily
// Briefing feature. This is a plain, unbundled file served as-is from
// /sw.js by Next.js (anything in public/ is served at the site root).
//
// It intentionally does very little: receive a push payload, show a
// notification, and focus/open /tasks on click. No caching, no offline
// support — this app has no other use for a service worker yet.

self.addEventListener("push", (event) => {
  let data = { title: "TaskFlow", body: "You have an update." };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      // Payload wasn't JSON — fall back to using it as the plain-text body.
      data.body = event.data.text();
    }
  }

  const title = data.title || "TaskFlow";
  const options = { body: data.body || "" };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.includes("/tasks") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/tasks");
      }
    })()
  );
});
