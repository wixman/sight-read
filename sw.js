/* Offline support. The app's own files are fetched from the network first, so an update always arrives
   whole (never new HTML with an old stylesheet); the cache is only used when offline. */
const CACHE="sight-read-v3";
const CORE=["./","./index.html","./styles.css?v=3","./generator.js?v=3","./app.js?v=3","./manifest.json","./icon.svg",
  "https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.9/build/opensheetmusicdisplay.min.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{ const req=e.request; if(req.method!=="GET") return;
  const own=new URL(req.url).origin===self.location.origin;
  if(own){ // network first
    e.respondWith(fetch(req,{cache:"no-cache"}).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); } return r; })
      .catch(()=>caches.match(req,{ignoreSearch:false}).then(hit=>hit||caches.match("./index.html")))); return; }
  // pinned library versions and fonts never change: cache first
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{ if(r&&(r.ok||r.type==="opaque")){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); } return r; })));
});
