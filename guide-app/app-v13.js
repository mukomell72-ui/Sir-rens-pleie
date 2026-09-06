(()=>{
const items=window.SIR_ITEMS||[];
const photos=window.SIR_PHOTOS||{};
const broadCats=['Все','Химия','Расходники','Оборудование'];
const q=document.getElementById('q'),chips=document.getElementById('chips'),list=document.getElementById('list'),count=document.getElementById('count');let active='Все';
const fromDb=c=>({n:[c.brand,c.name].filter(Boolean).join(' '),c:'Салон',m:'DB',col:'#35d2bd',f:(c.intended_surfaces||[]).join(', ')||c.category||'Назначение уточняется',d:c.dilution||'Не указано',u:c.application_method||'Не указано',a:c.follow_up||'Не указано',w:[c.warnings,c.technology_note].filter(Boolean).join(' ' )||'Перед применением проверить совместимость.',p:'Актуальная запись из базы SIR',tags:[c.category,...(c.intended_surfaces||[]),...(c.prohibited_surfaces||[])].filter(Boolean),t:c.dwell_time?`Выдержка: ${c.dwell_time}`:'',buy:{shop:c.shop_url?'Открыть магазин':'Ссылка не добавлена',url:c.shop_url||'#'},_db:true,_id:c.id});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='sir-guide-chemicals'||!Array.isArray(e.data.items))return;const live=e.data.items.map(fromDb);for(const x of live){const i=items.findIndex(old=>normalize(old.n)===normalize(x.n));if(i>=0)items.splice(i,1,x);else items.push(x)}render();});
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
function normalize(v){return String(v||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim()}
function searchFields(x){return{
  name:normalize([x.n,brand(x),x.m].join(' ')),
  purpose:normalize([x.c,broad(x),x.f,...(x.tags||[])].join(' ')),
  details:normalize([x.mcolorname,x.t,x.d,x.u,x.a,x.w,x.p,x.buy?.shop].join(' '))
}}
function termsFor(token){const direct=aliases[token];if(direct)return direct.map(normalize);const group=Object.entries(aliases).find(([,values])=>values.some(v=>normalize(v).includes(token)||token.includes(normalize(v))));return group?[normalize(token),...group[1].map(normalize)]:[token]}
function searchScore(x,raw){const tokens=normalize(raw).split(' ').filter(Boolean);if(!tokens.length)return 0;const fields=searchFields(x);let total=0;for(const token of tokens){const terms=termsFor(token);let best=0;for(const term of terms){if(fields.name.includes(term))best=Math.max(best,120);if(fields.purpose.includes(term))best=Math.max(best,70);if(fields.details.includes(term))best=Math.max(best,25)}if(!best)return-1;total+=best}return total}
function chipsRender(){chips.innerHTML=broadCats.map(c=>`<button class="chip ${c===active?'active':''}" data-c="${c}">${c}</button>`).join('');chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{active=b.dataset.c;chipsRender();render()})}
function h(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeUrl(v){try{const u=new URL(String(v||''),location.href);return ['https:','http:'].includes(u.protocol)?u.href:'#'}catch{return'#'}}
function card(x){const image=x.photo&&photos[x.photo]?photos[x.photo]:'';const thumb=image?`<div class="thumb"><img src="${h(image)}" alt="${h(x.n)}"></div>`:`<div class="thumb empty">Фото<br>не добавлено</div>`;const hero=image?`<div class="hero"><img src="${h(image)}" alt="${h(x.n)}"></div>`:`<div class="hero empty">Фото этой позиции пока не добавлено</div>`;const mark=x.mcolorname?`${x.m} · ${x.mcolorname}`:x.m,url=safeUrl(x.buy?.url),canBuy=url!=='#',buyInline=canBuy?`<a class="buy-inline" href="${h(url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Купить ↗</a>`:'<span class="mini">Ссылка на магазин не добавлена</span>';return `<article class="card"><div class="head">${thumb}<div class="label" style="background:${h(x.col||'#35d2bd')};color:${h(x.tc||'#111')}">${h(x.m)}</div><div><div class="name">${h(x.n)}</div><div class="mini">${h(x.f)}</div><div class="meta"><span class="pill">${h(mark)}</span><span class="pill">${h(x.c)}</span></div>${buyInline}</div><div class="arr">⌄</div></div><div class="body">${hero}<div class="sec"><b>Что чистить / назначение</b><p>${h(x.f)}</p></div>${x.t?`<div class="sec"><b>Чем чистить / чем наносить</b><p>${h(x.t)}</p></div>`:''}<div class="sec"><b>Разведение</b><p>${h(x.d)}</p></div><div class="sec"><b>Как чистить / применять</b><p>${h(x.u)}</p></div><div class="sec"><b>Что делать после</b><p>${h(x.a)}</p></div><div class="sec"><b>Риски и ограничения</b><p class="warn">${h(x.w)}</p></div><div class="sec"><b>Где купить</b><p>${canBuy?`<a class="buy-btn" href="${h(url)}" target="_blank" rel="noopener noreferrer">${h(x.buy?.shop||'Магазин')} ↗</a>`:'Ссылка не добавлена'}</p></div><div class="sec"><b>Наличие</b><p>${h(x.p)}</p></div><div class="tags">${(x.tags||[]).map(t=>`<span class="tag">${h(t)}</span>`).join('')}</div></div></article>`}
function render(){const s=q.value.trim();const f=items.map(x=>({x,score:searchScore(x,s)})).filter(({x,score})=>(active==='Все'||broad(x)===active)&&(!s||score>=0));const ordered=f.sort((a,b)=>s?b.score-a.score:catRank[broad(a.x)]-catRank[broad(b.x)]||(brandRank[brand(a.x)]??99)-(brandRank[brand(b.x)]??99)||brand(a.x).localeCompare(brand(b.x),'ru')||items.indexOf(a.x)-items.indexOf(b.x)).map(({x})=>x);count.textContent=s?`По запросу «${s}» найдено: ${ordered.length}`:`В справочнике: ${items.length}`;let out='';['Химия','Расходники','Оборудование'].forEach(c=>{const cc=ordered.filter(x=>broad(x)===c);if(!cc.length)return;out+=`<div class="group-title">${c}</div>`;[...new Set(cc.map(brand))].forEach(br=>{const bi=cc.filter(x=>brand(x)===br);out+=`<div class="brand-title">${br}</div>`+bi.map(card).join('')})});list.innerHTML=out||`<div class="empty-search"><b>Ничего не найдено</b><span>Проверьте название или напишите, что нужно очистить: пластик, кожа, сиденья, шины…</span></div>`;list.querySelectorAll('.card').forEach(el=>el.querySelector('.head').onclick=()=>el.classList.toggle('open'))}
chipsRender();q.oninput=render;render();
})();
