const CACHE = "notegeli-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
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

// NETWORK FIRST para que Flask siempre maneje datos
self.addEventListener("fetch", (e) => {
  const req = e.request;

  // No tocar POST (guardar notas)
  if (req.method === "POST") return;

  // No tocar estos endpoints
  const url = new URL(req.url);
  if (url.pathname.startsWith("/editar") ||
      url.pathname.startsWith("/borrar") ||
      url.pathname.startsWith("/login")  ||
      url.pathname.startsWith("/logout")  ||
      url.pathname.startsWith("/archivos")
  ) {
    return;
  }

  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
