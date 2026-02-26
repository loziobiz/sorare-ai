const CACHE_NAME = "sorare-pwa-v1";
const urlsToCache = ["/", "/cards", "/manifest.json"];
const graphqlCacheName = "sorare-graphql-cache";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith("sorare-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora richieste non-HTTP (extension, chrome-, etc.)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Per le richieste GraphQL, usa network-first con fallback alla cache
  if (url.pathname === "/api/graphql") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clona e salva in cache per uso offline
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(graphqlCacheName).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() =>
          // Network fallito, prova a leggere dalla cache
          caches.open(graphqlCacheName).then((cache) => cache.match(request))
        )
    );
    return;
  }

  // Per le altre richieste, usa cache-first con stale-while-revalidate
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        // Risposta trovata in cache, aggiorna in background
        fetch(request).then((freshResponse) => {
          if (freshResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, freshResponse);
            });
          }
        });
        return response;
      }

      // Nessuna cache, fai richiesta di rete
      return fetch(request).then((response) => {
        // Salva in cache per uso futuro
        if (response.ok && request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
