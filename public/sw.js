// ══════════════════════════════════════
// Arkhos — Service Worker (F4.5 PWA)
// Estrategia conservadora para no servir HTML rancio tras un deploy:
//  - Navegaciones: network-first, fallback a /offline si no hay red
//  - Estáticos /_next/static (inmutables por hash): cache-first
//  - API y orígenes externos: nunca se interceptan
// Subir CACHE_VERSION invalida todas las cachés antiguas en activate.
// ══════════════════════════════════════

const CACHE_VERSION = "arkhos-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Web Push (Cronos) ──────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Cronos", body: "Tienes un recordatorio", url: "/agenda" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload no-JSON: usar valores por defecto
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/agenda" },
      tag: "cronos-reminder",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/agenda";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Estáticos con hash: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navegaciones: network-first con shell offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || Response.error())
      )
    );
  }
});
