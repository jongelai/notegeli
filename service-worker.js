self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("notegeli-v1").then((cache) => {
      return cache.addAll([
        "/",
        "/static/notegeli.css",
        "/static/icons/192.png",
        "/static/icons/512.png"
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
