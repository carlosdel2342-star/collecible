// sw.js - Service Worker Básico para Collecible (PWA)

const CACHE_NAME = 'collecible-cache-v1';
const urlsToCache = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Instalar Service Worker y guardar recursos básicos en caché
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Archivos cacheados exitosamente');
                return cache.addAll(urlsToCache);
            })
    );
});

// Interceptar peticiones (modo PWA válido)
self.addEventListener('fetch', event => {
    // Para simplificar, respondemos siempre con la red primero.
    // Esto es solo para cumplir los requisitos de instalabilidad de la PWA.
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
