// Board — optional service worker (ADR-0018).
//
// index.html is fully functional WITHOUT this file — deploying it next to index.html is
// what turns on offline-after-first-load for hosted origins. It cannot live inside
// index.html: the Service Workers spec's Register algorithm only accepts http(s) script
// URLs, and Chrome/Firefox reject blob:/data: registrations outright (measured 2026-08-31;
// the previous inline-blob attempt never ran in any browser).
//
// The product is a single HTML file, so in practice the only request that matters is the
// navigation itself. Strategy: network-first for the document (pure cache-first would pin
// users to the first cached HTML forever), falling back to the last good copy when
// offline. The cache always holds the newest successfully fetched document, so no
// versioned cache names and no purge loop are needed.
const C = 'board';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k); // old board-v* names
  await clients.claim();
})()));
self.addEventListener('fetch', e => {
  e.respondWith(caches.open(C).then(async c => {
    if (e.request.mode === 'navigate') {
      try { const n = await fetch(e.request); c.put(e.request, n.clone()); return n; }
      catch (_) { const r = await c.match(e.request); if (r) return r; return new Response('offline', { status: 503 }); }
    }
    const r = await c.match(e.request);
    if (r) return r;
    try { const n = await fetch(e.request); if (e.request.method === 'GET') c.put(e.request, n.clone()); return n; }
    catch (_) { return new Response('offline', { status: 503 }); }
  }));
});
