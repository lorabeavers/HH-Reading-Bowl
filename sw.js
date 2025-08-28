const CACHE = 'rb-cards-v1';
const ASSETS = ['./','./index.html','./manifest.json'];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate', (e)=>{ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e)=>{
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request).then(resp=>{
      const copy = resp.clone();
      caches.open(CACHE).then(cache=> cache.put(e.request, copy));
      return resp;
    }).catch(()=> caches.match('./index.html')))
  );
});
