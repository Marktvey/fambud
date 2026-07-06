const CACHE_NAME = 'family-budget-shell-v1';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Запросы к Google Apps Script (сама таблица/API) — никогда не кэшируем,
  // это живые данные, они должны идти в сеть или явно падать (офлайн-очередь
  // в самом приложении обрабатывает это на уровне JS).
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    return;
  }

  // Остальное (сама оболочка приложения, шрифты и т.п.) — кэш с приоритетом,
  // затем сеть в фоне для обновления кэша при следующем разе.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (event.request.method === 'GET' && response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
