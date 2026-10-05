// Offline support: network-first for pages, cache-first for static assets.
const CACHE = "alpha-v1";
const SHELL = ["/dashboard", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  if (request.url.includes("/_next/static/")) {
    e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res;
    })));
    return;
  }
  if (request.mode === "navigate") {
    e.respondWith(fetch(request).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res;
    }).catch(() => caches.match(request).then((hit) => hit || caches.match("/dashboard"))));
  }
});
