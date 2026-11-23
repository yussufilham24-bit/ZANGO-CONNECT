

const CACHE_NAME = "zango-connect-v1";

const FILES = [
  "/",
  "/index.html",
  "/manifest.json"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );

  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// FETCH - EXISTING OFFLINE CACHE
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();

      caches.open(CACHE_NAME).then(cache =>
        cache.put(event.request, copy)
      );

      return response;
    }).catch(() =>
      caches.match(event.request).then(cached =>
        cached || caches.match("/index.html")
      )
    )
  );
});

// PUSH NOTIFICATIONS
self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {
      body: event.data ? event.data.text() : ""
    };
  }

  const title = data.title || "ZANGO CONNECT";

  const options = {
    body: data.body || "Una notification mpya.",
    tag: data.tag || "zango-connect-notification",
    data: {
      url: data.url || "/"
    },
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  );

  // Ruhusu kufungua ukurasa wa ndani ya app pekee
  const safeUrl =
    targetUrl.origin === self.location.origin
      ? targetUrl.href
      : self.location.origin + "/";

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clientList => {

      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          client.navigate(safeUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(safeUrl);
    })
  );
});
