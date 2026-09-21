/* Xử lý thông báo đẩy trong service worker (được importScripts từ sw.js). */
/* eslint-disable no-undef */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "SaleBDS OS", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "SaleBDS OS";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "salebds",
    renotify: true,
    data: { link: payload.link || "/dashboard" },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/dashboard";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (client.url.includes(self.registration.scope)) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(link);
            } catch {
              /* bỏ qua */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(link);
    })(),
  );
});
