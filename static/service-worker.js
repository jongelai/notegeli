const CACHE = "notegeli-v2";
const STATIC_ASSETS = [
  "/",
  "/static/notegeli.css",
  "/static/optimize.js",
  "/static/service-worker.js",
  "/static/manifest.json",
  "/static/icons/192.png",
  "/static/icons/512.png",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        // Algunos assets remotos pueden fallar, ignorar
        console.log("Algunos assets no se cachearon:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// STRATEGY: Network First para datos, Cache First para assets estáticos
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // POST/PATCH/PUT siempre a red
  if (req.method !== "GET") return;

  // Rutas dinámicas siempre a red
  if (url.pathname === "/" || 
      url.pathname.startsWith("/editar") ||
      url.pathname.startsWith("/borrar") ||
      url.pathname.startsWith("/login")  ||
      url.pathname.startsWith("/logout")  ||
      url.pathname.startsWith("/registro")
  ) {
    e.respondWith(
      fetch(req)
        .then(res => res.ok ? res : caches.match(req))
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets estáticos: Cache First
  if (url.pathname.startsWith("/static") || url.origin !== location.origin) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req)
          .then(res => {
            if (!res.ok) return res;
            const cache = caches.open(CACHE);
            cache.then(c => c.put(req, res.clone()));
            return res;
          })
          .catch(() => caches.match("/"));
      })
    );
  }
});
