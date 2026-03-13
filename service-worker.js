const CACHE_NAME = "notegeli-v2"; // Incrementa esto cuando cambies CSS o JS
const ASSETS = [
  "/",
  "/static/notegeli.css",
  "/static/icons/192.png",
  "/static/icons/512.png"
];

// 1. INSTALACIÓN: Cachear recursos críticos
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN: Limpiar cachés antiguas (MUY IMPORTANTE)
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: Estrategia Network-First con Fallback a Caché
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // EXCLUSIONES: No cachear métodos POST ni rutas de gestión
  if (
    req.method !== "GET" || 
    url.pathname.startsWith("/editar") ||
    url.pathname.startsWith("/borrar") ||
    url.pathname.startsWith("/login")  ||
    url.pathname.startsWith("/logout")
  ) {
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => {
        // Si la red responde bien, guardamos una copia fresca en caché (opcional)
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req)) // Si falla el internet, servimos lo guardado
  );
});