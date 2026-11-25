/* Offline support: serve from cache, refresh the cache in the background. */
const CACHE="sight-read-v2";
const CORE=["./","./index.html","./styles.css","./generator.js","./app.js","./manifest.json","./icon.svg",
  "https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.9/build/opensheetmusicdisplay.min.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",e=>{ if(e.request.method!=="GET") return;
  e.respondWith(caches.open(CACHE).then(async c=>{ const hit=await c.match(e.request);
    const net=fetch(e.request).then(r=>{ if(r&&(r.ok||r.type==="opaque")) c.put(e.request,r.clone()); return r; }).catch(()=>hit);
    return hit||net; })); });
