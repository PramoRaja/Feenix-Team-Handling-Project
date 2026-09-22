// Feenix Portal Service Worker - Auto Invalidation & Fast Fresh Load
const CACHE_NAME = 'feenix-cache-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[SW] Purging stale cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always bypass cache for navigation (HTML), API, uploads, or binaries
  if (
    event.request.method !== 'GET' ||
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.endsWith('.apk') ||
    url.pathname.endsWith('.ipa') ||
    url.pathname.endsWith('.mobileconfig')
  ) {
    return;
  }

  // Network-first strategy with fallback to cache only if completely offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && (url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png'))) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
