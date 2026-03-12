// BeScout Service Worker — App Shell caching + push notifications
const CACHE_NAME = 'bescout-v3';
const API_CACHE_NAME = 'bescout-api-v1';
// Only pre-cache the offline fallback page — NOT HTML routes.
// HTML routes change on every deploy; caching them causes stale content.
const APP_SHELL = [
  '/offline.html',
];

// Static asset patterns to cache
const STATIC_CACHE_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\/logo\.png$/,
  /\/schrift\.png$/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Delete ALL old caches — forces fresh content after deploy.
    // This is aggressive but prevents stale HTML/JS chunk mismatches.
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Stale-while-revalidate for Supabase REST API (GET only)
  if (request.method === 'GET' && url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation requests: network-first, fallback to offline page only.
  // Do NOT cache HTML responses — they change on every deploy and
  // stale cached HTML causes the app to load old JS bundles that crash.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() =>
          caches.match('/offline.html').then((offline) =>
            offline || new Response('Offline', { status: 503 })
          )
        )
    );
    return;
  }

  // Static assets: cache-first
  if (STATIC_CACHE_PATTERNS.some((p) => p.test(request.url))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
});

// ============================================
// Web Push Notifications
// ============================================
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'BeScout', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'bescout-notification',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
