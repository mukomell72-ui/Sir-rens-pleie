(() => {
  const C=window.SIR_CONFIG;
  const root=document.getElementById('techApp');
  const orderId=new URLSearchParams(location.search).get('order');
  const sb=window.SIR_ADMIN_SB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const safeUrl=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:'';}catch{return'';}};
  const riskRank={low:1,caution:2,high_risk:3,stop:4};
  const managerRoles=['owner','admin','manager'];
  let session,profile,order,card,items=[],photos=[],chemicals=[];

  init();
  async function init(){
    try{
      const {data:{session:s},error:sessionError}=await sb.auth.getSession();
      if(sessionError)throw sessionError;
      session=s;
      if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>, затем откройте технологическую карту из заказа.</div>';return;}
      const {data:p,error:profileError}=await sb.from('profiles').select('role,display_name,active').eq('id',session.user.id).single();
      if(profileError)throw profileError;
      profile=p;
      if(!profile?.active){root.innerHTML='<div class="notice">Доступ отключён.</div>';return;}
      if(!orderId){root.innerHTML='<div class="notice safe">Откройте конкретный заказ в SIR Admin и нажмите «Открыть SIR Технолог». Технологическая карта всегда должна быть связана с реальным заказом и его фотографиями.</div>';return;}
      if(await load())render();
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'technology.init');
      root.innerHTML='<div class="notice"><b>SIR Технолог не загружен.</b><br>Нет подтверждённого ответа от базы. Не начинайте работу по неполной карте.</div><button class="btn primary" id="techRetry">Повторить</button>';
      root.querySelector('#techRetry')?.addEventListener('click',()=>location.reload());
    }
  }

  async function load(){
    const [orderRes,itemRes,photoRes,cardRes,chemRes]=await Promise.all([
      sb.from('orders').select('*').eq('id',orderId).single(),
      sb.from('order_items').select('*').eq('order_id',orderId).order('created_at'),
      sb.from('order_photos').select('*').eq('order_id',orderId).order('created_at'),
      sb.from('order_technology_cards').select('*').eq('order_id',orderId).maybeSingle(),
      sb.from('chemicals').select('*').eq('active',true).eq('verification_status','manufacturer_verified').in('hse_status',['verified','source_reviewed']).neq('risk_level','stop').order('brand').order('name')
    ]);
    const criticalError=orderRes.error||itemRes.error||cardRes.error||chemRes.error;
    if(criticalError||!orderRes.data){
      window.SIR_ADMIN_RUNTIME?.record(criticalError||new Error('order not found'),'technology.load');
      root.innerHTML='<div class="notice"><b>Технологическая карта не загружена полностью.</b><br>Рабочие действия заблокированы до успешной повторной загрузки.</div><button class="btn primary" id="techRetry">Повторить</button>';
      root.querySelector('#techRetry')?.addEventListener('click',async()=>{root.innerHTML='<div class="empty">Обновляю…</div>';if(await load())render();});
      return false;
    }
    if(photoRes.error)window.SIR_ADMIN_RUNTIME?.record(photoRes.error,'technology.photos');
    order=orderRes.data;items=itemRes.data||[];card=cardRes.data;chemicals=chemRes.data||[];
    photos=[];
    for(const photo of (photoRes.data||[])){
      const {data,error}=await sb.storage.from('order-photos').createSignedUrl(photo.storage_path,1800);
      if(error){window.SIR_ADMIN_RUNTIME?.record(error,'technology.photo_url');continue;}
      if(data?.signedUrl)photos.push({url:data.signedUrl});
    }
    return true;
  }

  function render(){
    const canManage=managerRoles.includes(profile.role);
    const risk=(card?.risk_level||order.risk_level||'caution').toUpperCase();
    const steps=Array.isArray(card?.instructions)?card.instructions:[];
    const stops=Array.isArray(card?.stop_conditions)?card.stop_conditions:[];
    const orderItems=order.service_type==='rug'
      ?`Ковёр · материал: ${esc(order.material_code||'не подтверждён')}`
      :items.length?items.map(x=>`${esc(itemLabel(x.item_code))} × ${x.quantity}`).join(', '):(order.package_code==='full'?'Полный салон':esc(order.package_code||'—'));
    const matched=matchedChemicals();
    root.innerHTML=`
      <div class="section-title"><div><h1>${esc(order.order_no)} · SIR Технолог</h1><p>${esc(order.customer_name)} · ${esc(serviceLabel(order.service_type))} · загрязнение: ${esc(conditionLabel(order.contamination))}</p></div><a class="btn" href="./">← Admin</a></div>
      <div class="notice safe"><b>Принцип:</b> карта задаёт безопасную последовательность, а не разрешение «усиливать до результата». Реальный материал, цветостойкость, клей и повреждения проверяются на месте.</div>
      <div class="settings-grid">
        <section class="card"><h3>Заказ</h3><div class="kv"><span>Работы</span><b>${orderItems}</b></div><div class="kv"><span>Пятна</span><b>${order.stains?'да':'нет'}</b></div><div class="kv"><span>Шерсть</span><b>${order.pet_hair?'да':'нет'}</b></div><div class="kv"><span>Запах</span><b>${order.odor?'да':'нет'}</b></div><div class="kv"><span>Расчётное время</span><b>${timeLabel(order.estimated_minutes)}</b></div><div class="kv"><span>Текущий риск</span><b class="risk ${risk==='STOP'?'stop':risk==='HIGH_RISK'?'high':risk==='CAUTION'?'caution':'low'}">${risk}</b></div>${canManage?'<button class="btn primary" id="generate">Сформировать безопасный черновик</button>':''}<button class="btn" id="raiseStop" style="margin-left:8px">STOP — остановить работу</button></section>
        <section class="card"><h3>Подтверждение материала</h3><div class="field"><label>Материал после осмотра</label><input id="material" value="${esc(card?.material_guess||'Требуется проверка материала на месте')}" ${canManage?'':'disabled'}></div><div class="field"><label>Оценка загрязнения 1–10</label><input id="score" type="number" min="1" max="10" value="${card?.contamination_score??''}" ${canManage?'':'disabled'}></div><div class="field"><label>Риск</label><select id="risk" ${canManage?'':'disabled'}>${['low','caution','high_risk','stop'].map(x=>`<option value="${x}" ${(card?.risk_level||order.risk_level)===x?'selected':''}>${x.toUpperCase()}</option>`).join('')}</select></div><div class="field"><label>Заметка владельца/менеджера</label><textarea id="ownerNote" ${canManage?'':'disabled'}>${esc(card?.owner_note||'')}</textarea></div>${canManage?'<button class="btn primary" id="approve">Подтвердить карту</button>':''}<p class="mini">${card?.reviewed_at?`Подтверждено человеком: ${new Date(card.reviewed_at).toLocaleString('ru')}`:'Пока не подтверждено человеком.'}</p></section>
      </div>
      ${photos.length?`<section class="panel"><div class="panel-head">Фото клиента</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:14px">${photos.map(x=>`<a href="${x.url}" target="_blank" rel="noopener noreferrer"><img src="${x.url}" alt="Фото заказа" style="width:100%;height:160px;object-fit:cover;border-radius:12px"></a>`).join('')}</div></section>`:'<div class="notice">Фото клиента не загружены. Для спорного материала итоговую технологию не подтверждать без осмотра.</div>'}
      <section class="panel"><div class="panel-head"><span>Последовательность работ</span><span>${risk}</span></div><div style="padding:16px">${steps.length?`<ol>${steps.map(x=>`<li style="margin:10px 0">${esc(x)}</li>`).join('')}</ol>`:'<p>Черновик ещё не сформирован.</p>'}</div></section>
      <section class="panel"><div class="panel-head">Обязательные условия STOP</div><div style="padding:16px">${stops.length?`<ul>${stops.map(x=>`<li style="margin:10px 0">${esc(x)}</li>`).join('')}</ul>`:'<p>После формирования карты здесь появятся условия остановки.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><span>Химия, совпадающая по области применения</span><span class="mini">manufacturer_verified + HMS gate · ${matched.length}</span></div><div class="notice safe" style="margin:14px"><b>Это только безопасные кандидаты после HMS-фильтра.</b> HIGH RISK, STOP, непроверенный HMS и средства с обязательным подтверждением исключены из автоподбора. Перед использованием всё равно обязательны осмотр материала и spot-test.</div>${chemTable(matched)}</section>
      <details class="panel"><summary class="panel-head">Показать всю проверенную базу SIR (${chemicals.length})</summary>${chemTable(chemicals)}</details>`;

    document.getElementById('generate')?.addEventListener('click',generate);
    document.getElementById('approve')?.addEventListener('click',approve);
    document.getElementById('raiseStop')?.addEventListener('click',raiseStop);
  }

  function matchedChemicals(){
    const wanted=new Set();
    if(['car','sofa','chair','mattress'].includes(order.service_type)){wanted.add('textiles');wanted.add('textile');wanted.add('upholstery');wanted.add('vehicle interior');}
    if(order.service_type==='rug'){wanted.add('carpet');wanted.add('rug');wanted.add('textile');wanted.add('textiles');}
    if(order.service_type==='car'&&items.some(x=>['interior_plastic','dashboard_console','door_cards'].includes(x.item_code))){wanted.add('vehicle interior');wanted.add('interior_plastic');}
    return chemicals.filter(c=>{
      if(c.approval_required||c.risk_level==='high_risk'||c.risk_level==='stop')return false;
      if(!['verified','source_reviewed'].includes(c.hse_status))return false;
      return (c.intended_surfaces||[]).some(s=>wanted.has(String(s).toLowerCase()));
    });
  }
  function chemTable(rows){
    if(!rows.length)return'<div class="empty">Нет химии, прошедшей одновременно технологическую и HMS-проверку для безопасного автоматического подбора. Используйте SIR Guide и ручное подтверждение, не придумывайте смесь/разведение.</div>';
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Средство</th><th>Риск / HMS</th><th>Разведение</th><th>Как применять</th><th>Выдержка</th><th>После</th><th>STOP / предупреждение</th></tr></thead><tbody>${rows.map(x=>{
      const src=safeUrl(x.source_note),sds=safeUrl(x.sds_url);
      const risk=String(x.risk_level||'caution');
      const manual=x.approval_required||risk==='high_risk'||risk==='stop';
      return `<tr><td><b>${esc(x.brand||'')} ${esc(x.name)}</b><div class="mini">${src?`<a href="${esc(src)}" target="_blank" rel="noopener noreferrer">официальный источник</a>`:'источник не привязан'}</div></td><td><span class="risk ${risk.replace('_','-')}">${esc(risk.toUpperCase())}</span><div class="mini">HMS: ${esc(x.hse_status||'unverified')}${manual?' · только с подтверждением':''}</div>${sds?`<div class="mini"><a href="${esc(sds)}" target="_blank" rel="noopener noreferrer">SDS/HMS</a></div>`:''}</td><td>${esc(x.dilution||'—')}</td><td>${esc(x.application_method||'—')}</td><td>${esc(x.dwell_time||'—')}</td><td>${esc(x.follow_up||'—')}</td><td>${esc(x.warnings||'—')}${x.hse_ppe?`<div class="mini">СИЗ: ${esc(x.hse_ppe)}</div>`:''}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function generate(){
    const b=document.getElementById('generate');if(!b)return;
    b.disabled=true;b.textContent='Формирую…';
    try{
      const {error}=await sb.rpc('generate_order_technology_card',{p_order_id:orderId});
      if(error)throw error;
      if(await load())render();
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'technology.generate');
      alert('Не удалось сформировать карту. Работа по неполной технологии запрещена.');
      b.disabled=false;b.textContent='Сформировать безопасный черновик';
    }
  }
  async function approve(){
    if(!card){alert('Сначала сформируйте черновик.');return;}
    const button=document.getElementById('approve');
    const patch={
      material_guess:document.getElementById('material').value.trim(),
      contamination_score:num(document.getElementById('score').value),
      risk_level:document.getElementById('risk').value,
      owner_note:document.getElementById('ownerNote').value.trim()
    };
    if(!patch.material_guess){alert('Укажите материал после осмотра.');return;}
    button.disabled=true;
    try{
      const {error}=await sb.rpc('approve_order_technology_card',{p_order_id:orderId,p_patch:patch});
      if(error)throw error;
      if(await load())render();
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'technology.approve');
      const msg=String(error?.message||'');
      alert(/HIGH_RISK\/STOP/i.test(msg)?'Понижать HIGH_RISK/STOP после проверки может только OWNER или ADMIN.':'Не удалось подтвердить карту. Изменения не применены.');
      button.disabled=false;
    }
  }
  async function raiseStop(){
    const reason=prompt('Коротко укажите причину STOP:','Сомнение в материале / риск повреждения');if(reason===null)return;
    const button=document.getElementById('raiseStop');button.disabled=true;
    try{
      const {error}=await sb.rpc('raise_order_stop',{p_order_id:orderId,p_reason:reason.trim()||null});
      if(error)throw error;
      if(await load())render();
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'technology.raise_stop');
      alert('Не удалось зафиксировать STOP. Не продолжайте работу до восстановления связи.');
      button.disabled=false;
    }
  }
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=1&&n<=10?n:null;};
  const timeLabel=m=>m?`${Math.floor(m/60)} ч ${m%60?`${m%60} мин`:''}`.trim():'—';
  const conditionLabel=v=>({light:'лёгкое',medium:'среднее',heavy:'сильное',special:'особое'}[v]||v||'—');
  const serviceLabel=v=>({car:'салон автомобиля',sofa:'диван',chair:'кресло',mattress:'матрас',rug:'ковёр'}[v]||v||'—');
  const itemLabel=v=>({seat:'сиденья',ceiling:'потолок',floor_carpet:'пол / ковролин',trunk:'багажник',door_cards:'дверные карты',dashboard_console:'панель + консоль',interior_plastic:'пластик',textile_mats:'текстильные коврики',seat_belt:'ремни безопасности',interior_glass:'стёкла внутри',child_seat:'детское кресло'}[v]||v);
})();
