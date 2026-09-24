(()=>{
const asObject=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const asArray=v=>Array.isArray(v)?v:[];
const rawItems=Array.isArray(window.SIR_ITEMS)?window.SIR_ITEMS:[];
const items=rawItems.filter(x=>x&&typeof x==='object');
const photos=asObject(window.SIR_PHOTOS);
const hseMap=asObject(window.SIR_HSE);
const hseMeta=asObject(window.SIR_HSE_META);
const HSE_FALLBACK={status:'UNVERIFIED',label:'HMS ikke verifisert',level:'STOP',hazards:'Ingen verifisert SDS/HMS-post er koblet til denne varen.',ppe:'STOP for profesjonelt arbeid til korrekt sikkerhetsdatablad og risikovurdering er lagt inn.',first:'Ved uhell: start nødvendig førstehjelp, bruk etikett/SDS og kontakt Giftinformasjonen 22 59 13 00. Ved alvorlige symptomer: 113.',storage:'Oppbevar i original/korrekt merket beholder og sett varen i karantene til dokumentasjonen er kontrollert.',sds:'',verified:'—'};
const normalize=v=>String(v||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const canonicalName=v=>normalize(v)
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:л|l|мл|ml|кг|kg)\b/g,' ')
  .replace(/\b(carpro)\s+\1\b/g,'$1')
  .replace(/\blegacy red bottle\b/g,' ')
  .replace(/\s+/g,' ').trim();
const hseCanonical=new Map(Object.entries(hseMap).map(([name,row])=>[canonicalName(name),row]));
const hseRiskRank={'LOW':1,'CAUTION':2,'HIGH RISK':3,'STOP':4};
const dbRiskLevel=v=>({low:'LOW',caution:'CAUTION',high_risk:'HIGH RISK',stop:'STOP'}[String(v||'').toLowerCase()]||null);
function hseFor(x){
  const base=hseMap[x.n]||hseCanonical.get(canonicalName(x.n))||HSE_FALLBACK;
  if(!x?._db)return base;
  const dbLevel=x._dbHseStatus==='stop'?'STOP':dbRiskLevel(x._dbRisk);
  const level=dbLevel&&(hseRiskRank[dbLevel]||0)>(hseRiskRank[base.level]||0)?dbLevel:base.level;
  return {
    ...base,
    status:x._dbHseStatus||base.status,
    level,
    label:level==='STOP'?'STOP · '+(base.label||'HMS sperret'):base.label,
    hazards:x._dbHazards||base.hazards,
    ppe:x._dbPpe||base.ppe,
    first:x._dbFirst||base.first,
    storage:x._dbStorage||base.storage,
    sds:x._dbSds||base.sds,
    verified:x._dbVerified||base.verified
  };
}
const broadCats=['Все','Химия','Расходники','Оборудование'];
const q=document.getElementById('q'),chips=document.getElementById('chips'),list=document.getElementById('list'),count=document.getElementById('count');let active='Все';
const missingDom=[['q',q],['chips',chips],['list',list],['count',count]].filter(([,el])=>!el).map(([id])=>id);
if(missingDom.length){
  window.SIR_GUIDE_FATAL={reason:'missing-dom',missing:missingDom};
  window.SIR_RUNTIME_GUARD?.record?.('missing-dom',missingDom.join(', '));
  return;
}
function dbDisplayName(c){
  const b=String(c.brand||'').trim(),n=String(c.name||'').trim();
  return b&&n&&!normalize(n).startsWith(normalize(b))?`${b} ${n}`:(n||b||'Без названия');
}
function liveDbEligible(c){
  if(!c||typeof c!=='object'||c.active===false)return false;
  if(c.verification_status!=='manufacturer_verified'||!['verified','source_reviewed'].includes(c.hse_status))return false;
  if(!String(c.name||c.brand||'').trim())return false;
  if(!Array.isArray(c.intended_surfaces))return false;
  if(c.prohibited_surfaces!=null&&!Array.isArray(c.prohibited_surfaces))return false;
  if(!/^https:\/\//i.test(String(c.source_note||'')))return false;
  if(!/^https:\/\//i.test(String(c.sds_url||'')))return false;
  for(const field of ['dilution','application_method','hse_hazards','hse_ppe','hse_first_aid','hse_storage','hse_verified_at']){
    if(!String(c[field]||'').trim())return false;
  }
  const verified=Date.parse(String(c.hse_verified_at));
  const reviewDays=Number(hseMeta?.reviewDays)||365;
  if(!Number.isFinite(verified)||verified>Date.now()||Date.now()-verified>reviewDays*86400000)return false;
  return true;
}
const fromDb=c=>({
  n:dbDisplayName(c),c:c.category||'Химия',m:'DB',col:'#35d2bd',
  f:asArray(c.intended_surfaces).join(', ')||c.category||'Назначение уточняется',
  d:c.dilution||'Не указано',u:c.application_method||'Не указано',a:c.follow_up||'Не указано',
  w:[c.warnings,c.technology_note].filter(Boolean).join(' ')||'Перед применением проверить совместимость.',
  p:`База SIR · ${c.hse_status||'HMS не проверен'}`,
  tags:[c.category,...asArray(c.intended_surfaces),...asArray(c.prohibited_surfaces)].filter(Boolean),
  t:c.dwell_time?`Выдержка: ${c.dwell_time}`:'',
  buy:{shop:c.shop_url?'Открыть магазин':'Ссылка не добавлена',url:c.shop_url||'#'},
  src:c.source_note||'',_db:true,_id:c.id,_verification:c.verification_status,
  _dbHseStatus:c.hse_status,_dbRisk:c.risk_level,_dbApproval:c.approval_required,
  _dbHazards:c.hse_hazards||'',_dbPpe:c.hse_ppe||'',_dbFirst:c.hse_first_aid||'',_dbStorage:c.hse_storage||'',
  _dbSds:/^https:\/\//i.test(String(c.sds_url||''))?c.sds_url:'',_dbVerified:c.hse_verified_at||''
});
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.type!=='sir-guide-chemicals'||!Array.isArray(e.data.items))return;
  const rejected=e.data.items.filter(c=>!liveDbEligible(c));
  window.SIR_DB_REJECTIONS=rejected.map(c=>({id:c?.id||null,name:dbDisplayName(c||{}),reason:'professional validation failed'}));
  const live=e.data.items.filter(liveDbEligible).map(fromDb);
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
  purpose:normalize([x.c,broad(x),x.f,...asArray(x.tags)].join(' ')),
  details:normalize([x.mcolorname,x.t,x.d,x.u,x.a,x.w,x.p,x.buy?.shop,hseFor(x).label,hseFor(x).hazards,hseFor(x).ppe,hseFor(x).storage].join(' '))
}}
function termsFor(token){const direct=aliases[token];if(direct)return direct.map(normalize);const group=Object.entries(aliases).find(([,values])=>values.some(v=>normalize(v).includes(token)||token.includes(normalize(v))));return group?[normalize(token),...group[1].map(normalize)]:[token]}
function searchScore(x,raw){const tokens=normalize(raw).split(' ').filter(Boolean);if(!tokens.length)return 0;const fields=searchFields(x);let total=0;for(const token of tokens){const terms=termsFor(token);let best=0;for(const term of terms){if(fields.name.includes(term))best=Math.max(best,120);if(fields.purpose.includes(term))best=Math.max(best,70);if(fields.details.includes(term))best=Math.max(best,25)}if(!best)return-1;total+=best}return total}
function guideHealth(){
  const chem=items.filter(x=>broad(x)==='Химия');
  const issues=[];
  const seen=new Set();
  const reviewDays=Number(hseMeta?.reviewDays)||365;
  const now=Date.now();
  let earliestDue=null;
  for(const x of chem){
    const key=canonicalName(x.n);
    if(seen.has(key))issues.push(`Дубликат: ${x.n}`); else seen.add(key);
    for(const field of ['n','f','d','u','a','w','am','src'])if(!String(x[field]||'').trim())issues.push(`${x.n}: нет поля ${field}`);
    if(x.photo&&!photos[x.photo])issues.push(`${x.n}: фото не найдено`);
    const hs=hseFor(x);
    if(!hs||hs===HSE_FALLBACK||!String(hs.status||'').trim())issues.push(`${x.n}: HMS/SDS не привязан`);
    if(hs?.level==='STOP'&&x.n!=='Gtechniq W4 Citrus Foam'&&!x.n.includes('FoamStop'))issues.push(`${x.n}: неожиданный STOP`);
    const verified=Date.parse(String(hs?.verified||''));
    if(!Number.isFinite(verified)){
      issues.push(`${x.n}: некорректная дата HMS`);
    }else{
      const ageDays=Math.floor((now-verified)/86400000);
      if(ageDays<0)issues.push(`${x.n}: дата HMS находится в будущем`);
      if(ageDays>reviewDays)issues.push(`${x.n}: HMS просрочен (${ageDays} дней)`);
      const due=verified+reviewDays*86400000;
      if(earliestDue===null||due<earliestDue)earliestDue=due;
    }
  }
  if(chem.length<20)issues.push(`Неполный инвентарь: химических/служебных карточек ${chem.length}, ожидается минимум 20`);
  if(!hseMeta?.version)issues.push('Не загружена версия HMS-слоя');
  const runtimeErrors=asArray(window.SIR_RUNTIME_ERRORS);
  if(runtimeErrors.length)issues.push(`Системные ошибки загрузки/выполнения: ${runtimeErrors.length}`);
  const health={ok:issues.length===0,issues,count:chem.length,checkedAt:new Date().toISOString(),reviewDays,nextReviewAt:earliestDue?new Date(earliestDue).toISOString().slice(0,10):null};
  window.SIR_GUIDE_HEALTH=health;
  let el=document.getElementById('guideHealth');
  if(!el){
    el=document.createElement('div');el.id='guideHealth';el.className='guide-health';
    const slot=document.querySelector('.pro-health-slot');if(slot)slot.appendChild(el);else{const top=document.querySelector('.top');(top?.parentNode||document.body).insertBefore(el,top||null);}
  }
  el.className=`guide-health ${health.ok?'guide-health-ok':'guide-health-stop'}`;
  el.innerHTML=health.ok
    ? `<b>Контроль справочника: OK</b><span>${chem.length} химических/служебных карточек · HMS слой ${h(hseMeta.version||'—')} · следующая обязательная перепроверка не позднее ${h(health.nextReviewAt||'—')}</span>`
    : `<b>STOP: данные справочника неполны/устарели</b><span>${issues.slice(0,4).map(h).join(' · ')}${issues.length>4?` · ещё ${issues.length-4}`:''}</span>`;
  return health;
}
function chipsRender(){chips.innerHTML=broadCats.map(c=>`<button class="chip ${c===active?'active':''}" data-c="${c}">${c}</button>`).join('');chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{active=b.dataset.c;chipsRender();render()})}
function h(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeUrl(v){try{const u=new URL(String(v||''),location.href);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return'#'}}
function dilutionSpec(text){
  const raw=String(text||'').replace(/,/g,'.');
  const ranges=[];
  const exact=new Set();
  const rangeRe=/1\s*:\s*(\d+(?:\.\d+)?)\s*[–—-]\s*1\s*:\s*(\d+(?:\.\d+)?)/g;
  let m;
  while((m=rangeRe.exec(raw))){
    const a=Number(m[1]),b=Number(m[2]);
    if(Number.isFinite(a)&&Number.isFinite(b)&&a>0&&b>0&&a<=1000&&b<=1000)ranges.push([Math.min(a,b),Math.max(a,b)]);
  }
  const exactRe=/1\s*:\s*(\d+(?:\.\d+)?)/g;
  while((m=exactRe.exec(raw))){
    const n=Number(m[1]);
    if(Number.isFinite(n)&&n>0&&n<=1000)exact.add(n);
  }
  return {exact:[...exact],ranges};
}
function dilutionAllowed(spec,ratio){
  if(!Number.isFinite(ratio)||ratio<=0)return false;
  if(spec.exact.some(x=>Math.abs(x-ratio)<1e-9))return true;
  return spec.ranges.some(([min,max])=>ratio>=min&&ratio<=max);
}
function dilutionCalculator(x,hs,hasSource,hasSds){
  if(broad(x)!=='Химия'||hs.level==='STOP'||!hasSource||!hasSds)return'';
  const spec=dilutionSpec(x.d);
  if(!spec.exact.length&&!spec.ranges.length)return'';
  const candidates=[...spec.exact,...spec.ranges.flat()];
  const defaultRatio=Math.max(...candidates);
  const exact=spec.exact.join(',');
  const ranges=spec.ranges.map(([a,b])=>a+'-'+b).join(';');
  return `<div class="sec dilution-calc" data-dilution-calc data-exact="${h(exact)}" data-ranges="${h(ranges)}">
    <b>Калькулятор разведения 1:X</b>
    <p class="mini">Калькулятор только считает объёмы. Значение X берите из подтверждённой инструкции «Разведение» выше — он не разрешает усиливать смесь вне указанного диапазона.</p>
    <div style="display:grid;grid-template-columns:minmax(110px,.7fr) minmax(140px,1fr);gap:8px;align-items:end">
      <label class="mini">X в пропорции 1:X<input data-role="ratio" type="number" min="0.1" max="1000" step="0.1" inputmode="decimal" value="${h(defaultRatio)}" style="width:100%;margin-top:5px"></label>
      <label class="mini">Готовый раствор, мл<input data-role="total" type="number" min="50" max="10000" step="10" inputmode="numeric" value="500" style="width:100%;margin-top:5px"></label>
    </div>
    <p data-role="result" class="mini" style="margin-top:8px"></p>
  </div>`;
}
function bindDilutionCalculators(){
  list.querySelectorAll('[data-dilution-calc]').forEach(calc=>{
    const ratioEl=calc.querySelector('[data-role="ratio"]');
    const totalEl=calc.querySelector('[data-role="total"]');
    const out=calc.querySelector('[data-role="result"]');
    const exact=String(calc.dataset.exact||'').split(',').filter(Boolean).map(Number).filter(Number.isFinite);
    const ranges=String(calc.dataset.ranges||'').split(';').filter(Boolean).map(v=>v.split('-').map(Number)).filter(v=>v.length===2&&v.every(Number.isFinite));
    const spec={exact,ranges};
    const format=n=>Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
    const update=()=>{
      const ratio=Number(String(ratioEl?.value||'').replace(',','.'));
      const total=Number(String(totalEl?.value||'').replace(',','.'));
      if(!dilutionAllowed(spec,ratio)){
        out.textContent='STOP: выбранное 1:'+String(ratioEl?.value||'—')+' не входит в подтверждённое разведение этой карточки.';
        out.classList.add('warn');
        return;
      }
      if(!Number.isFinite(total)||total<50||total>10000){
        out.textContent='Введите итоговый объём от 50 до 10 000 мл.';
        out.classList.add('warn');
        return;
      }
      const chemical=total/(ratio+1);
      const water=total-chemical;
      out.textContent=`1:${format(ratio)} · ${format(total)} мл = ${format(chemical)} мл средства + ${format(water)} мл воды.`;
      out.classList.remove('warn');
    };
    ratioEl?.addEventListener('input',update);
    totalEl?.addEventListener('input',update);
    update();
  });
}
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
      ${dilutionCalculator(x,hs,hasSource,hasSds)}
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
      <div class="tags">${asArray(x.tags).map(t=>`<span class="tag">${h(t)}</span>`).join('')}</div>
    </div>
  </article>`;
}

function initProfessionalUI(){
  if(document.querySelector('.pro-sidebar'))return;
  const wrap=document.querySelector('.wrap'),top=document.querySelector('.top');
  if(!wrap||!top)return;

  wrap.insertBefore(top,wrap.firstChild);

  const hero=document.createElement('section');
  hero.className='pro-hero';
  hero.id='dashboard';
  hero.innerHTML=`<div class="pro-eyebrow">SIR WORKSPACE · KONGSBERG</div>
    <h1>Рабочая панель детейлинга</h1>
    <p class="pro-hero-copy">Быстрый доступ к технологическим схемам, химии и HMS/SDS. Интерфейс построен для работы с телефона одной рукой и для полноценной панели на компьютере.</p>
    <div class="pro-quick">
      <a class="pro-action" href="#cleaningWizard"><span class="pro-action-icon">↳</span><strong>Подобрать схему</strong><span>Элемент → загрязнение → безопасный пошаговый план</span></a>
      <a class="pro-action" href="#list" data-focus-search="1"><span class="pro-action-icon">⌕</span><strong>Найти средство</strong><span>По названию, поверхности, задаче или материалу</span></a>
      <a class="pro-action" href="#hseBoard"><span class="pro-action-icon">!</span><strong>HMS / SDS</strong><span>Риски, СИЗ, первая помощь и проверенные документы</span></a>
    </div>
    <div class="pro-stats">
      <span class="pro-stat"><b id="proStatAll">—</b> позиций</span>
      <span class="pro-stat"><b id="proStatChem">—</b> химия</span>
      <span class="pro-stat"><b id="proStatHse">—</b> HMS готовы</span>
    </div>
    <div class="pro-health-slot"></div>`;
  top.insertAdjacentElement('afterend',hero);

  const wizard=document.getElementById('cleaningWizard');
  if(wizard)hero.insertAdjacentElement('afterend',wizard);

  const sidebar=document.createElement('aside');
  sidebar.className='pro-sidebar';
  sidebar.setAttribute('aria-label','Навигация SIR');
  sidebar.innerHTML=`<div class="pro-side-brand"><div class="pro-logo">SIR</div><div><div class="pro-brand-name">Rens & Pleie</div><div class="pro-brand-sub">Detailing workspace</div></div></div>
    <nav class="pro-side-nav">
      <a class="primary" href="#dashboard">⌂ <span>Рабочая панель</span></a>
      <a href="#cleaningWizard">↳ <span>Мастер очистки</span></a>
      <a href="#list" data-focus-search="1">⌕ <span>Справочник химии</span></a>
      <a href="#hseBoard">! <span>HMS / SDS</span></a>
    </nav>
    <div class="pro-side-foot">SIR Rens & Pleie<br>Профессиональный рабочий справочник<br><span style="color:#42ddba">● система активна</span></div>`;
  document.body.prepend(sidebar);

  const mobile=document.createElement('nav');
  mobile.className='pro-mobile-nav';
  mobile.setAttribute('aria-label','Быстрая навигация');
  mobile.innerHTML=`<a class="primary" href="#dashboard"><span>⌂</span>Главная</a><a href="#cleaningWizard"><span>↳</span>Мастер</a><a href="#list" data-focus-search="1"><span>⌕</span>Химия</a><a href="#hseBoard"><span>!</span>HMS</a>`;
  document.body.appendChild(mobile);

  document.querySelectorAll('[data-focus-search]').forEach(a=>a.addEventListener('click',()=>{
    setTimeout(()=>{q?.focus();q?.scrollIntoView({behavior:'smooth',block:'center'})},180);
  }));
}
function updateProStats(){
  const chem=items.filter(x=>broad(x)==='Химия');
  const ready=chem.filter(x=>hseFor(x).level!=='STOP'&&String(hseFor(x).verified||'').trim()&&hseFor(x).verified!=='—').length;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v)};
  set('proStatAll',items.length);set('proStatChem',chem.length);set('proStatHse',ready);
}

function render(){const s=q.value.trim();const f=items.map(x=>({x,score:searchScore(x,s)})).filter(({x,score})=>(active==='Все'||broad(x)===active)&&(!s||score>=0));const ordered=f.sort((a,b)=>s?b.score-a.score:catRank[broad(a.x)]-catRank[broad(b.x)]||(brandRank[brand(a.x)]??99)-(brandRank[brand(b.x)]??99)||brand(a.x).localeCompare(brand(b.x),'ru')||items.indexOf(a.x)-items.indexOf(b.x)).map(({x})=>x);count.textContent=s?`По запросу «${s}» найдено: ${ordered.length}`:`В справочнике: ${items.length}`;let out='';['Химия','Расходники','Оборудование'].forEach(c=>{const cc=ordered.filter(x=>broad(x)===c);if(!cc.length)return;out+=`<div class="group-title">${c}</div>`;[...new Set(cc.map(brand))].forEach(br=>{const bi=cc.filter(x=>brand(x)===br);out+=`<div class="brand-title">${br}</div>`+bi.map(card).join('')})});updateProStats();list.innerHTML=out||`<div class="empty-search"><b>Ничего не найдено</b><span>Проверьте название или напишите, что нужно очистить: пластик, кожа, сиденья, шины…</span></div>`;list.querySelectorAll('.card').forEach(el=>el.querySelector('.head').onclick=()=>el.classList.toggle('open'));bindDilutionCalculators();guideHealth()}
initProfessionalUI();chipsRender();q.oninput=render;render();
})();
