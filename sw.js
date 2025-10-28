self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { clients.claim(); });

const CACHE = 'zt-cache-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js', '/manifest.webmanifest',
  '/icon-192.png', '/icon-512.png', '/badge-72.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});