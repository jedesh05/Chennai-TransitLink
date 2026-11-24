'use strict';
const scope=new URL(self.registration.scope);
const prefix='transitlink-offline-'+scope.pathname+'-';
const version=prefix+'v66';
const files=['index.html','styles.css','app.js','auth-config.js','auth.js','network.js','preferences.js','manifest.webmanifest','README.md',
  'assets/data.js','assets/mtc.js','assets/tourist-places.js','assets/rail-geography.js','assets/metro-geography.js','assets/uploaded-map.js','uploaded-map.js','assets/logo.png','assets/hero-logo.png','assets/app-192.png','assets/app-512.png'];
const allowed=new Set(files.map(file=>new URL(file,scope).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(version).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for (const key of await caches.keys()) if (key.startsWith(prefix)&&key!==version) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if (event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const navigation=event.request.mode==='navigate'&&(url.href===scope.href||url.href===new URL('index.html',scope).href);
  if (!navigation&&!allowed.has(url.href)) return;
  event.respondWith((async()=>{
    const cache=await caches.open(version);
    const fallback=navigation?new URL('index.html',scope).href:event.request;
    return await cache.match(fallback)||fetch(event.request);
  })());
});








