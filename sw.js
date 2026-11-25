
const CACHE_NAME = "zango-connect-v2";

const FILES = [
  "/",
  "/index.html",
  "/manifest.json"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
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
    ).then(() => self.clients.claim())
  );
});

// FETCH - OFFLINE SUPPORT
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cache app origin pekee
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === "navigate") {
          return caches.match("/index.html");
        }

        return Response.error();
      })
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

  // Support payload yenye notification object pia
  const notificationData = data.notification || data;

  const title =
    notificationData.title ||
    data.title ||
    "ZANGO CONNECT";

  const body =
    notificationData.body ||
    data.body ||
    "Una ujumbe mpya.";

  const messageId = data.messageId || data.message_id || "";
  const conversationId =
    data.conversationId || data.conversation_id || "";

  const notificationTag =
    data.tag ||
    (messageId
      ? "zango-message-" + messageId
      : "zango-" + Date.now());

  const options = {
    body: body,
    tag: notificationTag,
    renotify: true,
    timestamp: Date.now(),
    data: {
      url: data.url || notificationData.url || "/",
      conversationId: conversationId,
      messageId: messageId
    }
  };

  // Avatar ya mtumaji
  if (notificationData.icon || data.icon) {
    options.icon = notificationData.icon || data.icon;
  }

  // Picha ya ujumbe ikiwa ipo
  if (notificationData.image || data.image) {
    options.image = notificationData.image || data.image;
  }

  // Badge ikiwa ipo
  if (notificationData.badge || data.badge) {
    options.badge = notificationData.badge || data.badge;
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/";

  let targetUrl;

  try {
    targetUrl = new URL(rawUrl, self.location.origin);
  } catch (error) {
    targetUrl = new URL("/", self.location.origin);
  }

  // Ruhusu URL za app yetu pekee
  const safeUrl =
    targetUrl.origin === self.location.origin
      ? targetUrl.href
      : self.location.origin + "/";

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(async clientList => {

      // Tumia app iliyopo kama imefunguliwa
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.navigate(safeUrl);
          return client.focus();
        }
      }

      // Fungua app ikiwa hakuna window iliyopo
      return self.clients.openWindow(safeUrl);
    })
  );
});
