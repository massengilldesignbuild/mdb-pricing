// MDB Pricing Portal — Service Worker
const CACHE_NAME = 'mdb-pricing-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500;600&display=swap'
];

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Google Sheets CSV: network first, no cache (always want fresh data)
// - Everything else: cache first, network fallback
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never cache Google Sheets CSV fetches — let the app handle caching via localStorage
  if (url.includes('docs.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for app shell and fonts
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // if network fails and no cache, return whatever we have
    })
  );
});
