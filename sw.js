// WorkSpace.kz Service Worker (Offline PWA)
const CACHE_NAME = 'workspace-v5';
const urlsToCache = [
  './index.html',
  './styles.css',
  './db.js',
  './api.js',
  './auth.js',
  './data.js',
  './main.js',
  './login.html',
  './catalog.html',
  './room.html',
  './dashboard.html',
  './profile.html',
  './admin.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
  
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Add items one by one so one failure doesn't crash the whole cache
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('Failed to cache:', url, err);
        }
      }
    })
  );
});

self.addEventListener('activate', e => {
  // Take control of all pages immediately
  e.waitUntil(self.clients.claim());

  // Delete old caches
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', e => {
  // Only cache GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache the latest version on the fly
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          try { cache.put(e.request, clone); } catch (err) {}
        });
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(e.request);
      })
  );
});
