// WorkSpace.kz Service Worker (Offline PWA)
const CACHE_NAME = 'workspace-v1';
const urlsToCache = [
  '/', '/index.html', '/styles.css', '/db.js', '/api.js', '/auth.js', '/data.js', '/main.js',
  '/login.html', '/catalog.html', '/room.html', '/dashboard.html', '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request)
      .then(response => response || fetch(e.request))
  );
});
