const CACHE='sir-guide-v12';
const ASSETS=['./index-v12.html','./chemistry-update.js','./usage-guide.js','./purchase-links.js','./sort.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window'});
    await Promise.all(clients.map(client=>client.navigate(client.url).catch(()=>null)));
  })());
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  const isRoot=url.pathname.endsWith('/guide-app/')||url.pathname.endsWith('/guide-app/index.html');
  if(isRoot){
    e.respondWith(fetch('./index-v12.html',{cache:'no-store'}).catch(()=>caches.match('./index-v12.html')));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
});