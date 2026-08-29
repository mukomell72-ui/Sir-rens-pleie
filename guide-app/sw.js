const CACHE='sir-guide-v5';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./sort.js'];

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

async function injectSorter(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html')) return response;
  let html=await response.text();
  if(!html.includes('sort.js')) html=html.replace('</body>','<script src="./sort.js"></script></body>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  const isGuidePage=url.pathname.endsWith('/guide-app/')||url.pathname.endsWith('/guide-app/index.html');

  if(isGuidePage){
    e.respondWith((async()=>{
      try{
        const res=await fetch(e.request);
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
        return await injectSorter(res);
      }catch(_){
        const cached=await caches.match(e.request)||await caches.match('./index.html');
        return cached?await injectSorter(cached):Response.error();
      }
    })());
    return;
  }

  e.respondWith(fetch(e.request).then(res=>{
    const copy=res.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return res;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
