const CACHE_NAME = "letrasgeli-v1";

// Archivos esenciales para guardar en caché
const ASSETS = [
  "./",
  "./index.html",
  "./script.js",
  "./letras.css",
  "./icons/192.png",
  "./icons/512.png"
];

// Instalación: Guardar archivos en caché
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguas si las hubiera
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones (Network First con respaldo en Caché)
self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Si la respuesta es válida, la devolvemos y la guardamos en caché para la próxima vez
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // SOLO si falla la red (offline), buscamos en el caché
        return caches.match(e.request);
      })
  );
});