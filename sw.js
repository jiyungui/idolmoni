/* ========================================
   Service Worker — 支持 PWA 安装到桌面
   ======================================== */
const CACHE_NAME = 'myphone-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/reset.css',
    './css/screen.css',
    './css/statusbar.css',
    './css/widget-top.css',
    './css/widget-small.css',
    './css/apps.css',
    './css/dock.css',
    './css/modal.css',
    './js/storage.js',
    './js/grid.js',
    './js/widget-top.js',
    './js/widget-small.js',
    './js/apps.js',
    './js/dock.js'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
