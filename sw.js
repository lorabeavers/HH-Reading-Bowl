// Force a brand-new cache version whenever you change this string
const CACHE = 'rb-cards-v9';

// Core assets to guarantee offline & pass install checks
// Include your deck JSON so it's available offline.
// If you rename the file, update this list.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './book1_duel_cards.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: pre-cache and take control ASAP
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: claim clients and remove any old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// Helper: stale-while-revalidate for JSON (fast + fresh)
async function staleWhileRevalidateJSON(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  const networkPromise = fetch(req).then((res) => {
    // Only cache good responses
    if (res && res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  }).catch(() => null);

  // Return cached immediately if present; otherwise wait for network
  return cached || networkPromise || new Response('', { status: 504 });
}

// Fetch: network-first for HTML (to get latest app shell),
// SWR for JSON decks, cache-first for everything else
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';
  const url = new URL(req.url);

  const isHTML = accept.includes('text/html');
  const isJSON = url.pathname.endsWith('.json');

  // Ignore non-GET (POST, etc.)
  if (req.method !== 'GET') return;

  if (isHTML) {
    // Network-first for navigation requests
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then((r) => r || caches.match('./index.html'))
      )
    );
    return;
  }

  if (isJSON) {
    // Stale-while-revalidate for JSON (like book1_duel_cards.json)
    event.respondWith(staleWhileRevalidateJSON(req));
    return;
  }

  // Cache-first for everything else (icons, images, etc.)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
