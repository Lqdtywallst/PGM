// Service Worker for Dynasty Prestige
// Cache static assets for better performance

// Subir versión al desplegar cambios visibles (CSS, logos, index): fuerza borrado de cachés antiguos.
const CACHE_NAME = 'pgm-v1.0.1';
const STATIC_CACHE = 'pgm-static-v3';
const DYNAMIC_CACHE = 'pgm-dynamic-v3';

// Assets to cache during install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo-pgm.png',
  '/logo-dp-transparent.png',
  '/config.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://js.stripe.com/v3/'
];

// Service Worker install
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

// Service Worker activation
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

// Cache strategy: Cache First for static assets, Network First for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Do not cache backend API requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache First for static assets
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
          // Fallback if the network fails and there is no cache
          if (request.destination === 'image') {
            return new Response('', { status: 404 });
          }
        })
    );
  } else {
    // Network First for HTML
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

// Periodically clean old cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});








