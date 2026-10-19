/* Casus service worker (Allan, 2026-10-19: dictionaries downloaded for offline use).
 * - data files (…/data/<code>/…): from a downloaded language's cache when there, else the network
 * - the page and its scripts: the network first, a kept copy when offline (so a downloaded language reads offline)
 * Nothing else is cached; downloads and removals are made by the page (src/app/lib/offline.js). */
const APP = 'casus-app-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Wiktionary and CDNs go straight to the network
  if (url.pathname.includes('/data/')) {
    event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(APP).then((c) => c.put(req, copy)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(new URL('./', self.registration.scope).href))));
});
