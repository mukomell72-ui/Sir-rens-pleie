(() => {
const workspaceCss=document.createElement('link');workspaceCss.rel='stylesheet';workspaceCss.href='workspace.css';document.head.appendChild(workspaceCss);
const C=window.SIR_CONFIG;
let sb=null,preview=false,currentRole='PREVIEW',calendarCursor=new Date();
const login=document.getElementById('login'),app=document.getElementById('app'),main=document.getElementById('main');
const connected=!!(C.supabaseUrl&&C.supabasePublishableKey&&window.supabase?.createClient);
if(connected){sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);document.getElementById('setupNotice').classList.add('hidden');}
const canAdmin=()=>['OWNER','ADMIN'].includes(currentRole);
const canManage=()=>['OWNER','ADMIN','MANAGER'].includes(currentRole);
const money=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(+n||0)+' NOK';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const statusLabel={new:'Новый',under_review:'На рассмотрении',offer_sent:'Предложение отправлено',awaiting_confirmation:'Ждёт подтверждения',confirmed:'Подтверждён',scheduled:'Запланирован',in_progress:'В работе',completed:'Выполнен',customer_requested_new_time:'Нужно другое время',cancelled_customer:'Отменён клиентом',cancelled_sir:'Отменён SIR',no_show:'Неявка'};
const serviceLabel={car:'Салон автомобиля',sofa:'Диван',chair:'Кресло',mattress:'Матрас',rug:'Ковёр'};
const allStatuses=Object.keys(statusLabel);

if(document.getElementById('previewBtn'))document.getElementById('previewBtn').addEventListener('click',()=>{preview=true;enter('PREVIEW');});
document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!sb){alert('База SIR не подключена.');return;}
  const email=document.getElementById('email').value,password=document.getElementById('password').value;
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){const status=document.getElementById('loginStatus');if(status){status.textContent='Email или пароль неверны. Проверьте раскладку либо восстановите пароль.';status.classList.remove('hidden');}else alert('Email или пароль неверны.');return;}
  const {data:profile,error:pe}=await sb.from('profiles').select('role,display_name,active').eq('id',data.user.id).single();
  if(pe||!profile?.active){await sb.auth.signOut();alert('Доступ к SIR Admin не активирован.');return;}
  currentRole=(profile.role||'worker').toUpperCase();enter(currentRole);
});
document.getElementById('logout').addEventListener('click',async()=>{if(sb&&!preview)await sb.auth.signOut();location.reload();});
document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;document.querySelectorAll('#nav [data-view]').forEach(x=>x.classList.toggle('active',x===b));render(b.dataset.view);});

async function enter(role){login.classList.add('hidden');app.classList.remove('hidden');document.getElementById('roleBadge').textContent=role;render('dashboard');}
async function render(view){main.innerHTML='<div class="empty">Загрузка…</div>';if(view==='dashboard')return dashboard();if(view==='orders')return orders();if(view==='calendar')return calendar();if(view==='customers')return customers();if(view==='guide')return guide();if(view==='finance')return finance();if(view==='team')return team();if(view==='audit')return audit();if(view==='settings')return settings();}
async function getOrders(limit=200){if(preview||!sb)return[];const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(limit);if(error){console.error(error);return[];}return data||[];}

async function dashboard(){
  const o=await getOrders(),today=new Date().toLocaleDateString('sv-SE');
  const count=s=>o.filter(x=>x.status===s).length;
  const revenue=o.filter(x=>x.status==='completed'&&localDate(x.completed_at)===today).reduce((a,x)=>a+(+x.final_price||0),0);
  const todayOrders=o.filter(x=>x.status==='in_progress'||x.status==='scheduled');
  const attention=o.filter(x=>['high_risk','stop'].includes(x.risk_level)||['new','customer_requested_new_time'].includes(x.status)).slice(0,10);
  main.innerHTML=`<div class="section-title"><div><h1>Сегодня</h1><p>Только то, что требует решения или действия</p></div><button class="btn primary" id="openOrders">Все заказы</button></div>${preview?'<div class="notice">Безопасный предпросмотр — реальная база не изменяется.</div>':''}<div class="grid"><button class="card metric metric-action" data-status="new"><span>Разобрать заявки</span><strong>${count('new')}</strong><small>Проверить фото, риск и цену</small></button><button class="card metric metric-action" data-status="awaiting_confirmation"><span>Ждут клиента</span><strong>${count('awaiting_confirmation')}</strong><small>Цена или время отправлены</small></button><button class="card metric metric-action" data-status="in_progress"><span>Сейчас в работе</span><strong>${count('in_progress')}</strong><small>Открыть технологическую карту</small></button><div class="card metric"><span>Выручка сегодня</span><strong>${money(revenue)}</strong><small>Только выполненные заказы</small></div></div><div class="panel"><div class="panel-head"><span>Сегодняшние работы</span><span class="mini">${todayOrders.length}</span></div>${todayOrders.length?orderTable(todayOrders):'<div class="empty">На сегодня работ нет.</div>'}</div><div class="panel"><div class="panel-head"><span>Нужно решить</span><span class="mini">новые · изменение времени · высокий риск · STOP</span></div>${attention.length?orderTable(attention):'<div class="empty">Срочных решений нет.</div>'}</div>`;
  main.querySelector('#openOrders')?.addEventListener('click',orders);
  main.querySelectorAll('[data-status]').forEach(b=>b.addEventListener('click',orders));
  bindOrderRows();
}
function orderTable(rows){return `<div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Клиент</th><th>Услуга</th><th>Статус</th><th>Цена</th><th>Риск</th></tr></thead><tbody>${rows.map(x=>`<tr class="order-row" data-id="${x.id}" tabindex="0"><td><b>${esc(x.order_no||'—')}</b><div class="mini">${new Date(x.created_at).toLocaleDateString('ru')}</div></td><td>${esc(x.customer_name||'—')}<div class="mini">${esc(x.phone||'')}</div></td><td>${esc(serviceLabel[x.service_type]||x.service_type||'—')}</td><td>${statusLabel[x.status]||esc(x.status||'—')}</td><td>${x.final_price!=null?money(x.final_price):x.preliminary_price!=null?`${money(x.preliminary_price)} ориентир`:'—'}</td><td><span class="risk ${(x.risk_level||'low').replace('_','-')}">${esc((x.risk_level||'LOW').toUpperCase())}</span></td></tr>`).join('')}</tbody></table></div>`;}
function bindOrderRows(){main.querySelectorAll('.order-row').forEach(r=>{const open=()=>orderDetail(r.dataset.id);r.addEventListener('click',open);r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});}

async function orders(){
  const o=await getOrders();
  main.innerHTML=`<div class="section-title"><div><h1>Заказы</h1><p>Один список: найти, открыть, принять решение</p></div>${canManage()?'<button class="btn primary" id="manualOrder">+ Ручной заказ</button>':''}</div><div class="order-filters"><input id="orderSearch" placeholder="Номер, имя, телефон, автомобиль"><select id="orderStatus"><option value="">Все активные статусы</option>${allStatuses.map(s=>`<option value="${s}">${statusLabel[s]}</option>`).join('')}</select></div><div id="ordersResult">${o.length?`<div class="panel">${orderTable(o)}</div>`:'<div class="card empty">Заказов пока нет.</div>'}</div>`;
  bindOrderRows();
  const paint=()=>{const q=main.querySelector('#orderSearch').value.toLowerCase().trim(),status=main.querySelector('#orderStatus').value;const rows=o.filter(x=>(!status||x.status===status)&&(!q||[x.order_no,x.customer_name,x.phone,x.vehicle_plate,x.vehicle_brand,x.vehicle_model].join(' ').toLowerCase().includes(q)));main.querySelector('#ordersResult').innerHTML=rows.length?`<div class="panel">${orderTable(rows)}</div>`:'<div class="card empty">Ничего не найдено.</div>';bindOrderRows();};
  main.querySelector('#orderSearch').addEventListener('input',paint);main.querySelector('#orderStatus').addEventListener('change',paint);
  main.querySelector('#manualOrder')?.addEventListener('click',manualOrderForm);
}
async function manualOrderForm(){
  main.innerHTML=`<div class="section-title"><div><h1>Ручной заказ</h1><p>Для звонка или сообщения клиента</p></div><button class="btn" id="backOrders">← Заказы</button></div><form class="card" id="manualForm"><div class="settings-grid"><div class="field"><label>Имя</label><input name="name" required></div><div class="field"><label>Телефон</label><input name="phone" required></div><div class="field"><label>Услуга</label><select name="service"><option value="car">Салон автомобиля</option><option value="sofa">Диван</option><option value="chair">Кресло</option><option value="mattress">Матрас</option></select></div><div class="field"><label>Предварительная цена</label><input name="price" type="number" min="0"></div></div><div class="field"><label>Комментарий</label><textarea name="comment"></textarea></div><button class="btn primary">Создать</button></form>`;
  main.querySelector('#backOrders').addEventListener('click',orders);
  main.querySelector('#manualForm').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.target),name=String(f.get('name')).trim(),phone=String(f.get('phone')).trim();
    const referral='SIR-'+crypto.randomUUID().slice(0,8).toUpperCase();
    const {data:c,error:ce}=await sb.from('customers').upsert({name,phone,referral_code:referral},{onConflict:'phone'}).select('id').single();
    if(ce){alert(ce.message);return;}
    const {data:o,error}=await sb.from('orders').insert({customer_id:c.id,customer_name:name,phone,service_type:String(f.get('service')),preliminary_price:numOrNull(f.get('price')),customer_comment:String(f.get('comment')||''),status:'under_review',source:'manual'}).select('id').single();
    if(error){alert(error.message);return;}orderDetail(o.id);
  });
}

async function orderDetail(id){
  if(preview||!sb){alert('Детали доступны после входа.');return;}
  const [{data:o,error},{data:appt},{data:staff=[]},{data:photos=[]},{data:tech}]=await Promise.all([
    sb.from('orders').select('*').eq('id',id).single(),
    sb.from('appointments').select('*').eq('order_id',id).order('starts_at',{ascending:false}).limit(1).maybeSingle(),
    sb.from('profiles').select('id,display_name,role,active').eq('active',true).order('display_name'),
    sb.from('order_photos').select('*').eq('order_id',id).order('created_at'),
    sb.from('order_technology_cards').select('*').eq('order_id',id).maybeSingle()
  ]);
  if(error||!o){alert(error?.message||'Заказ не найден');return;}
  const signed=[];for(const p of photos){const {data}=await sb.storage.from('order-photos').createSignedUrl(p.storage_path,3600);if(data?.signedUrl)signed.push({url:data.signedUrl,id:p.id});}
  const localStart=appt?.starts_at?toLocalParts(appt.starts_at):{date:'',time:''};
  const nextAction=o.risk_level==='stop'?'Работу не начинать: открыть карту и зафиксировать причину STOP':!tech?'Сформировать технологическую карту до подтверждения работы':!tech.reviewed_at?'Проверить материал и подтвердить карту человеком':o.final_price==null?'После осмотра согласовать окончательную цену':'Заказ готов к планированию или выполнению';
  main.innerHTML=`<div class="section-title"><div><h1>${esc(o.order_no)}</h1><p>${esc(serviceLabel[o.service_type]||o.service_type)} · ${statusLabel[o.status]||esc(o.status)}</p></div><button class="btn" id="backOrders">← Заказы</button></div><div class="decision-bar"><div><span>Следующее действие</span><b>${esc(nextAction)}</b></div><a class="btn primary" href="technology.html?order=${encodeURIComponent(id)}">Открыть рабочую карту</a></div><div class="detail-grid"><section class="card"><h3>Что нужно выполнить</h3><div class="kv"><span>Клиент</span><b>${esc(o.customer_name)} · ${esc(o.phone)}</b></div><div class="kv"><span>Адрес</span><b>${esc(o.address||'—')}</b></div><div class="kv"><span>Автомобиль</span><b>${esc([o.vehicle_plate,o.vehicle_brand,o.vehicle_model,o.vehicle_year].filter(Boolean).join(' ')||'—')}</b></div><div class="kv"><span>Загрязнение</span><b>${esc(o.contamination||'—')}</b></div><div class="kv"><span>Пятна / шерсть / запах</span><b>${o.stains?'пятна ':''}${o.pet_hair?'шерсть ':''}${o.odor?'запах':''||'—'}</b></div><div class="kv"><span>Расчётное время</span><b>${o.estimated_minutes?`${Math.floor(o.estimated_minutes/60)} ч ${o.estimated_minutes%60||''}`:'—'}</b></div><div class="field"><label>Комментарий клиента</label><textarea readonly>${esc(o.customer_comment||'')}</textarea></div><div class="toolbar"><a class="btn" href="tel:${esc(o.phone)}">Позвонить</a><a class="btn" href="sms:${esc(o.phone)}">SMS</a></div></section><section class="card"><h3>Решение по заказу</h3><form id="orderForm"><div class="field"><label>Статус</label><select name="status" ${canManage()?'':'disabled'}>${allStatuses.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel[s]}</option>`).join('')}</select></div><div class="field"><label>Риск</label><select name="risk" ${canManage()?'':'disabled'}>${['low','caution','high_risk','stop'].map(r=>`<option value="${r}" ${o.risk_level===r?'selected':''}>${r.toUpperCase()}</option>`).join('')}</select></div><div class="field"><label>Окончательная согласованная цена</label><input name="final_price" type="number" min="0" value="${o.final_price??''}" ${canManage()?'':'disabled'}><div class="mini">Цена сайта — только ориентир. Внести после осмотра и согласия клиента.</div></div><div class="field"><label>Исполнитель</label><select name="assigned_to" ${canManage()?'':'disabled'}><option value="">Не назначен</option>${staff.map(p=>`<option value="${p.id}" ${o.assigned_to===p.id?'selected':''}>${esc(p.display_name||p.role)}</option>`).join('')}</select></div><div class="field"><label>Внутренняя заметка</label><textarea name="note">${esc(o.internal_note||'')}</textarea></div>${canManage()?`<h4>Дата и время</h4><div class="settings-grid"><div class="field"><label>Дата</label><input name="date" type="date" value="${localStart.date}"></div><div class="field"><label>Время</label><input name="time" type="time" value="${localStart.time}"></div><div class="field"><label>Длительность, мин.</label><input name="duration" type="number" min="30" step="15" value="${appt?Math.max(30,Math.round((new Date(appt.ends_at)-new Date(appt.starts_at))/60000)):o.estimated_minutes||240}"></div><div class="field"><label>Бронь</label><select name="tentative"><option value="true" ${appt?.tentative!==false?'selected':''}>Ожидает подтверждения</option><option value="false" ${appt?.tentative===false?'selected':''}>Подтверждена</option></select></div></div>`:''}<button class="btn primary" type="submit">Сохранить решение</button></form></section></div>${signed.length?`<section class="panel"><div class="panel-head">Фото клиента</div><div class="photo-grid">${signed.map(p=>`<a href="${p.url}" target="_blank" rel="noopener noreferrer"><img src="${p.url}" alt="Фото заказа"></a>`).join('')}</div></section>`:'<div class="notice">Фото нет. Сложный материал или сильное загрязнение нельзя окончательно оценивать дистанционно.</div>'}<section class="panel"><div class="panel-head"><span>Готовность технологии</span><a class="btn" href="technology.html?order=${encodeURIComponent(id)}">Открыть карту</a></div><div class="cardless">${tech?`Риск: <b>${esc(tech.risk_level)}</b> · материал: ${esc(tech.material_guess||'не указан')} · ${tech.reviewed_at?'подтверждено человеком':'требуется подтверждение'}`:'Черновик ещё не сформирован. Карта подберёт проходы, сушку между проходами, инструмент, проверенную химию и условия STOP по конкретным зонам заказа.'}</div></section>`;
  main.querySelector('#backOrders').addEventListener('click',orders);
  main.querySelector('#orderForm').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.target),patch={internal_note:String(f.get('note')||'')};
    if(canManage()){patch.status=String(f.get('status'));patch.risk_level=String(f.get('risk'));patch.final_price=numOrNull(f.get('final_price'));patch.assigned_to=f.get('assigned_to')||null;if(patch.status==='completed'&&!o.completed_at)patch.completed_at=new Date().toISOString();}
    const {error:ue}=await sb.from('orders').update(patch).eq('id',id);if(ue){alert(ue.message);return;}
    if(canManage()){
      const date=String(f.get('date')||''),time=String(f.get('time')||'');
      if(date&&time){const start=new Date(`${date}T${time}:00`),duration=Math.max(30,+f.get('duration')||240),row={order_id:id,starts_at:start.toISOString(),ends_at:new Date(start.getTime()+duration*60000).toISOString(),tentative:String(f.get('tentative'))==='true',address:o.address||null};if(appt?.id)await sb.from('appointments').update(row).eq('id',appt.id);else await sb.from('appointments').insert(row);}
    }
    alert('Сохранено');orderDetail(id);
  });
}

async function calendar(){
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Календарь</h1><p>Предпросмотр</p></div></div><div class="card empty">После входа здесь будут реальные бронирования.</div>';return;}
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),start=new Date(y,m,1),end=new Date(y,m+1,1);
  const {data:a=[]}=await sb.from('appointments').select('*,orders(order_no,customer_name,service_type,status)').gte('starts_at',start.toISOString()).lt('starts_at',end.toISOString()).order('starts_at');
  const by={};for(const x of a){const k=localDate(x.starts_at);(by[k]??=[]).push(x);}
  const days=new Date(y,m+1,0).getDate(),names=['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'];let cells='';
  for(let d=1;d<=days;d++){const dt=new Date(y,m,d),key=localDate(dt);const rows=by[key]||[];cells+=`<div class="day"><b>${d} ${names[dt.getDay()]}</b>${rows.length?rows.map(x=>`<button class="slot slot-btn ${x.tentative?'tentative':'confirmed'}" data-order="${x.order_id}">${new Date(x.starts_at).toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit'})} · ${esc(x.orders?.order_no||'заказ')}</button>`).join(''):'<div class="mini">свободно</div>'}</div>`;}
  main.innerHTML=`<div class="section-title"><div><h1>Календарь</h1><p>${calendarCursor.toLocaleString('ru',{month:'long',year:'numeric'})}</p></div><div class="toolbar"><button class="btn" id="prevMonth">←</button><button class="btn" id="todayMonth">Сегодня</button><button class="btn" id="nextMonth">→</button></div></div><div class="calendar">${cells}</div>`;
  main.querySelector('#prevMonth').addEventListener('click',()=>{calendarCursor=new Date(y,m-1,1);calendar();});main.querySelector('#nextMonth').addEventListener('click',()=>{calendarCursor=new Date(y,m+1,1);calendar();});main.querySelector('#todayMonth').addEventListener('click',()=>{calendarCursor=new Date();calendar();});main.querySelectorAll('[data-order]').forEach(b=>b.addEventListener('click',()=>orderDetail(b.dataset.order)));
}

async function customers(){
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Клиенты</h1><p>История и рекомендации</p></div></div><div class="card empty">Доступно после входа.</div>';return;}
  const {data=[]}=await sb.from('customers').select('*').order('created_at',{ascending:false}).limit(200);
  main.innerHTML=`<div class="section-title"><div><h1>Клиенты</h1><p>${data.length} записей</p></div></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Имя</th><th>Телефон</th><th>Реф. код</th><th>Бонус</th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.name)}</td><td><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></td><td>${esc(x.referral_code||'—')}</td><td>${money(x.credit_balance)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function guide(){main.innerHTML=`<div class="section-title"><div><h1>Арсенал и справочник</h1><p>Вся рабочая химия, оборудование и расходники в одном месте</p></div><div class="toolbar"><a class="btn" target="_blank" rel="noopener noreferrer" href="../guide-app/">Открыть на весь экран</a><a class="btn primary" href="guide-editor.html">Редактировать знания</a></div></div><div class="guide-rules"><div><b>В заказе</b><span>Конкретные подсказки открываются через «Рабочую карту» самого заказа.</span></div><div><b>В справочнике</b><span>Хранятся назначение, разведение, применение, риски, цена и ссылка на поставщика.</span></div><div><b>Главное правило</b><span>Неизвестный материал или несовместимость → spot-test либо STOP.</span></div></div><iframe class="guide-frame" src="../guide-app/" title="Полный рабочий арсенал SIR"></iframe>`;}
async function finance(){const o=await getOrders(),done=o.filter(x=>x.status==='completed'),revenue=done.reduce((a,x)=>a+(+x.final_price||0),0),cost=done.reduce((a,x)=>a+(+x.chemical_cost||0)+(+x.consumables_cost||0),0);main.innerHTML=`<div class="section-title"><div><h1>Финансы</h1><p>Фактические результаты</p></div></div><div class="grid"><div class="card metric"><span>Выполнено</span><strong>${done.length}</strong></div><div class="card metric"><span>Выручка</span><strong>${money(revenue)}</strong></div><div class="card metric"><span>Средний чек</span><strong>${money(done.length?revenue/done.length:0)}</strong></div><div class="card metric"><span>Химия + расходники</span><strong>${money(cost)}</strong></div></div>`;}

async function team(){
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Команда</h1><p>OWNER · ADMIN · MANAGER · WORKER</p></div></div><div class="card empty">Доступно после входа.</div>';return;}
  const {data=[]}=await sb.from('profiles').select('*').order('created_at');
  main.innerHTML=`<div class="section-title"><div><h1>Команда</h1><p>Раздельные аккаунты и роли</p></div></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Имя</th><th>Роль</th><th>Активен</th><th></th></tr></thead><tbody>${data.map(p=>`<tr data-profile="${p.id}"><td>${esc(p.display_name||p.id)}</td><td><select class="role" ${canAdmin()?'':'disabled'}>${['owner','admin','manager','worker'].map(r=>`<option value="${r}" ${p.role===r?'selected':''}>${r.toUpperCase()}</option>`).join('')}</select></td><td><input class="active" type="checkbox" ${p.active?'checked':''} ${canAdmin()?'':'disabled'}></td><td>${canAdmin()?'<button class="btn save-profile">Сохранить</button>':''}</td></tr>`).join('')}</tbody></table></div></div><div class="notice">Пароли сотрудников никогда не показываются владельцу. Новый сотрудник создаёт собственный пароль через Supabase Auth.</div>`;
  main.querySelectorAll('.save-profile').forEach(b=>b.addEventListener('click',async()=>{const tr=b.closest('[data-profile]'),id=tr.dataset.profile,role=tr.querySelector('.role').value,active=tr.querySelector('.active').checked;const {error}=await sb.from('profiles').update({role,active}).eq('id',id);if(error)alert(error.message);else alert('Сохранено');}));
}
async function audit(){
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Журнал</h1><p>Кто и что изменил</p></div></div><div class="card empty">Доступно после входа.</div>';return;}
  const {data=[]}=await sb.from('audit_events').select('*').order('created_at',{ascending:false}).limit(300);
  main.innerHTML=`<div class="section-title"><div><h1>Журнал</h1><p>Критические изменения</p></div></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Время</th><th>Событие</th><th>Объект</th><th>Пользователь</th></tr></thead><tbody>${data.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ru')}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)} ${esc(x.entity_id||'')}</td><td>${esc(x.actor_email||x.actor_id||'—')}</td></tr>`).join('')}</tbody></table></div></div>`;
}

async function settings(){
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Настройки</h1><p>Предпросмотр</p></div></div><div class="card empty">Реальные настройки сохраняются только в базе.</div>';return;}
  const [{data:prices=[]},{data:settingsRows=[]}]=await Promise.all([sb.from('price_rules').select('*').order('service_code').order('size_key'),sb.from('app_settings').select('*').order('key')]);
  const map=Object.fromEntries(settingsRows.map(x=>[x.key,x.value||{}])),company=map.company||{},travel=map.travel||{},ref=map.referral||{},work=map.work_rules||{};
  main.innerHTML=`<div class="section-title"><div><h1>Настройки</h1><p>Изменения применяются к сайту без редактирования кода</p></div></div>${canAdmin()?'':'<div class="notice">Изменять настройки могут OWNER и ADMIN.</div>'}<form id="settingsForm"><div class="settings-grid"><div class="card"><h3>Компания</h3>${input('phone_primary','Основной телефон',company.phone_primary||C.phonePrimary)}${input('phone_secondary','Второй телефон',company.phone_secondary||C.phoneSecondary)}${input('radius_km','Радиус, км',company.radius_km||40,'number')}</div><div class="card"><h3>Выезд</h3>${input('travel_0_10','0–10 км',travel['0_10']??0,'number')}${input('travel_11_20','11–20 км',travel['11_20']??150,'number')}${input('travel_21_30','21–30 км',travel['21_30']??250,'number')}${input('travel_31_40','31–40 км',travel['31_40']??350,'number')}${input('minimum_mobile_order','Минимальный выездной заказ',travel.minimum_mobile_order??750,'number')}</div><div class="card"><h3>Рекомендации</h3>${input('referrer_credit','Бонус рекомендателю',ref.referrer_credit??200,'number')}${input('new_customer_discount','Скидка новому клиенту',ref.new_customer_discount??100,'number')}${input('ref_minimum_order','Минимальный заказ',ref.minimum_order??750,'number')}</div><div class="card"><h3>Рабочее время</h3>${input('working_day_start','Начало',work.working_day_start||'08:00','time')}${input('working_day_end','Конец',work.working_day_end||'20:00','time')}${input('default_buffer_minutes','Буфер между работами, мин.',work.default_buffer_minutes??30,'number')}</div></div><div class="panel"><div class="panel-head">Стартовые цены</div><div class="table-wrap"><table class="table"><thead><tr><th>Услуга</th><th>Размер</th><th>Лёгкое</th><th>Среднее</th><th>Сильное</th></tr></thead><tbody>${prices.map(p=>`<tr data-price="${p.id}"><td>${esc(p.service_code)}</td><td>${esc(p.size_key)}</td><td><input class="p-light" type="number" min="0" value="${p.light_price??''}"></td><td><input class="p-medium" type="number" min="0" value="${p.medium_price??''}"></td><td><input class="p-heavy" type="number" min="0" value="${p.heavy_price??''}"></td></tr>`).join('')}</tbody></table></div></div>${canAdmin()?'<button class="btn primary save-settings" type="submit">Сохранить все настройки</button>':''}</form>`;
  if(!canAdmin())return;
  main.querySelector('#settingsForm').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.target),updates=[
      ['company',{...company,phone_primary:String(f.get('phone_primary')),phone_secondary:String(f.get('phone_secondary')),radius_km:+f.get('radius_km')}],
      ['travel',{'0_10':+f.get('travel_0_10'),'11_20':+f.get('travel_11_20'),'21_30':+f.get('travel_21_30'),'31_40':+f.get('travel_31_40'),minimum_mobile_order:+f.get('minimum_mobile_order')}],
      ['referral',{referrer_credit:+f.get('referrer_credit'),new_customer_discount:+f.get('new_customer_discount'),minimum_order:+f.get('ref_minimum_order')}],
      ['work_rules',{working_day_start:String(f.get('working_day_start')),working_day_end:String(f.get('working_day_end')),default_buffer_minutes:+f.get('default_buffer_minutes')}]
    ];
    for(const [key,value] of updates){const {error}=await sb.from('app_settings').update({value}).eq('key',key);if(error){alert(error.message);return;}}
    for(const tr of main.querySelectorAll('[data-price]')){const {error}=await sb.from('price_rules').update({light_price:numOrNull(tr.querySelector('.p-light').value),medium_price:numOrNull(tr.querySelector('.p-medium').value),heavy_price:numOrNull(tr.querySelector('.p-heavy').value)}).eq('id',tr.dataset.price);if(error){alert(error.message);return;}}
    alert('Настройки сохранены. Клиентский калькулятор получит новые цены автоматически.');settings();
  });
}
function input(name,label,value,type='text'){return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}"></div>`;}
function numOrNull(v){const s=String(v??'').trim();return s===''?null:+s;}
function localDate(v){if(!v)return'';const d=v instanceof Date?v:new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function toLocalParts(v){const d=new Date(v);return{date:localDate(d),time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};}

if(sb){sb.auth.getSession().then(async({data})=>{if(data.session){const {data:p}=await sb.from('profiles').select('role,active').eq('id',data.session.user.id).single();if(p?.active){currentRole=(p.role||'worker').toUpperCase();enter(currentRole);}}});}
})();
