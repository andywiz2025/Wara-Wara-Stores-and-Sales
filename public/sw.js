const CACHE_NAME = 'wara-wara-cache-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

// Install Event: pre-cache static resources and force immediate activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core shell assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Pre-cache error on launch:', err);
      });
    })
  );
});

// Activate Event: clean up outdated legacy caches and claim direct control over clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Purging stale offline cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: handle offline assets caching dynamically (Network-First with Cache Fallback)
self.addEventListener('fetch', (event) => {
  // Only handle standard GET requests of HTTP/HTTPS protocols
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // Avoid caching third-party or dynamic APIs (such as Firestore, Firebase auth, or web socket URLs)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.pathname.includes('/__aistudio_internal_') ||
    url.pathname.includes('ws') ||
    url.pathname.includes('socket.io') ||
    url.pathname.includes('sockjs')
  ) {
    return;
  }

  // Intercept and load from Network, falling back to local Cache in case of connectivity Loss
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If the request succeeds, put a cloned copy into the cache dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch((error) => {
        console.log('[Service Worker] Fetch failed (possibly offline); querying cache for:', event.request.url);

        // For navigation requests (like loading any app route on refresh), fallback directly to '/' or '/index.html'
        if (event.request.mode === 'navigate') {
          return caches.match('/').then((match) => {
            return match || caches.match('/index.html');
          });
        }

        // Standard asset fallback
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If both fail and it's a critical asset, return a fallback empty status
          return new Response('Offline Content Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});

// Native push notifications click handling
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
