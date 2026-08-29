const CACHE='sir-guide-v11';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./chemistry-update.js','./usage-guide.js','./purchase-links.js','./sort.js'];

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

async function injectUpdates(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  let html=await response.text();
  const scripts='<script src="./chemistry-update.js"></script><script src="./usage-guide.js"></script><script src="./purchase-links.js"></script><script src="./sort.js?v=11"></script>';
  if(!html.includes('chemistry-update.js')) html=html.replace('</body>',scripts+'</body>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  const isGuidePage=url.pathname.endsWith('/guide-app/')||url.pathname.endsWith('/guide-app/index.html');
  if(isGuidePage){
    e.respondWith((async()=>{
      try{
        const res=await fetch(e.request,{cache:'no-store'});
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
        return await injectUpdates(res);
      }catch(_){
        const cached=await caches.match(e.request)||await caches.match('./index.html');
        return cached?await injectUpdates(cached):Response.error();
      }
    })());
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(res=>{
    const copy=res.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return res;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
