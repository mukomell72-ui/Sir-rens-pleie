import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const KONGSBERG={lat:59.6686,lon:9.6502};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Cache-Control":status===200?"public, max-age=86400":"no-store"}});
const haversine=(a:{lat:number;lon:number},b:{lat:number;lon:number})=>{const rad=(n:number)=>n*Math.PI/180,R=6371,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  let postalCode="";try{postalCode=String((await req.json())?.postalCode||"").trim();}catch{return json({error:"invalid_json"},400);}if(!/^\d{4}$/.test(postalCode))return json({error:"invalid_postal_code"},400);
  try{
    const geoResponse=await fetch(`https://ws.geonorge.no/adresser/v1/sok?postnummer=${encodeURIComponent(postalCode)}&treffPerSide=100`,{headers:{"User-Agent":"SIR-Rens-Pleie/1.0"}});if(!geoResponse.ok)return json({error:"geonorge_unavailable"},502);
    const geo=await geoResponse.json(),addresses=Array.isArray(geo?.adresser)?geo.adresser:[];if(!addresses.length)return json({error:"not_found"},404);
    const points=addresses.map((a:any)=>a?.representasjonspunkt).filter((p:any)=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon));if(!points.length)return json({error:"coordinates_unavailable"},502);
    const point=points.reduce((sum:any,p:any)=>({lat:sum.lat+p.lat,lon:sum.lon+p.lon}),{lat:0,lon:0});point.lat/=points.length;point.lon/=points.length;
    let distanceKm:number,method="estimated";try{const routeResponse=await fetch(`https://router.project-osrm.org/route/v1/driving/${point.lon},${point.lat};${KONGSBERG.lon},${KONGSBERG.lat}?overview=false`,{headers:{"User-Agent":"SIR-Rens-Pleie/1.0"}}),route=await routeResponse.json(),metres=route?.routes?.[0]?.distance;if(!routeResponse.ok||!Number.isFinite(metres))throw new Error();distanceKm=Math.round(metres/1000);method="road";}catch{distanceKm=Math.round(haversine(point,KONGSBERG)*1.2);}
    return json({postalCode,city:String(addresses[0].poststed||""),municipality:String(addresses[0].kommunenavn||""),distanceKm,method,approximate:true});
  }catch{return json({error:"lookup_failed"},502);}
});
