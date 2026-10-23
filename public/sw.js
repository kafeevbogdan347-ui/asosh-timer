// Service Worker для АСОШ №2
// Обеспечивает мгновенный запуск в Android APK (MConvertor) и оффлайн-доступ

const CACHE_NAME = 'asosh2-apk-cache-v3';
// Пути считаются от папки, где лежит sw.js (на GitHub Pages это /asosh-timer/)
const BASE = new URL('./', self.location).pathname;
const ASSETS_TO_CACHE = [BASE, BASE + 'index.html', BASE + 'manifest.json', BASE + 'icon.svg'];

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
  // Пропускаем не-GET запросы и чужие домены (например, Firebase)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const saveCopy = (response) => {
    if (response && response.status === 200) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  };

  // Страницу всегда берём из сети: в ней ссылки на файлы текущей версии.
  // Из кэша — только без интернета. Иначе после обновления сайта старая страница
  // ссылается на удалённые файлы и показывается белый экран.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(saveCopy)
        .catch(() => caches.match(event.request).then((r) => r || caches.match(BASE + 'index.html')))
    );
    return;
  }

  // Остальные файлы (JS, CSS, иконки) имеют хэш в имени и не меняются: сначала кэш, потом сеть
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then(saveCopy))
  );
});
