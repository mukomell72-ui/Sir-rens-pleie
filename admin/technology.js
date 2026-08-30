(() => {
  const C=window.SIR_CONFIG;
  const root=document.getElementById('techApp');
  const orderId=new URLSearchParams(location.search).get('order');
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const managerRoles=['owner','admin','manager'];
  let session,profile,order,card,items=[],photos=[],chemicals=[];

  init();
  async function init(){
    const {data:{session:s}}=await sb.auth.getSession();session=s;
    if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>, затем откройте технологическую карту из заказа.</div>';return;}
    const {data:p}=await sb.from('profiles').select('role,display_name,active').eq('id',session.user.id).single();profile=p;
    if(!profile?.active){root.innerHTML='<div class="notice">Доступ отключён.</div>';return;}
    if(!orderId){root.innerHTML='<div class="notice safe">Откройте конкретный заказ в SIR Admin и нажмите «Открыть SIR Технолог». Технологическая карта всегда должна быть связана с реальным заказом и его фотографиями.</div>';return;}
    await load();render();
  }

  async function load(){
    const [{data:o,error},{data:i=[]},{data:p=[]},{data:t},{data:c=[]}]=await Promise.all([
      sb.from('orders').select('*').eq('id',orderId).single(),
      sb.from('order_items').select('*').eq('order_id',orderId).order('created_at'),
      sb.from('order_photos').select('*').eq('order_id',orderId).order('created_at'),
      sb.from('order_technology_cards').select('*').eq('order_id',orderId).maybeSingle(),
      sb.from('chemicals').select('*').eq('active',true).eq('verification_status','manufacturer_verified').order('brand').order('name')
    ]);
    if(error||!o){root.innerHTML='<div class="notice">Заказ не найден или нет доступа.</div>';throw error||new Error('not found');}
    order=o;items=i;card=t;chemicals=c;
    photos=[];
    for(const p of p){const {data}=await sb.storage.from('order-photos').createSignedUrl(p.storage_path,1800);if(data?.signedUrl)photos.push({url:data.signedUrl});}
  }

  function render(){
    const canManage=managerRoles.includes(profile.role);
    const risk=(card?.risk_level||order.risk_level||'caution').toUpperCase();
    const steps=Array.isArray(card?.instructions)?card.instructions:[];
    const stops=Array.isArray(card?.stop_conditions)?card.stop_conditions:[];
    const orderItems=items.length?items.map(x=>`${esc(x.item_code)} × ${x.quantity}`).join(', '):(order.package_code==='full'?'Полный салон':esc(order.package_code||'—'));
    root.innerHTML=`
      <div class="section-title"><div><h1>${esc(order.order_no)} · SIR Технолог</h1><p>${esc(order.customer_name)} · ${esc(order.service_type)} · загрязнение: ${esc(order.contamination||'—')}</p></div><a class="btn" href="./">← Admin</a></div>
      <div class="notice safe"><b>Принцип:</b> карта является инструкцией по безопасной последовательности, а не разрешением усиливать воздействие. Реальный материал и повреждения проверяются на месте.</div>
      <div class="settings-grid">
        <section class="card"><h3>Заказ</h3><div class="kv"><span>Работы</span><b>${orderItems}</b></div><div class="kv"><span>Пятна</span><b>${order.stains?'да':'нет'}</b></div><div class="kv"><span>Шерсть</span><b>${order.pet_hair?'да':'нет'}</b></div><div class="kv"><span>Запах</span><b>${order.odor?'да':'нет'}</b></div><div class="kv"><span>Текущий риск</span><b class="risk ${risk==='STOP'?'stop':risk==='CAUTION'?'caution':'low'}">${risk}</b></div>${canManage?'<button class="btn primary" id="generate">Сформировать безопасный черновик</button>':''}<button class="btn" id="raiseStop" style="margin-left:8px">STOP — остановить работу</button></section>
        <section class="card"><h3>Подтверждение материала</h3><div class="field"><label>Материал после осмотра</label><input id="material" value="${esc(card?.material_guess||'Требуется проверка материала на месте')}" ${canManage?'':'disabled'}></div><div class="field"><label>Оценка загрязнения 1–10</label><input id="score" type="number" min="1" max="10" value="${card?.contamination_score??''}" ${canManage?'':'disabled'}></div><div class="field"><label>Риск</label><select id="risk" ${canManage?'':'disabled'}>${['low','caution','high_risk','stop'].map(x=>`<option value="${x}" ${(card?.risk_level||order.risk_level)===x?'selected':''}>${x.toUpperCase()}</option>`).join('')}</select></div><div class="field"><label>Заметка владельца/менеджера</label><textarea id="ownerNote" ${canManage?'':'disabled'}>${esc(card?.owner_note||'')}</textarea></div>${canManage?'<button class="btn primary" id="approve">Подтвердить карту</button>':''}<p class="mini">${card?.reviewed_at?`Подтверждено: ${new Date(card.reviewed_at).toLocaleString('ru')}`:'Пока не подтверждено человеком.'}</p></section>
      </div>
      ${photos.length?`<section class="panel"><div class="panel-head">Фото клиента</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:14px">${photos.map(x=>`<a href="${x.url}" target="_blank"><img src="${x.url}" alt="Фото заказа" style="width:100%;height:160px;object-fit:cover;border-radius:12px"></a>`).join('')}</div></section>`:'<div class="notice">Фото клиента не загружены. Для спорного материала итоговую технологию не подтверждать без осмотра.</div>'}
      <section class="panel"><div class="panel-head"><span>Последовательность работ</span><span>${risk}</span></div><div style="padding:16px">${steps.length?`<ol>${steps.map(x=>`<li style="margin:10px 0">${esc(x)}</li>`).join('')}</ol>`:'<p>Черновик ещё не сформирован.</p>'}</div></section>
      <section class="panel"><div class="panel-head">Обязательные условия STOP</div><div style="padding:16px">${stops.length?`<ul>${stops.map(x=>`<li style="margin:10px 0">${esc(x)}</li>`).join('')}</ul>`:'<p>После формирования карты здесь появятся условия остановки.</p>'}</div></section>
      <section class="panel"><div class="panel-head"><span>Проверенная химия SIR</span><span class="mini">только manufacturer_verified</span></div><div class="notice" style="margin:14px"><b>Важно:</b> список ниже не означает автоматическое назначение средства. Сначала совпадение материала и области применения, затем инструкция производителя и spot-test.</div>${chemTable()}</section>`;

    document.getElementById('generate')?.addEventListener('click',generate);
    document.getElementById('approve')?.addEventListener('click',approve);
    document.getElementById('raiseStop')?.addEventListener('click',raiseStop);
  }

  function chemTable(){
    if(!chemicals.length)return'<div class="empty">Подтверждённых записей пока нет.</div>';
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Средство</th><th>Разведение</th><th>Применение</th><th>Предупреждение</th></tr></thead><tbody>${chemicals.map(x=>`<tr><td><b>${esc(x.brand||'')} ${esc(x.name)}</b><div class="mini"><a href="${esc(x.source_note||'#')}" target="_blank" rel="noopener">Источник производителя</a></div></td><td>${esc(x.dilution||'—')}</td><td>${esc((x.intended_surfaces||[]).join(', '))}</td><td>${esc(x.warnings||'—')}</td></tr>`).join('')}</tbody></table></div>`;
  }

  async function generate(){
    const b=document.getElementById('generate');b.disabled=true;b.textContent='Формирую…';
    const {error}=await sb.rpc('generate_order_technology_card',{p_order_id:orderId});
    if(error){alert(error.message);b.disabled=false;b.textContent='Сформировать безопасный черновик';return;}
    await load();render();
  }
  async function approve(){
    if(!card){alert('Сначала сформируйте черновик.');return;}
    const patch={material_guess:document.getElementById('material').value.trim(),contamination_score:num(document.getElementById('score').value),risk_level:document.getElementById('risk').value,owner_note:document.getElementById('ownerNote').value.trim(),reviewed_by:session.user.id,reviewed_at:new Date().toISOString()};
    const {error}=await sb.from('order_technology_cards').update(patch).eq('order_id',orderId);if(error){alert(error.message);return;}
    const {error:oe}=await sb.from('orders').update({risk_level:patch.risk_level}).eq('id',orderId);if(oe){alert(oe.message);return;}
    await load();render();
  }
  async function raiseStop(){
    const reason=prompt('Коротко укажите причину STOP:','Сомнение в материале / риск повреждения');if(reason===null)return;
    const note=`${order.internal_note||''}\n[STOP ${new Date().toLocaleString('ru')}] ${reason}`.trim();
    const {error}=await sb.from('orders').update({risk_level:'stop',internal_note:note}).eq('id',orderId);if(error){alert(error.message);return;}
    await load();render();
  }
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=1&&n<=10?n:null;};
})();
