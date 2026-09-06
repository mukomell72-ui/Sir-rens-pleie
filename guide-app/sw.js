const CACHE='sir-guide-v13-current-v2';
const CORE=[
  './index-v13.html',
  './app-v13.js',
  './inventory-v13-1.js',
  './inventory-v13-2.js',
  './inventory-v13-3.js',
  './inventory-v13-4.js',
  './photos-v13.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  const isGuideEntry=url.pathname.endsWith('/guide-app/')||url.pathname.endsWith('/guide-app/index.html')||url.pathname.endsWith('/guide-app/index-v13.html');
  const request=isGuideEntry?new Request(new URL('./index-v13.html',self.location.href),{cache:'no-store'}):event.request;

  event.respondWith((async()=>{
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch{
      return (await caches.match(request))||(await caches.match('./index-v13.html'))||Response.error();
    }
  })());
});
