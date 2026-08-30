/* $ignal Screener service worker.
   Deliberately conservative: NETWORK-FIRST for the app shell so a deploy is picked up
   immediately and users can never be stuck on a stale cached build — the classic PWA
   failure mode. The cache exists only so the app opens offline, never to serve old code
   when the network is available. */
const VERSION = 'ss-v1';
const SHELL = './';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then((c) => c.add(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never touch API traffic: caching market data would produce stale scores.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(SHELL)))
  );
});
