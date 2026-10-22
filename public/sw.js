// Service Worker для АСОШ №2
// Обеспечивает мгновенный запуск в Android APK (MConvertor) и оффлайн-доступ

const CACHE_NAME = 'asosh2-apk-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Продолжаем даже если отдельные файлы недоступны при первой установке
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Пропускаем не-GET запросы и внешние API (например, погоду или аналитику)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Для локальных ресурсов используем Cache First с Network Fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Фоновое обновление кэша
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      }).catch(() => caches.match('/index.html'))
    );
  }
});
