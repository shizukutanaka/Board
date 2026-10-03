// Board service worker (ADR-1025) — a real script file is required:
// navigator.serviceWorker.register() rejects blob:/data: script URLs by spec,
// so the previous inline-blob worker never actually registered.
// Network-first for navigations (fresh HTML when online), cache-first for
// everything else (single-file app — the only thing worth caching is the doc).
const C='board-sw-v1';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==C)await caches.delete(k);
  await clients.claim();
})())});
self.addEventListener('fetch',e=>{
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(n=>{
      if(n.ok){const cl=n.clone();caches.open(C).then(c=>c.put(e.request,cl))}
      return n;
    }).catch(()=>caches.match(e.request).then(r=>r||new Response('offline',{status:503}))));
    return;
  }
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{
    if(n.ok){const cl=n.clone();caches.open(C).then(c=>c.put(e.request,cl))}
    return n;
  }).catch(()=>new Response('offline',{status:503}))));
});
