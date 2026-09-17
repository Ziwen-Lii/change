const CACHE_NAME = 'format-converter-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle standard requests normally
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
