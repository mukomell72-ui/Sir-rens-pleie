const CACHE='sir-guide-v13-professional-ui-v18';
const CORE=[
  './index-v13.html',
  './app-v13.js',
  './guide-wizard.js',
  './hse-v13.js',
  './inventory-v13-1.js',
  './inventory-v13-2.js',
  './inventory-v13-3.js',
  './inventory-v13-4.js',
  './photos-v13.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

function normalizedCacheRequest(request){
  const u=new URL(request.url);
  u.search='';
  u.hash='';
  return new Request(u.toString(),{method:'GET'});
}

async function networkWithTimeout(request,ms=5000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
    return await fetch(request,{cache:'no-store',signal:controller.signal});
  }finally{
    clearTimeout(timer);
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(!url.pathname.includes('/guide-app/'))return;

  const isGuideEntry=url.pathname.endsWith('/guide-app/')||url.pathname.endsWith('/guide-app/index.html')||url.pathname.endsWith('/guide-app/index-v13.html');
  const networkRequest=isGuideEntry
    ? new Request(new URL('./index-v13.html',self.location.href),{method:'GET'})
    : event.request;
  const cacheRequest=normalizedCacheRequest(networkRequest);

  event.respondWith((async()=>{
    try{
      const response=await networkWithTimeout(networkRequest);
      if(response?.ok){
        const cache=await caches.open(CACHE);
        await cache.put(cacheRequest,response.clone());
        return response;
      }
      const fallback=await caches.match(cacheRequest,{ignoreSearch:true});
      return fallback||response||Response.error();
    }catch{
      return (await caches.match(cacheRequest,{ignoreSearch:true}))
        ||(await caches.match('./index-v13.html',{ignoreSearch:true}))
        ||Response.error();
    }
  })());
});
