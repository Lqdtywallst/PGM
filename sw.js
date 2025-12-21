// Service Worker para Prestige Goal Motion
// Cache de recursos estáticos para mejor rendimiento

const CACHE_NAME = 'pgm-v1.0.0';
const STATIC_CACHE = 'pgm-static-v1';
const DYNAMIC_CACHE = 'pgm-dynamic-v1';

// Recursos a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo-pgm.png',
  '/config.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://js.stripe.com/v3/'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Error caching static assets:', err);
      })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Estrategia de cache: Cache First para recursos estáticos, Network First para dinámicos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear requests a APIs del backend
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache First para recursos estáticos
  if (request.method === 'GET' && 
      (request.destination === 'image' || 
       request.destination === 'style' || 
       request.destination === 'script' ||
       request.destination === 'font')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          });
        })
        .catch(() => {
          // Fallback si falla la red y no hay cache
          if (request.destination === 'image') {
            return new Response('', { status: 404 });
          }
        })
    );
  } else {
    // Network First para HTML
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// Limpiar cache antiguo periódicamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


