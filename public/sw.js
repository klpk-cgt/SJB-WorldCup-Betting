const CACHE_NAME = 'wc2026-v1';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // API 请求走网络优先
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }
  // 静态资源走缓存优先
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((resp) => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      return resp;
    }))
  );
});
