const CACHE = 'yaam-attakarn-v5.0.0-kala';
const ASSETS = [
  './', './index.html', './css/style.css', './js/data.js', './js/app.js',
  './manifest.json', './kala-tab.css', './kala-tab.js', './js/tab-controller.js',
  './js/calendar-engine.js', './js/chart-engine.js', './js/kala-engine.js',
  './js/relation-engine.js', './js/house-meanings.js', './data/lunar-month-boundaries.json',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png'
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match('./index.html'))));
});
