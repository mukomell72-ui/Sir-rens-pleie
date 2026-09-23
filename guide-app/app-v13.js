(()=>{
const items=window.SIR_ITEMS||[];
const photos=window.SIR_PHOTOS||{};
const hseMap=window.SIR_HSE||{};
const hseMeta=window.SIR_HSE_META||{};
const HSE_FALLBACK={status:'UNVERIFIED',label:'HMS ikke verifisert',level:'STOP',hazards:'Ingen verifisert SDS/HMS-post er koblet til denne varen.',ppe:'STOP for profesjonelt arbeid til korrekt sikkerhetsdatablad og risikovurdering er lagt inn.',first:'Ved uhell: start nødvendig førstehjelp, bruk etikett/SDS og kontakt Giftinformasjonen 22 59 13 00. Ved alvorlige symptomer: 113.',storage:'Oppbevar i original/korrekt merket beholder og sett varen i karantene til dokumentasjonen er kontrollert.',sds:'',verified:'—'};
const normalize=v=>String(v||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const canonicalName=v=>normalize(v)
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:л|l|мл|ml|кг|kg)\b/g,' ')
  .replace(/\b(carpro)\s+\1\b/g,'$1')
  .replace(/\s+/g,' ').trim();
const hseCanonical=new Map(Object.entries(hseMap).map(([name,row])=>[canonicalName(name),row]));
function hseFor(x){return hseMap[x.n]||hseCanonical.get(canonicalName(x.n))||HSE_FALLBACK;}
const broadCats=['Все','Химия','Расходники','Оборудование'];
const q=document.getElementById('q'),chips=document.getElementById('chips'),list=document.getElementById('list'),count=document.getElementById('count');let active='Все';
function dbDisplayName(c){
  const b=String(c.brand||'').trim(),n=String(c.name||'').trim();
  return b&&n&&!normalize(n).startsWith(normalize(b))?`${b} ${n}`:(n||b||'Без названия');
}
const fromDb=c=>({
  n:dbDisplayName(c),c:c.category||'Химия',m:'DB',col:'#35d2bd',
  f:(c.intended_surfaces||[]).join(', ')||c.category||'Назначение уточняется',
  d:c.dilution||'Не указано',u:c.application_method||'Не указано',a:c.follow_up||'Не указано',
  w:[c.warnings,c.technology_note].filter(Boolean).join(' ')||'Перед применением проверить совместимость.',
  p:`База SIR · ${c.hse_status||'HMS не проверен'}`,
  tags:[c.category,...(c.intended_surfaces||[]),...(c.prohibited_surfaces||[])].filter(Boolean),
  t:c.dwell_time?`Выдержка: ${c.dwell_time}`:'',
  buy:{shop:c.shop_url?'Открыть магазин':'Ссылка не добавлена',url:c.shop_url||'#'},
  src:c.source_note||'',_db:true,_id:c.id,_verification:c.verification_status,_hseStatus:c.hse_status
});
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.type!=='sir-guide-chemicals'||!Array.isArray(e.data.items))return;
  const live=e.data.items
    .filter(c=>c?.active!==false&&c?.verification_status==='manufacturer_verified'&&['verified','source_reviewed'].includes(c?.hse_status))
    .map(fromDb);
  for(const x of live){
    const i=items.findIndex(old=>canonicalName(old.n)===canonicalName(x.n));
    if(i>=0){
      const old=items[i];
      items.splice(i,1,{...old,...x,photo:old.photo||x.photo,src:x.src||old.src,buy:x.buy?.url&&x.buy.url!=='#'?x.buy:old.buy,m:old.m||x.m,col:old.col||x.col});
    }else items.push(x);
  }
  render();
});
function broad(x){if(x.c==='Оборудование')return'Оборудование';if(x.c==='Расходники'||x.c==='Ароматы')return (x.n||'').includes('FoamStop')?'Химия':'Расходники';return'Химия'}
function brand(x){const n=(x.n||'').toLowerCase();if(n.includes('koch'))return'Koch-Chemie';if(n.includes('carpro'))return'CARPRO';if(n.includes('kärcher')||n.includes('karcher'))return'Kärcher';if(n.includes('taski'))return'TASKI';if(n.includes('autoglym'))return'Autoglym';if(n.includes('turtle wax'))return'Turtle Wax';if(n.includes('ecolab'))return'Ecolab';if(n.includes('dasty'))return'Dasty';if(n.includes('eikosha'))return'Eikosha';if(n.includes('bosch'))return'Bosch';if(n.includes('marolex'))return'Marolex';if(n.includes('ava'))return'AVA';return'Другое'}
const brandRank={'Koch-Chemie':0,'CARPRO':1,'Kärcher':2,'TASKI':3,'Autoglym':4,'Turtle Wax':5,'Ecolab':6,'Dasty':7,'Eikosha':8,'Bosch':9,'Marolex':10,'AVA':11,'Другое':99},catRank={'Химия':0,'Расходники':1,'Оборудование':2};
const aliases={
  'пластик':['пластик','пластиков','панель','консоль','торпедо'],
  'кожа':['кожа','кожи','кожан','leather'],
  'текстиль':['текстиль','ткань','обивка','велюр','альканта'],
  'сиденья':['сиден','кресл','обивка'],
  'ковер':['ковер','ковр','ковролин','коврик'],
  'стекло':['стекл','glass','окна'],
  'шины':['шин','резин','колес','tyre','tire'],
  'пятна':['пятн','пятновыводитель','spot'],
  'запах':['запах','запахи','нейтрализац','odor','fresh'],
  'кузов':['кузов','лкп','лак','краск','paint'],
  'диски':['диск','колес','wheel'],
  'пылесос':['пылесос','экстрактор','puzzi','bosch'],
  'пена':['пена','пеногаситель','foam']
};
function searchFields(x){return{
  name:normalize([x.n,brand(x),x.m].join(' ')),
  purpose:normalize([x.c,broad(x),x.f,...(x.tags||[])].join(' ')),
  details:normalize([x.mcolorname,x.t,x.d,x.u,x.a,x.w,x.p,x.buy?.shop,hseFor(x).label,hseFor(x).hazards,hseFor(x).ppe,hseFor(x).storage].join(' '))
}}
function termsFor(token){const direct=aliases[token];if(direct)return direct.map(normalize);const group=Object.entries(aliases).find(([,values])=>values.some(v=>normalize(v).includes(token)||token.includes(normalize(v))));return group?[normalize(token),...group[1].map(normalize)]:[token]}
function searchScore(x,raw){const tokens=normalize(raw).split(' ').filter(Boolean);if(!tokens.length)return 0;const fields=searchFields(x);let total=0;for(const token of tokens){const terms=termsFor(token);let best=0;for(const term of terms){if(fields.name.includes(term))best=Math.max(best,120);if(fields.purpose.includes(term))best=Math.max(best,70);if(fields.details.includes(term))best=Math.max(best,25)}if(!best)return-1;total+=best}return total}
function guideHealth(){
  const chem=items.filter(x=>broad(x)==='Химия');
  const issues=[];
  const seen=new Set();
  for(const x of chem){
    const key=canonicalName(x.n);
    if(seen.has(key))issues.push(`Дубликат: ${x.n}`); else seen.add(key);
    for(const field of ['n','f','d','u','a','w','am','src'])if(!String(x[field]||'').trim())issues.push(`${x.n}: нет поля ${field}`);
    if(x.photo&&!photos[x.photo])issues.push(`${x.n}: фото не найдено`);
    const hs=hseFor(x);
    if(!hs||hs===HSE_FALLBACK||!String(hs.status||'').trim())issues.push(`${x.n}: HMS/SDS не привязан`);
    if(hs?.level==='STOP'&&x.n!=='Gtechniq W4 Citrus Foam'&&!x.n.includes('FoamStop'))issues.push(`${x.n}: неожиданный STOP`);
  }
  if(chem.length<20)issues.push(`Неполный инвентарь: химических/служебных карточек ${chem.length}, ожидается минимум 20`);
  if(!hseMeta?.version)issues.push('Не загружена версия HMS-слоя');
  const health={ok:issues.length===0,issues,count:chem.length,checkedAt:new Date().toISOString()};
  window.SIR_GUIDE_HEALTH=health;
  let el=document.getElementById('guideHealth');
  if(!el){
    el=document.createElement('div');el.id='guideHealth';el.className='guide-health';
    const top=document.querySelector('.top');(top?.parentNode||document.body).insertBefore(el,top||null);
  }
  el.className=`guide-health ${health.ok?'guide-health-ok':'guide-health-stop'}`;
  el.innerHTML=health.ok
    ? `<b>Контроль справочника: OK</b><span>${chem.length} химических/служебных карточек · HMS слой ${h(hseMeta.version||'—')}</span>`
    : `<b>STOP: данные справочника неполны</b><span>${issues.slice(0,4).map(h).join(' · ')}${issues.length>4?` · ещё ${issues.length-4}`:''}</span>`;
  return health;
}
function chipsRender(){chips.innerHTML=broadCats.map(c=>`<button class="chip ${c===active?'active':''}" data-c="${c}">${c}</button>`).join('');chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{active=b.dataset.c;chipsRender();render()})}
function h(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeUrl(v){try{const u=new URL(String(v||''),location.href);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return'#'}}
function card(x){
  const image=x.photo&&photos[x.photo]?photos[x.photo]:'';
  const thumb=image?`<div class="thumb"><img src="${h(image)}" alt="${h(x.n)}"></div>`:`<div class="thumb empty">Фото<br>не добавлено</div>`;
  const hero=image?`<div class="hero"><img src="${h(image)}" alt="${h(x.n)}"></div>`:`<div class="hero empty">Фото этой позиции пока не добавлено</div>`;
  const mark=x.mcolorname?`${x.m} · ${x.mcolorname}`:x.m;
  const method=x.am?`<span class="pill">${h(x.am)}</span>`:'';
  const url=safeUrl(x.buy?.url),canBuy=url!=='#',sourceUrl=safeUrl(x.src),hasSource=sourceUrl!=='#';
  const hs=hseFor(x),sdsUrl=safeUrl(hs.sds),hasSds=sdsUrl!=='#';
  const hseClass=hs.level==='STOP'?'hse-stop':hs.level==='HIGH RISK'?'hse-high':hs.level==='CAUTION'?'hse-caution':'hse-ok';
  const stopGate=hs.level==='STOP'?'<div class="stop-gate"><b>STOP — профессиональное применение заблокировано</b><span>Не использовать в клиентской работе, пока причина STOP не устранена и HMS/SDS не перепроверен.</span></div>':'';
  const buyInline=canBuy?`<a class="buy-inline" href="${h(url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Купить ↗</a>`:'<span class="mini">Ссылка на магазин не добавлена</span>';
  return `<article class="card">
    <div class="head">${thumb}<div class="label" style="background:${h(x.col||'#35d2bd')};color:${h(x.tc||'#111')}">${h(x.m)}</div>
      <div><div class="name">${h(x.n)}</div><div class="mini">${h(x.f)}</div>
      <div class="meta"><span class="pill">${h(mark)}</span><span class="pill">${h(x.c)}</span>${method}<span class="pill hse-pill ${hseClass}">${h(hs.label)}</span></div>${buyInline}</div><div class="arr">⌄</div>
    </div>
    <div class="body">${hero}${stopGate}
      <div class="sec"><b>Что чистить / назначение</b><p>${h(x.f)}</p></div>
      ${x.t?`<div class="sec"><b>Способ нанесения / инструмент</b><p>${h(x.t)}</p></div>`:''}
      <div class="sec"><b>Разведение</b><p>${h(x.d)}</p></div>
      <div class="sec"><b>Как чистить / применять</b><p>${h(x.u)}</p></div>
      <div class="sec"><b>Что делать после</b><p>${h(x.a)}</p></div>
      <div class="sec"><b>Риски и ограничения</b><p class="warn">${h(x.w)}</p></div>
      <div class="sec hse-sec ${hseClass}"><b>HMS / опасности</b><p>${h(hs.hazards)}</p></div>
      <div class="sec"><b>СИЗ</b><p>${h(hs.ppe)}</p></div>
      <div class="sec"><b>Первая помощь</b><p>${h(hs.first)}</p></div>
      <div class="sec"><b>Хранение / обращение</b><p>${h(hs.storage)}</p></div>
      <div class="sec"><b>Проверка HMS</b><p>${h(hs.label)} · проверено ${h(hs.verified||'—')}</p>${hasSds?`<p><a class="buy-btn" href="${h(sdsUrl)}" target="_blank" rel="noopener noreferrer">SDS / HMS-источник ↗</a></p>`:'<p class="warn">SDS не привязан — STOP для профессионального использования.</p>'}</div>
      ${hasSource?`<div class="sec"><b>Источник инструкции</b><p><a class="buy-btn" href="${h(sourceUrl)}" target="_blank" rel="noopener noreferrer">Официальная инструкция ↗</a></p></div>`:''}
      <div class="sec"><b>Где купить</b><p>${canBuy?`<a class="buy-btn" href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(x.buy?.shop||'Магазин')} ↗</a>`:'Ссылка не добавлена'}</p></div>
      <div class="sec"><b>Наличие</b><p>${h(x.p)}</p></div>
      <div class="tags">${(x.tags||[]).map(t=>`<span class="tag">${h(t)}</span>`).join('')}</div>
    </div>
  </article>`;
}
function render(){const s=q.value.trim();const f=items.map(x=>({x,score:searchScore(x,s)})).filter(({x,score})=>(active==='Все'||broad(x)===active)&&(!s||score>=0));const ordered=f.sort((a,b)=>s?b.score-a.score:catRank[broad(a.x)]-catRank[broad(b.x)]||(brandRank[brand(a.x)]??99)-(brandRank[brand(b.x)]??99)||brand(a.x).localeCompare(brand(b.x),'ru')||items.indexOf(a.x)-items.indexOf(b.x)).map(({x})=>x);count.textContent=s?`По запросу «${s}» найдено: ${ordered.length}`:`В справочнике: ${items.length}`;let out='';['Химия','Расходники','Оборудование'].forEach(c=>{const cc=ordered.filter(x=>broad(x)===c);if(!cc.length)return;out+=`<div class="group-title">${c}</div>`;[...new Set(cc.map(brand))].forEach(br=>{const bi=cc.filter(x=>brand(x)===br);out+=`<div class="brand-title">${br}</div>`+bi.map(card).join('')})});list.innerHTML=out||`<div class="empty-search"><b>Ничего не найдено</b><span>Проверьте название или напишите, что нужно очистить: пластик, кожа, сиденья, шины…</span></div>`;list.querySelectorAll('.card').forEach(el=>el.querySelector('.head').onclick=()=>el.classList.toggle('open'));guideHealth()}
chipsRender();q.oninput=render;render();
})();
