// BeScout Service Worker — App Shell caching + push notifications
//
// Slice 259 (2026-04-30) — Cache-Pollution-Heal:
// Removed Supabase-REST stale-while-revalidate cache. The cache was keyed
// by URL only — Authorization-Header (JWT) was NOT part of the key, so:
//   1. Anonymous responses were served to logged-in users (first-load-broken
//      + needed refresh symptom)
//   2. Cross-user pollution risk (User A's cached response could leak to User B
//      if URL matched, since RLS-filtered queries embed user-id in URL but the
//      JWT changes between users for the same URL pattern)
// TanStack Query handles client-side caching properly with JWT-awareness via
// the Supabase client. No SW-level REST caching needed.
//
// Cache-Name bumped v3 → v4 to force takeover on existing clients.
// Old `bescout-api-v1` cache is explicitly deleted in activate-handler.
const CACHE_NAME = 'bescout-v4';

// Only pre-cache the offline fallback page — NOT HTML routes.
// HTML routes change on every deploy; caching them causes stale content.
const APP_SHELL = [
  '/offline.html',
];

// Static asset patterns to cache (cache-first)
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
    // Delete ALL old caches that are not the current version. The catch-all
    // filter evicts the deprecated `bescout-api-v1` Supabase-REST cache from
    // existing clients on first load after Slice 259 deploy, plus any prior
    // `bescout-v*` versions.
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

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

  // All other requests (incl. Supabase REST API): pass through to network.
  // Browser HTTP-cache + TanStack Query handle caching at the right layers.
  // Defensive explicit return: makes intent clear if a future fetch-branch
  // is added below this line — implicit no-respondWith would silently regress.
  return;
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
