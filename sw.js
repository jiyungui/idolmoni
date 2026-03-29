/* ============================================
   sw.js — Service Worker
   让应用在添加到桌面后可离线运行
   ============================================ */

const CACHE_NAME = 'simulator-v1';

/* 需要预缓存的核心资源 */
const PRECACHE = [
    './',
    './index.html',
    './css/base.css',
    './css/phone.css',
    './css/homescreen.css',
    './css/widgets.css',
    './css/apps.css',
    './css/settings.css',
    './js/homescreen.js',
    './js/settings.js',
];

/* 安装：预缓存核心文件 */
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

/* 激活：清除旧缓存 */
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

/* 拦截请求：优先缓存，网络兜底 */
self.addEventListener('fetch', e => {
    /* IndexedDB / blob URL 不走缓存 */
    if (e.request.url.startsWith('blob:')) return;
    if (e.request.url.includes('fonts.googleapis.com') ||
        e.request.url.includes('fonts.gstatic.com')) {
        /* 字体走 stale-while-revalidate */
        e.respondWith(
            caches.open('simulator-fonts').then(async cache => {
                const cached = await cache.match(e.request);
                const fetchPromise = fetch(e.request).then(res => {
                    cache.put(e.request, res.clone());
                    return res;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
        return;
    }
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (!res || res.status !== 200 || res.type !== 'basic') return res;
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return res;
            }).catch(() => cached);
        })
    );
});
