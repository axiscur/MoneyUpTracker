// ============================================================
// LIBRO FINANCIERO — Service Worker v1.0.1
// Objetivo: evitar servir versiones antiguas/cacheadas.
// Estrategia: Network-first para navegación; cache seguro para assets.
// ============================================================

const CACHE_NAME = 'libro-financiero-v1.0.1';
const APP_SHELL = [
  './index.html?v=1.0.1',
  './manifest.json?v=1.0.1',
  './icon-180.png?v=1.0.1',
  './icon-192.png?v=1.0.1',
  './icon-512.png?v=1.0.1'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => undefined))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name.startsWith('libro-financiero-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const request = event.request;

  // Para HTML/navegación: intentar red primero para no quedar atrapado en un index viejo.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html?v=1.0.1', copy));
          return response;
        })
        .catch(() => caches.match('./index.html?v=1.0.1').then(cached => cached || caches.match(request)))
    );
    return;
  }

  // Para assets: cache-first con actualización silenciosa.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();

  if (event.data && event.data.type === 'CLEAR_OLD_CACHES') {
    event.waitUntil(
      caches.keys().then(names => Promise.all(
        names.filter(name => name.startsWith('libro-financiero-')).map(name => caches.delete(name))
      ))
    );
  }
});
