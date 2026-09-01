(() => {
  const C=window.SIR_CONFIG;
  const root=document.getElementById('techApp');
  const orderId=new URLSearchParams(location.search).get('order');
  if(!root||!orderId||!window.supabase)return;
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const safeUrl=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:'';}catch(_e){return'';}};
  const riskRank={low:1,caution:2,high_risk:3,stop:4};
  const riskName={low:'LOW',caution:'CAUTION',high_risk:'HIGH RISK',stop:'STOP'};
  const surfaceName={textile:'Текстиль',carpet:'Ковролин / пол',headliner:'Потолок',mattress:'Матрас',interior_plastic:'Пластик салона',leather:'Кожа / экокожа',seat_belt:'Ремень безопасности',child_seat:'Детское кресло'};
  let data=null,loading=false;

  const itemSurface={
    seat:'textile',floor_carpet:'carpet',trunk:'carpet',textile_mats:'carpet',
    ceiling:'headliner',door_cards:'interior_plastic',dashboard_console:'interior_plastic',
    interior_plastic:'interior_plastic',seat_belt:'seat_belt',child_seat:'child_seat'
  };
  const fallback={carpet:'textile',seat_belt:'textile',child_seat:'textile'};

  async function load(){
    if(loading)return;loading=true;
    try{
      const {data:{session}}=await sb.auth.getSession();if(!session)return;
      const [{data:o,error},{data:items=[]},{data:card},{data:procedures=[]},{data:chemicals=[]}]=await Promise.all([
        sb.from('orders').select('id,service_type,package_code,contamination,risk_level,vehicle_seats').eq('id',orderId).single(),
        sb.from('order_items').select('item_code,quantity').eq('order_id',orderId),
        sb.from('order_technology_cards').select('material_guess,risk_level,reviewed_at').eq('order_id',orderId).maybeSingle(),
        sb.from('procedures').select('code,name,surface_type,contamination,risk_level,steps,stop_conditions,verified,version,pass_plan,drying_rule,mechanical_method,chemical_rule,source_note').eq('verified',true),
        sb.from('chemicals').select('brand,name,category,intended_surfaces,prohibited_surfaces,dilution,application_method,dwell_time,follow_up,warnings,verification_status,source_note,active').eq('active',true).eq('verification_status','manufacturer_verified')
      ]);
      if(error||!o)return;
      data={order:o,items,card,procedures,chemicals};append();
    }finally{loading=false;}
  }

  function surfaces(){
    const {order,items,card}=data;
    const result=new Set();
    const material=String(card?.material_guess||'').toLowerCase();
    const leather=/кож|leather|skinn|eco.?leather|kunstskinn/.test(material);
    if(order.service_type==='mattress')result.add('mattress');
    else if(order.service_type==='sofa'||order.service_type==='chair')result.add(leather?'leather':'textile');
    else if(order.service_type==='car'){
      if(order.package_code==='full'){
        result.add(leather?'leather':'textile');result.add('carpet');result.add('headliner');result.add('interior_plastic');
      }else if(order.package_code==='seats')result.add(leather?'leather':'textile');
      else for(const it of items){const s=itemSurface[it.item_code];if(!s)continue;if(s==='textile'&&leather)result.add('leather');else result.add(s);}
    }
    return [...result];
  }

  function procedureFor(surface){
    const level=data.order.contamination;
    if(level==='special')return null;
    return data.procedures.find(p=>p.surface_type===surface&&p.contamination===level)
      ||data.procedures.find(p=>p.surface_type===fallback[surface]&&p.contamination===level)
      ||null;
  }

  function chemicalCandidates(surface){
    if(['headliner','leather','seat_belt','child_seat','interior_plastic'].includes(surface))return[];
    const keys=surface==='carpet'?['carpet','textile']:surface==='mattress'?['textile','mattress']:['textile'];
    return data.chemicals.filter(c=>{
      const allowed=(c.intended_surfaces||[]).join(' ').toLowerCase();
      const prohibited=(c.prohibited_surfaces||[]).join(' ').toLowerCase();
      return keys.some(k=>allowed.includes(k))&&!keys.some(k=>prohibited.includes(k));
    });
  }

  function maxRisk(rows){
    let r=data.card?.risk_level||data.order.risk_level||'low';
    for(const x of rows)if(x?.risk_level&&riskRank[x.risk_level]>riskRank[r])r=x.risk_level;
    return r;
  }

  function procedureCard(surface,p){
    if(!p){
      const special=data.order.contamination==='special';
      return `<article class="card"><div class="section-title"><div><h3>${esc(surfaceName[surface]||surface)}</h3><p>${special?'Особое состояние — автоматическая технология запрещена.':'Проверенной процедуры для этой комбинации пока нет.'}</p></div><span class="risk ${special?'stop':'caution'}">${special?'STOP':'CAUTION'}</span></div><div class="notice">Осмотр → фото → spot-test → решение OWNER/менеджера. Не подбирать более сильную химию методом проб.</div></article>`;
    }
    const steps=Array.isArray(p.steps)?p.steps:[],stops=Array.isArray(p.stop_conditions)?p.stop_conditions:[];
    const chems=chemicalCandidates(surface);
    return `<article class="card"><div class="section-title"><div><h3>${esc(surfaceName[surface]||surface)} · ${esc(p.name)}</h3><p>Процедура ${esc(p.code||'')} · версия ${Number(p.version)||1}</p></div><span class="risk ${(p.risk_level||'low').replace('_','-')}">${riskName[p.risk_level]||esc(p.risk_level)}</span></div>
      <div class="kv"><span>Проходы</span><b>${esc(p.pass_plan||'Только после оценки')}</b></div>
      <div class="kv"><span>Сушка между проходами</span><b>${esc(p.drying_rule||'Оценивать по материалу и влажности')}</b></div>
      <div class="kv"><span>Механика / инструмент</span><b>${esc(p.mechanical_method||'Щадящее воздействие после теста')}</b></div>
      <div class="kv"><span>Правило химии</span><b>${esc(p.chemical_rule||'Только подтверждённая совместимость')}</b></div>
      <h4>Последовательность</h4><ol>${steps.map(x=>`<li style="margin:8px 0">${esc(x)}</li>`).join('')}</ol>
      <h4>STOP</h4><ul>${stops.map(x=>`<li style="margin:8px 0">${esc(x)}</li>`).join('')}</ul>
      <div class="notice safe"><b>Химия из проверенного SIR Guide:</b>${chems.length?` ${chems.map(chemLine).join('<hr style="border:0;border-top:1px solid #ffffff12;margin:10px 0">')}`:' автоматический выбор для этой поверхности отключён. Сначала подтвердить материал и совместимость.'}</div>
    </article>`;
  }

  function chemLine(c){
    const src=safeUrl(c.source_note);
    return `<div><b>${esc([c.brand,c.name].filter(Boolean).join(' '))}</b> · ${esc(c.dilution||'разведение см. у производителя')}<br><span class="mini">${esc(c.application_method||'')} ${c.dwell_time?`Выдержка: ${esc(c.dwell_time)}.`:''} ${c.follow_up?`После: ${esc(c.follow_up)}`:''}</span>${c.warnings?`<br><span class="mini">Предупреждение: ${esc(c.warnings)}</span>`:''}${src?`<br><a href="${src}" target="_blank" rel="noopener noreferrer">Источник производителя</a>`:''}</div>`;
  }

  function append(){
    if(!data||root.querySelector('#sirProcedurePlan'))return;
    const ss=surfaces(),rows=ss.map(procedureFor),risk=maxRisk(rows);
    const section=document.createElement('section');section.id='sirProcedurePlan';section.className='panel';
    section.innerHTML=`<div class="panel-head"><span>Технология по зонам: проходы, сушка, химия</span><span class="risk ${risk.replace('_','-')}">${riskName[risk]||risk}</span></div>
      <div class="notice" style="margin:14px"><b>Это рабочая карта SIR, а не разрешение рисковать.</b> Если реальный материал, клей, цвет или состояние не совпадают с ожиданием — действует более высокий риск и STOP. Конкретное разведение/выдержка берутся только из manufacturer_verified карточки конкретного средства.</div>
      <div style="display:grid;gap:12px;padding:14px">${ss.length?ss.map((s,i)=>procedureCard(s,rows[i])).join(''):'<div class="empty">Зоны работы ещё не определены.</div>'}</div>`;
    root.appendChild(section);
  }

  addEventListener('DOMContentLoaded',()=>{
    const obs=new MutationObserver(()=>{if(!root.querySelector('#sirProcedurePlan')){data=null;setTimeout(load,80);}});
    obs.observe(root,{childList:true,subtree:false});load();
  });
})();
