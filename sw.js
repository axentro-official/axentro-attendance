const CACHE_NAME = 'axentro-v1';
const OFFLINE_URLS = [
    './',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS));
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(response => {
                const clonedResponse = response.clone();
                return caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
            });
        }).catch(() => caches.match(event.request));
});
