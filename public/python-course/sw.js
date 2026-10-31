const CACHE_NAME = 'python-course-v1';
const PYODIDE_PREFIX = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(['./', './index.html'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('python-course-') && key !== CACHE_NAME)
    .map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isPyodide = url.href.startsWith(PYODIDE_PREFIX);
  if (request.method !== 'GET' || (!isPyodide && url.origin !== self.location.origin)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && (isPyodide || request.destination !== 'document')) {
      try { await cache.put(request, response.clone()); } catch (error) { console.info('This resource could not be cached for offline use.', error); }
    }
    return response;
  }));
});
