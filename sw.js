// IMPORTANT: Update this version with each release (must match APP_VERSION in config.js)
const CACHE_NAME = 'astrolabe-v0.3.0';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/styles.css',
  '/src/favicon.svg',
  '/src/js/config.js',
  '/src/js/snippet-manager.js',
  '/src/js/dataset-manager.js',
  '/src/js/chart-builder.js',
  '/src/js/panel-manager.js',
  '/src/js/editor.js',
  '/src/js/user-settings.js',
  '/src/js/generic-storage-ui.js',
  '/src/js/app.js'
];

// CDN URLs to cache
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs/loader.js',
  'https://unpkg.com/vega@5/build/vega.min.js',
  'https://unpkg.com/vega-lite@5/build/vega-lite.min.js',
  'https://unpkg.com/vega-embed@6/build/vega-embed.min.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap'
];

// Install event - cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local files
      const localCachePromise = cache.addAll(URLS_TO_CACHE);

      // Cache CDN files - they'll be cached during runtime via fetch event
      // This avoids CORS issues during install phase
      return localCachePromise;
    })
  );
  // Force the waiting service worker to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request).then((fetchResponse) => {
        // Cache successful responses for future use
        if (fetchResponse && fetchResponse.status === 200) {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      // Offline fallback - return cached index for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
