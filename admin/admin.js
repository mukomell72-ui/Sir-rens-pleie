(() => {
const workspaceCss=document.createElement('link');workspaceCss.rel='stylesheet';workspaceCss.href='workspace.css?v=20260924-translate1';document.head.appendChild(workspaceCss);
const inspectionScript=document.createElement('script');inspectionScript.src='inspection.js?v=20260902-inspection-flow';inspectionScript.defer=true;document.head.appendChild(inspectionScript);
const C=window.SIR_CONFIG;
let sb=null,preview=false,currentRole='PREVIEW',activeView='dashboard',orderRealtime=null,realtimeRefreshTimer=null,realtimeRetryTimer=null,realtimeFallbackTimer=null,realtimeBackoffMs=2000,orderEditorDirty=false;
const login=document.getElementById('login'),app=document.getElementById('app'),main=document.getElementById('main');
const markOrderEditorDirty=e=>{if(main.dataset.orderId&&e.target.closest?.('#orderForm,#inspectionForm'))orderEditorDirty=true;};
main.addEventListener('input',markOrderEditorDirty);
main.addEventListener('change',markOrderEditorDirty);
const connected=!!window.SIR_ADMIN_SB;
if(connected){sb=window.SIR_ADMIN_SB;document.getElementById('setupNotice').classList.add('hidden');}
const canAdmin=()=>['OWNER','ADMIN'].includes(currentRole);
const canManage=()=>['OWNER','ADMIN','MANAGER'].includes(currentRole);
function ensureWritable(){
  if(preview)return true;
  if(navigator.onLine)return true;
  window.SIR_ADMIN_RUNTIME?.refresh();
  alert('Нет сети. Изменения не отправлены. После восстановления подключения повторите действие.');
  return false;
}
const money=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(+n||0)+' NOK';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const statusLabel={new:'Новый',under_review:'На рассмотрении',offer_sent:'Предложение отправлено',awaiting_confirmation:'Ждёт подтверждения',confirmed:'Подтверждён',scheduled:'Запланирован',in_progress:'В работе',completed:'Выполнен',customer_requested_new_time:'Нужно другое время',cancelled_customer:'Отменён клиентом',cancelled_sir:'Отменён SIR',no_show:'Неявка'};
const serviceLabel={car:'Салон автомобиля',sofa:'Диван',chair:'Кресло',mattress:'Матрас',rug:'Ковёр'};
const allStatuses=Object.keys(statusLabel);
const previewOrders=[
  {id:'demo-car',order_no:'DEMO-1001',created_at:'2026-09-02T08:30:00Z',customer_name:'Анна Л.',phone:'+47 ••• •• 101',service_type:'car',status:'new',payment_status:'unpaid',preliminary_price:2400,risk_level:'caution',vehicle_plate:'DR 12345',vehicle_brand:'Volkswagen',vehicle_model:'Passat',vehicle_year:2018,registered_seats:5,address:'Storgata 12, 3611 Kongsberg',distance_km:3.8,material:'Ткань + экокожа',cleaning_scope:'Отдельные элементы салона',selected_areas:'5 сидений, ремни безопасности, пол / ковролин, багажник',contamination:'Сильная',stains:true,pet_hair:true,odor:false,customer_comment:'Пятно от кофе на переднем сиденье, шерсть собаки сзади. Просьба аккуратно обработать боковины из экокожи.',estimated_minutes:270,chemical_cost:180,consumables_cost:70,internal_note:'Перед началом сделать фото пятна и тест на незаметном участке.'},
  {id:'demo-sofa',order_no:'DEMO-1002',created_at:'2026-09-03T10:15:00Z',customer_name:'Мартин Х.',phone:'+47 ••• •• 202',service_type:'sofa',status:'confirmed',payment_status:'unpaid',final_price:1800,risk_level:'low',contamination:'Средняя',chemical_cost:120,consumables_cost:45},
  {id:'demo-mattress',order_no:'DEMO-1003',created_at:'2026-09-01T12:00:00Z',completed_at:'2026-09-02T14:00:00Z',customer_name:'Елена К.',phone:'+47 ••• •• 303',service_type:'mattress',status:'completed',payment_status:'paid',final_price:1400,risk_level:'low',contamination:'Лёгкая',chemical_cost:85,consumables_cost:35}
];

if(document.getElementById('previewBtn'))document.getElementById('previewBtn').addEventListener('click',()=>{preview=true;enter('PREVIEW');});
document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!sb){alert('База SIR не подключена.');return;}
  const email=document.getElementById('email').value,password=document.getElementById('password').value;
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){window.SIR_ADMIN_RUNTIME?.record(error,'auth.sign_in');const status=document.getElementById('loginStatus');if(status){status.textContent='Email или пароль неверны. Проверьте данные либо восстановите пароль.';status.classList.remove('hidden');}else alert('Не удалось войти.');return;}
  const {data:profile,error:pe}=await sb.from('profiles').select('role,display_name,active').eq('id',data.user.id).single();
  if(pe||!profile?.active){if(pe)window.SIR_ADMIN_RUNTIME?.record(pe,'auth.profile');await sb.auth.signOut();alert('Доступ к SIR Admin не активирован.');return;}
  currentRole=(profile.role||'worker').toUpperCase();enter(currentRole);
});
document.getElementById('logout').addEventListener('click',async()=>{if(sb&&!preview)await sb.auth.signOut();location.reload();});
document.getElementById('nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;document.querySelectorAll('#nav [data-view]').forEach(x=>x.classList.toggle('active',x===b));render(b.dataset.view);});

async function enter(role){
  login.classList.add('hidden');app.classList.remove('hidden');document.getElementById('roleBadge').textContent=role;
  if(!preview){startRealtime();startRealtimeFallback();}
  render('dashboard');
}
async function render(view){activeView=view;orderEditorDirty=false;delete main.dataset.orderId;delete main.dataset.preview;main.innerHTML='<div class="empty">Загрузка…</div>';if(view==='dashboard')return dashboard();if(view==='orders')return orders();if(view==='inventory')return inventory();if(view==='customers')return customers();if(view==='guide')return guide();if(view==='team')return team();if(view==='audit')return audit();if(view==='settings')return settings();}
async function getOrders(limit=200){
  if(preview)return previewOrders.slice(0,limit);
  if(!sb)return null;
  const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(limit);
  if(error){window.SIR_ADMIN_RUNTIME?.record(error,'orders.load');return null;}
  return data||[];
}
function showDataLoadError(title,retryView){
  main.innerHTML=`<div class="section-title"><div><h1>${esc(title)}</h1><p>Данные не загружены — ложные нули не показываются.</p></div></div><div class="notice"><b>Нет подтверждённого ответа от базы.</b><br>Проверьте подключение и повторите загрузку. Никакие данные не изменялись.</div><button class="btn primary" id="retryDataLoad">Повторить</button>`;
  main.querySelector('#retryDataLoad')?.addEventListener('click',()=>render(retryView));
}
function showRemoteOrderUpdate(){
  if(document.getElementById('remoteOrderUpdate'))return;
  const notice=document.createElement('div');
  notice.id='remoteOrderUpdate';notice.className='notice';
  notice.innerHTML='<b>Заказ изменился в другом окне или клиентом.</b><br>Ваши несохранённые поля не перезаписаны. Обновите заказ перед сохранением, чтобы не затереть новое состояние. <button class="btn tiny" id="reloadRemoteOrder" type="button">Обновить заказ</button>';
  main.prepend(notice);
  notice.querySelector('#reloadRemoteOrder')?.addEventListener('click',()=>{const id=main.dataset.orderId;orderEditorDirty=false;if(id)orderDetail(id);});
}
function scheduleRealtimeRefresh(orderId=null){
  if(preview)return;
  clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer=setTimeout(()=>{
    const opened=main.dataset.orderId;
    if(opened&&(!orderId||opened===orderId)){
      if(orderEditorDirty){showRemoteOrderUpdate();return;}
      return orderDetail(opened);
    }
    if(activeView==='dashboard')return dashboard();
    if(activeView==='orders')return orders();
    if(activeView==='inventory')return inventory();
  },180);
}
function refreshActiveListView(){
  if(preview||!sb||!navigator.onLine||document.visibilityState==='hidden')return;
  if(activeView==='dashboard')return dashboard();
  if(activeView==='orders')return orders();
  if(activeView==='inventory')return inventory();
}
function releaseRealtimeChannel(){
  if(!orderRealtime||!sb)return;
  const channel=orderRealtime;orderRealtime=null;
  Promise.resolve(sb.removeChannel(channel)).catch(error=>window.SIR_ADMIN_RUNTIME?.record(error,'realtime.remove'));
}
function scheduleRealtimeReconnect(){
  if(preview||!sb||!navigator.onLine||realtimeRetryTimer)return;
  const delay=realtimeBackoffMs;
  realtimeBackoffMs=Math.min(realtimeBackoffMs*2,30000);
  realtimeRetryTimer=setTimeout(()=>{
    realtimeRetryTimer=null;
    releaseRealtimeChannel();
    startRealtime();
    refreshActiveListView();
  },delay);
}
function startRealtimeFallback(){
  if(realtimeFallbackTimer)return;
  realtimeFallbackTimer=setInterval(()=>{
    if(document.documentElement.dataset.realtime!=='online')refreshActiveListView();
  },45000);
}
function startRealtime(){
  if(preview||!sb||orderRealtime||!navigator.onLine)return;
  document.documentElement.dataset.realtime='connecting';
  orderRealtime=sb.channel('sir-admin-control-center')
    .on('postgres_changes',{event:'*',schema:'public',table:'orders'},payload=>scheduleRealtimeRefresh(payload.new?.id||payload.old?.id||null))
    .on('postgres_changes',{event:'*',schema:'public',table:'appointments'},()=>scheduleRealtimeRefresh())
    .on('postgres_changes',{event:'*',schema:'public',table:'chemicals'},()=>scheduleRealtimeRefresh())
    .subscribe(status=>{
      if(status==='SUBSCRIBED'){
        document.documentElement.dataset.realtime='online';
        realtimeBackoffMs=2000;
        clearTimeout(realtimeRetryTimer);realtimeRetryTimer=null;
        if(activeView==='dashboard')scheduleRealtimeRefresh();
        return;
      }
      if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
        document.documentElement.dataset.realtime='degraded';
        window.SIR_ADMIN_RUNTIME?.record(new Error('Realtime '+status),'realtime');
        scheduleRealtimeReconnect();
        return;
      }
      document.documentElement.dataset.realtime='connecting';
    });
}
addEventListener('online',()=>{
  if(preview||!sb)return;
  releaseRealtimeChannel();
  startRealtime();
  refreshActiveListView();
});
addEventListener('offline',()=>{
  clearTimeout(realtimeRetryTimer);realtimeRetryTimer=null;
  document.documentElement.dataset.realtime='offline';
});
addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||preview||!sb||!navigator.onLine)return;
  if(document.documentElement.dataset.realtime!=='online'){
    releaseRealtimeChannel();
    startRealtime();
  }
  refreshActiveListView();
});

async function dashboard(){
  activeView='dashboard';
  const o=await getOrders();if(!o){showDataLoadError('Центр контроля','dashboard');return;}const now=new Date(),today=localDate(now),dayStart=new Date(now),dayEnd=new Date(now);
  dayStart.setHours(0,0,0,0);dayEnd.setHours(24,0,0,0);
  let chemicals=[],todayAppointments=[],recentAudit=[];
  if(!preview&&sb){
    const [chemRes,apptRes,auditRes]=await Promise.all([
      sb.from('chemicals').select('id,name,brand,active,stock_status,stock_note,hse_status,risk_level').eq('active',true).order('brand').order('name'),
      sb.from('appointments').select('order_id,starts_at,ends_at,tentative').gte('starts_at',dayStart.toISOString()).lt('starts_at',dayEnd.toISOString()).order('starts_at'),
      canAdmin()?sb.from('audit_events').select('action,entity_id,metadata,created_at').eq('entity_type','order').order('created_at',{ascending:false}).limit(8):Promise.resolve({data:[]})
    ]);
    const coreError=chemRes.error||apptRes.error;
    if(coreError){
      window.SIR_ADMIN_RUNTIME?.record(coreError,'dashboard.core');
      showDataLoadError('Центр контроля','dashboard');return;
    }
    if(auditRes.error)window.SIR_ADMIN_RUNTIME?.record(auditRes.error,'dashboard.audit');
    chemicals=chemRes.data||[];todayAppointments=apptRes.data||[];recentAudit=auditRes.data||[];
  }
  const reviewOrders=o.filter(x=>['new','under_review'].includes(x.status));
  const inWork=o.filter(x=>x.status==='in_progress');
  const unpaidDone=o.filter(x=>x.status==='completed'&&x.payment_status!=='paid');
  const completedToday=o.filter(x=>x.status==='completed'&&localDate(x.completed_at)===today);
  const todayIds=new Set(todayAppointments.map(x=>x.order_id));
  const todayOrders=preview?o.filter(x=>['scheduled','in_progress'].includes(x.status)):o.filter(x=>todayIds.has(x.id)||x.status==='in_progress');
  const urgent=o.filter(x=>['high_risk','stop'].includes(x.risk_level)||['new','under_review','customer_requested_new_time'].includes(x.status)||(x.status==='completed'&&x.payment_status!=='paid')).slice(0,12);
  const stockIssues=preview?2:chemicals.filter(x=>['low','out'].includes(x.stock_status)).length;
  const hseIssues=preview?1:chemicals.filter(x=>x.risk_level==='stop'||!['verified','source_reviewed'].includes(x.hse_status)).length;
  const revenue=completedToday.reduce((a,x)=>a+(+x.final_price||0),0);
  const syncState=preview?'PREVIEW':(document.documentElement.dataset.realtime==='online'?'LIVE':'CONNECTING');
  main.innerHTML=`<div class="section-title"><div><h1>Центр контроля</h1><p>Заказы, работа, оплата, склад и безопасность в одном месте</p></div><div class="toolbar"><span class="sync-badge ${syncState==='LIVE'?'online':''}">● ${syncState==='LIVE'?'LIVE-синхронизация':syncState}</span><button class="btn primary" id="openOrders">Все заказы</button></div></div>${preview?'<div class="notice">Безопасный предпросмотр — реальная база не изменяется.</div>':''}<section class="control-grid">
    <button class="card metric metric-action" data-control="review"><span>На рассмотрении</span><strong>${reviewOrders.length}</strong><small>Новые и ожидающие решения</small></button>
    <button class="card metric metric-action" data-control="today"><span>Работы сегодня</span><strong>${todayOrders.length}</strong><small>Запланировано и выполняется</small></button>
    <button class="card metric metric-action" data-control="in_progress"><span>Сейчас в работе</span><strong>${inWork.length}</strong><small>Открыть текущие работы</small></button>
    <button class="card metric metric-action" data-control="unpaid"><span>Не оплачено</span><strong>${unpaidDone.length}</strong><small>Выполненные, ожидающие оплату</small></button>
    <button class="card metric metric-action" data-control="completed_today"><span>Выполнено сегодня</span><strong>${completedToday.length}</strong><small>${money(revenue)} выручки</small></button>
    <button class="card metric metric-action ${stockIssues?'metric-warn':''}" data-control="inventory"><span>Склад</span><strong>${stockIssues}</strong><small>Заканчивается или отсутствует</small></button>
    <button class="card metric metric-action ${hseIssues?'metric-danger':''}" data-control="hse"><span>HMS / STOP</span><strong>${hseIssues}</strong><small>Требует проверки безопасности</small></button>
  </section>
  <div class="panel attention-panel"><div class="panel-head"><span>Требует внимания</span><span class="mini">заказы · риск · оплата</span></div>${urgent.length?orderTable(urgent):'<div class="empty">Срочных действий нет.</div>'}</div>
  <div class="panel"><div class="panel-head"><span>Работы сегодня</span><span class="mini">${todayOrders.length}</span></div>${todayOrders.length?orderTable(todayOrders):'<div class="empty">На сегодня работ нет.</div>'}</div>
  ${recentAudit.length?`<div class="panel"><div class="panel-head"><span>Последние изменения</span><button class="btn" data-view-audit>Открыть журнал</button></div><div class="activity-list">${recentAudit.map(x=>`<div class="activity-row"><span>${new Date(x.created_at).toLocaleString('ru')}</span><b>${esc(auditActionLabel(x.action))}</b><small>${esc(x.metadata?.from||'')} ${x.metadata?.to?'→ '+x.metadata.to:''}</small></div>`).join('')}</div></div>`:''}`;
  main.querySelector('#openOrders')?.addEventListener('click',()=>orders());
  main.querySelector('[data-control="review"]')?.addEventListener('click',()=>orders({attention:'review'}));
  main.querySelector('[data-control="today"]')?.addEventListener('click',()=>orders({attention:'today',ids:[...todayIds]}));
  main.querySelector('[data-control="in_progress"]')?.addEventListener('click',()=>orders({status:'in_progress'}));
  main.querySelector('[data-control="unpaid"]')?.addEventListener('click',()=>orders({attention:'unpaid'}));
  main.querySelector('[data-control="completed_today"]')?.addEventListener('click',()=>orders({attention:'completed_today'}));
  main.querySelector('[data-control="inventory"]')?.addEventListener('click',inventory);
  main.querySelector('[data-control="hse"]')?.addEventListener('click',()=>inventory({hseOnly:true}));
  main.querySelector('[data-view-audit]')?.addEventListener('click',audit);
  bindOrderRows();
}
function auditActionLabel(action){
  return {order_status_changed:'Статус заказа',order_final_price_changed:'Цена заказа',order_assignment_changed:'Исполнитель',order_risk_changed:'Риск',order_payment_status_changed:'Оплата'}[action]||action||'Изменение';
}
function nextStatusAction(status){
  return {
    new:{status:'under_review',label:'Взять на рассмотрение'},
    under_review:{status:'confirmed',label:'Подтвердить заказ'},
    offer_sent:{status:'confirmed',label:'Подтвердить заказ'},
    awaiting_confirmation:{status:'confirmed',label:'Подтвердить заказ'},
    customer_requested_new_time:{status:'under_review',label:'Вернуть на рассмотрение'},
    scheduled:{status:'in_progress',label:'▶ Начать работу'},
    in_progress:{status:'completed',label:'✓ Работа выполнена'},
    completed:{status:'in_progress',label:'↩ Вернуть в работу'}
  }[status]||null;
}
function orderActionError(error){
  const m=String(error?.message||error||'').toLowerCase();
  if(m.includes('reviewed technology card'))return'Сначала сформируйте и подтвердите технологическую карту.';
  if(m.includes('worker must be assigned'))return'Перед началом работы назначьте исполнителя.';
  if(m.includes('final price'))return'Перед началом работы согласуйте итоговую цену.';
  if(m.includes('stop risk'))return'STOP: работу нельзя начать или завершить, пока риск не снят и не перепроверен.';
  if(m.includes('must be in progress'))return'Сначала переведите заказ в статус «В работе».';
  if(m.includes('confirmed or scheduled'))return'Сначала подтвердите или запланируйте заказ.';
  if(m.includes('order changed since it was loaded'))return'Заказ уже изменился в другом окне или клиентом. Обновите заказ и повторите действие.';
  if(m.includes('appointment required before scheduling'))return'Чтобы поставить «Запланирован», сначала укажите дату и время работы.';
  if(m.includes('appointment'))return'Не удалось сохранить время работы. Проверьте дату и интервал.';
  return'Изменение не сохранено. Проверьте данные и подключение, затем повторите.';
}
function normalizeSmsPhone(phone){
  const raw=String(phone||'').trim();
  if(!raw)return'';
  const plus=raw.startsWith('+')?'+':'';
  return plus+raw.replace(/\D/g,'');
}
function safeHttpUrl(value){
  const raw=String(value||'').trim();
  if(!raw)return'';
  try{const u=new URL(raw);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return'';}
}
function smsHref(phone,text){
  const p=normalizeSmsPhone(phone);
  return p?`sms:${p}?body=${encodeURIComponent(text)}`:'#';
}
function smsStatusName(status,lang){
  const labels={
    no:{new:'mottatt',under_review:'under vurdering',offer_sent:'tilbud sendt',awaiting_confirmation:'venter på bekreftelse',confirmed:'bekreftet',scheduled:'planlagt',in_progress:'arbeid pågår',completed:'fullført',customer_requested_new_time:'nytt tidspunkt ønsket',cancelled_customer:'avbestilt av kunde',cancelled_sir:'avbestilt av SIR',no_show:'ikke møtt / ingen tilgang'},
    en:{new:'received',under_review:'under review',offer_sent:'offer sent',awaiting_confirmation:'awaiting confirmation',confirmed:'confirmed',scheduled:'scheduled',in_progress:'in progress',completed:'completed',customer_requested_new_time:'new time requested',cancelled_customer:'cancelled by customer',cancelled_sir:'cancelled by SIR',no_show:'no-show / no access'},
    ru:statusLabel
  };
  return labels[lang]?.[status]||statusLabel[status]||status||'—';
}
function smsStatusText(order,lang='no'){
  const site=new URL('../',location.href).href;
  const status=smsStatusName(order.status,lang);
  if(lang==='ru')return `SIR Rens & Pleie: заказ ${order.order_no} — статус «${status}». Следить за услугами SIR: ${site}`;
  if(lang==='en')return `SIR Rens & Pleie: order ${order.order_no} — status: ${status}. SIR services: ${site}`;
  return `SIR Rens & Pleie: ordre ${order.order_no} — status: ${status}. Se SIR-tjenester: ${site}`;
}
function smsReviewText(order,lang='no',reviewUrl=''){
  const site=new URL('../',location.href).href;
  const link=safeHttpUrl(reviewUrl);
  if(lang==='ru')return link
    ?`Спасибо, что выбрали SIR Rens & Pleie! Будем благодарны за честную оценку заказа ${order.order_no}: ${link} Наш сайт: ${site}`
    :`Спасибо, что выбрали SIR Rens & Pleie! Пожалуйста, ответьте на это SMS оценкой от 1 до 5 и коротким комментарием по заказу ${order.order_no}. Наш сайт: ${site}`;
  if(lang==='en')return link
    ?`Thank you for choosing SIR Rens & Pleie! We would appreciate an honest review of order ${order.order_no}: ${link} Our website: ${site}`
    :`Thank you for choosing SIR Rens & Pleie! Please reply to this SMS with a 1–5 rating and a short comment about order ${order.order_no}. Our website: ${site}`;
  return link
    ?`Takk for at du valgte SIR Rens & Pleie! Vi setter pris på en ærlig vurdering av ordre ${order.order_no}: ${link} Nettsiden vår: ${site}`
    :`Takk for at du valgte SIR Rens & Pleie! Svar gjerne på denne SMS-en med en vurdering fra 1 til 5 og en kort kommentar om ordre ${order.order_no}. Nettsiden vår: ${site}`;
}
function googleTranslateUrl(text,target){
  const u=new URL('https://translate.google.com/');
  u.searchParams.set('sl','ru');u.searchParams.set('tl',target);u.searchParams.set('text',text);u.searchParams.set('op','translate');
  return u.href;
}
async function translateRuText(text,target,onProgress){
  const input=String(text||'').trim();
  if(!input)throw new Error('Введите текст по-русски.');
  if(target==='ru')return input;
  if('Translator' in self){
    const availability=await Translator.availability({sourceLanguage:'ru',targetLanguage:target});
    if(!['available','downloadable'].includes(availability))throw new Error('Встроенный перевод для этой пары языков недоступен.');
    const translator=await Translator.create({
      sourceLanguage:'ru',
      targetLanguage:target,
      monitor(m){m.addEventListener('downloadprogress',e=>onProgress?.(Math.round(e.loaded*100)));}
    });
    return await translator.translate(input);
  }
  return null;
}
function mountClientCommunication(order,company={}){
  const host=main.querySelector('.detail-grid')||main.querySelector('.decision-bar');
  if(!host||main.querySelector('.client-communication'))return;
  host.insertAdjacentHTML('afterend',`<section class="panel client-communication"><div class="panel-head"><span>Связь с клиентом</span><span class="mini">SMS + перевод RU → NO / EN</span></div><div class="communication-body">
    <div class="field compact-field"><label>Язык SMS</label><select id="smsLanguage"><option value="no">NO</option><option value="en">EN</option><option value="ru">RU</option></select></div>
    <div class="toolbar communication-actions"><a class="btn primary" data-sms-status href="#">SMS: статус заказа</a>${order.status==='completed'?'<a class="btn" data-sms-review href="#">⭐ Попросить отзыв</a>':''}</div>
    <div class="mini communication-note">Готовое SMS открывается в приложении телефона. Отправку подтверждаешь ты.</div>
    <div class="custom-message-box">
      <div class="custom-message-head"><b>Свободное сообщение</b><span>Пиши по-русски — клиенту подготовим NO или EN</span></div>
      <div class="field"><label>Твой текст на русском</label><textarea id="customSmsRu" rows="4" maxlength="1000" placeholder="Например: Здравствуйте. Машина уже готова, можете забрать её после 16:00."></textarea></div>
      <div class="custom-message-controls"><div class="field compact-field"><label>Перевести на</label><select id="customSmsTarget"><option value="no">Норвежский (NO)</option><option value="en">Английский (EN)</option></select></div><button class="btn primary" type="button" id="translateCustomSms">Перевести</button><a class="btn hidden" id="openExternalTranslate" target="_blank" rel="noopener noreferrer">Открыть Google Translate</a></div>
      <div id="translateCustomStatus" class="mini"></div>
      <div class="field"><label>Текст, который получит клиент</label><textarea id="customSmsTranslated" rows="4" maxlength="1000" placeholder="Здесь появится перевод. Перед отправкой его можно исправить вручную."></textarea></div>
      <a class="btn sms-send-translated disabled-link" data-sms-custom href="#" aria-disabled="true">Открыть SMS с переводом</a>
    </div>
  </div></section>`);
  const lang=main.querySelector('#smsLanguage');
  const statusLink=main.querySelector('[data-sms-status]');
  const reviewLink=main.querySelector('[data-sms-review]');
  const source=main.querySelector('#customSmsRu');
  const target=main.querySelector('#customSmsTarget');
  const translated=main.querySelector('#customSmsTranslated');
  const translateBtn=main.querySelector('#translateCustomSms');
  const translateStatus=main.querySelector('#translateCustomStatus');
  const external=main.querySelector('#openExternalTranslate');
  const customLink=main.querySelector('[data-sms-custom]');
  const updateStandard=()=>{
    const l=lang?.value||'no';
    if(statusLink)statusLink.href=smsHref(order.phone,smsStatusText(order,l));
    if(reviewLink)reviewLink.href=smsHref(order.phone,smsReviewText(order,l,company.review_url||''));
  };
  const updateCustomLink=()=>{
    const text=translated?.value.trim()||'';
    if(customLink){customLink.href=text?smsHref(order.phone,text):'#';customLink.classList.toggle('disabled-link',!text);customLink.setAttribute('aria-disabled',text?'false':'true');}
  };
  translated?.addEventListener('input',updateCustomLink);
  target?.addEventListener('change',()=>{
    translated.value='';updateCustomLink();translateStatus.textContent='';external.classList.add('hidden');
  });
  translateBtn?.addEventListener('click',async()=>{
    const text=source.value.trim(),to=target.value;
    translateStatus.textContent='Перевожу…';translateBtn.disabled=true;external.classList.add('hidden');
    try{
      const result=await translateRuText(text,to,p=>translateStatus.textContent=`Загрузка языкового пакета: ${p}%`);
      if(result){
        translated.value=result;translateStatus.textContent='Перевод готов. Проверь текст перед отправкой.';updateCustomLink();
      }else{
        external.href=googleTranslateUrl(text,to);external.classList.remove('hidden');
        translateStatus.textContent='На этом телефоне встроенный перевод недоступен. Открой Google Translate, затем вставь готовый перевод в поле ниже.';
      }
    }catch(err){
      external.href=googleTranslateUrl(text,to);external.classList.remove('hidden');
      translateStatus.textContent=err?.message||'Не удалось выполнить перевод. Можно открыть Google Translate.';
    }finally{translateBtn.disabled=false;}
  });
  customLink?.addEventListener('click',e=>{if(customLink.classList.contains('disabled-link'))e.preventDefault();});
  lang?.addEventListener('change',updateStandard);updateStandard();updateCustomLink();
}
function orderTable(rows){return `<div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Клиент</th><th>Услуга</th><th>Статус</th><th>Оплата</th><th>Цена</th><th>Риск</th></tr></thead><tbody>${rows.map(x=>`<tr class="order-row" data-id="${x.id}" tabindex="0"><td><b>${esc(x.order_no||'—')}</b><div class="mini">${new Date(x.created_at).toLocaleDateString('ru')}</div></td><td>${esc(x.customer_name||'—')}<div class="mini">${esc(x.phone||'')}</div></td><td>${esc(serviceLabel[x.service_type]||x.service_type||'—')}</td><td>${statusLabel[x.status]||esc(x.status||'—')}</td><td><span class="payment-pill ${(x.payment_status||'unpaid')}">${x.payment_status==='paid'?'Оплачено':x.payment_status==='refunded'?'Возврат':'Не оплачено'}</span></td><td>${x.final_price!=null?money(x.final_price):x.preliminary_price!=null?`${money(x.preliminary_price)} ориентир`:'—'}</td><td><span class="risk ${(x.risk_level||'low').replace('_','-')}">${esc((x.risk_level||'LOW').toUpperCase())}</span></td></tr>`).join('')}</tbody></table></div>`;}
function bindOrderRows(){main.querySelectorAll('.order-row').forEach(r=>{const open=()=>orderDetail(r.dataset.id);r.addEventListener('click',open);r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});}

async function orders(options={}){
  activeView='orders';
  const o=await getOrders();
  if(!o){showDataLoadError('Заказы','orders');return;}
  let special=options.attention||'',initialStatus=options.status||'',ids=new Set(options.ids||[]);
  main.innerHTML=`<div class="section-title"><div><h1>Заказы</h1><p>Единый список со статусом сайта, работой и оплатой</p></div>${canManage()?'<button class="btn primary" id="manualOrder">+ Ручной заказ</button>':''}</div><div class="order-filters"><input id="orderSearch" placeholder="Номер, имя, телефон, автомобиль"><select id="orderStatus"><option value="">Все статусы</option>${allStatuses.map(s=>`<option value="${s}" ${initialStatus===s?'selected':''}>${statusLabel[s]}</option>`).join('')}</select><select id="orderPayment"><option value="">Любая оплата</option><option value="unpaid">Не оплачено</option><option value="paid">Оплачено</option><option value="refunded">Возврат</option></select></div><div id="ordersFilterNote"></div><div id="ordersResult"></div>`;
  const paint=()=>{
    const q=main.querySelector('#orderSearch').value.toLowerCase().trim(),status=main.querySelector('#orderStatus').value,payment=main.querySelector('#orderPayment').value;
    let rows=o.filter(x=>(!status||x.status===status)&&(!payment||(x.payment_status||'unpaid')===payment)&&(!q||[x.order_no,x.customer_name,x.phone,x.vehicle_plate,x.vehicle_brand,x.vehicle_model].join(' ').toLowerCase().includes(q)));
    if(special==='review')rows=rows.filter(x=>['new','under_review'].includes(x.status));
    if(special==='unpaid')rows=rows.filter(x=>x.status==='completed'&&x.payment_status!=='paid');
    if(special==='completed_today')rows=rows.filter(x=>x.status==='completed'&&localDate(x.completed_at)===localDate(new Date()));
    if(special==='today'&&ids.size)rows=rows.filter(x=>ids.has(x.id)||x.status==='in_progress');
    const note={review:'Показаны новые заказы и заказы на рассмотрении',unpaid:'Показаны выполненные, но не оплаченные заказы',completed_today:'Показаны выполненные сегодня',today:'Показаны работы на сегодня'}[special]||'';
    main.querySelector('#ordersFilterNote').innerHTML=note?`<div class="notice compact">${note} <button class="link-btn" id="clearSpecial">Сбросить</button></div>`:'';
    main.querySelector('#ordersResult').innerHTML=rows.length?`<div class="panel">${orderTable(rows)}</div>`:'<div class="card empty">Ничего не найдено.</div>';
    main.querySelector('#clearSpecial')?.addEventListener('click',()=>{special='';paint();});
    bindOrderRows();
  };
  paint();
  main.querySelector('#orderSearch').addEventListener('input',paint);
  main.querySelector('#orderStatus').addEventListener('change',()=>{special='';paint();});
  main.querySelector('#orderPayment').addEventListener('change',()=>{special='';paint();});
  main.querySelector('#manualOrder')?.addEventListener('click',manualOrderForm);
}
async function manualOrderForm(){
  main.innerHTML=`<div class="section-title"><div><h1>Ручной заказ</h1><p>Для звонка или сообщения клиента</p></div><button class="btn" id="backOrders">← Заказы</button></div><form class="card" id="manualForm"><div class="settings-grid"><div class="field"><label>Имя</label><input name="name" required></div><div class="field"><label>Телефон</label><input name="phone" required></div><div class="field"><label>Услуга</label><select name="service"><option value="car">Салон автомобиля</option><option value="sofa">Диван</option><option value="chair">Кресло</option><option value="mattress">Матрас</option></select></div><div class="field"><label>Предварительная цена</label><input name="price" type="number" min="0"></div></div><div class="field"><label>Комментарий</label><textarea name="comment"></textarea></div><button class="btn primary">Создать</button></form>`;
  main.querySelector('#backOrders').addEventListener('click',orders);
  main.querySelector('#manualForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!ensureWritable())return;const f=new FormData(e.target),name=String(f.get('name')).trim(),phone=String(f.get('phone')).trim();
    const {data:o,error}=await sb.rpc('create_manual_order',{
      p_name:name,
      p_phone:phone,
      p_service:String(f.get('service')),
      p_preliminary_price:numOrNull(f.get('price')),
      p_comment:String(f.get('comment')||'')
    });
    if(error){window.SIR_ADMIN_RUNTIME?.record(error,'orders.create_manual');alert(orderActionError(error));return;}
    orderDetail(o.id);
  });
}

async function orderDetail(id){
  activeView='order-detail';
  if(preview)return previewOrderDetail(id);
  orderEditorDirty=false;
  main.dataset.orderId=id;main.dataset.preview='false';
  if(!sb){alert('Детали доступны после входа.');return;}
  const [orderRes,apptRes,staffRes,photoRes,techRes,eventRes,companyRes]=await Promise.all([
    sb.from('orders').select('*').eq('id',id).single(),
    sb.from('appointments').select('*').eq('order_id',id).order('starts_at',{ascending:false}).limit(1).maybeSingle(),
    sb.from('profiles').select('id,display_name,role,active').eq('active',true).order('display_name'),
    sb.from('order_photos').select('*').eq('order_id',id).order('created_at'),
    sb.from('order_technology_cards').select('*').eq('order_id',id).maybeSingle(),
    sb.from('order_events').select('event_type,from_value,to_value,note,created_at').eq('order_id',id).order('created_at',{ascending:false}).limit(50),
    sb.from('app_settings').select('value').eq('key','company').maybeSingle()
  ]);
  const criticalError=orderRes.error||apptRes.error||techRes.error||(canManage()?staffRes.error:null);
  if(criticalError||!orderRes.data){
    window.SIR_ADMIN_RUNTIME?.record(criticalError||new Error('order not found'),'order.detail');
    main.innerHTML='<div class="notice"><b>Карточка заказа не загружена полностью.</b><br>Чтобы не принимать решение по неполным данным, редактирование заблокировано.</div><button class="btn primary" id="retryOrderDetail">Повторить</button>';
    main.querySelector('#retryOrderDetail')?.addEventListener('click',()=>orderDetail(id));
    return;
  }
  if(photoRes.error)window.SIR_ADMIN_RUNTIME?.record(photoRes.error,'order.photos');
  if(eventRes.error)window.SIR_ADMIN_RUNTIME?.record(eventRes.error,'order.events');
  if(companyRes.error)window.SIR_ADMIN_RUNTIME?.record(companyRes.error,'order.company_settings');
  const o=orderRes.data,appt=apptRes.data,staff=staffRes.data||[],photos=photoRes.data||[],tech=techRes.data,events=eventRes.data||[],companyRow=companyRes.data;
  const signed=[];
  for(const p of photos){
    const {data,error:signedError}=await sb.storage.from('order-photos').createSignedUrl(p.storage_path,3600);
    if(signedError){window.SIR_ADMIN_RUNTIME?.record(signedError,'order.photo_url');continue;}
    if(data?.signedUrl)signed.push({url:data.signedUrl,id:p.id});
  }
  const company=companyRow?.value||{};
  const localStart=appt?.starts_at?toLocalParts(appt.starts_at):{date:'',time:''};
  const workReady=!!(tech?.reviewed_at&&tech?.reviewed_by&&tech?.risk_level!=='stop'&&o.risk_level!=='stop'&&o.final_price!=null&&+o.final_price>0&&o.assigned_to);
  const nextAction=o.risk_level==='stop'?'Работу не начинать: открыть карту и зафиксировать причину STOP':!tech?'Сформировать технологическую карту':!tech.reviewed_at?'Проверить материал и подтвердить карту человеком':o.final_price==null?'После осмотра согласовать окончательную цену':!o.assigned_to?'Назначить исполнителя перед началом работы':tech.risk_level==='stop'?'Технологическая карта имеет STOP — работу не начинать':o.status==='confirmed'&&!appt?'Укажите дату и время, затем сохраните статус «Запланирован»':'Заказ готов к планированию или выполнению';
  main.innerHTML=`<div class="section-title"><div><h1>${esc(o.order_no)}</h1><p>${esc(serviceLabel[o.service_type]||o.service_type)} · ${statusLabel[o.status]||esc(o.status)}</p></div><button class="btn" id="backOrders">← Заказы</button></div><div class="decision-bar"><div><span>Следующее действие</span><b>${esc(nextAction)}</b></div><a class="btn primary" href="technology.html?order=${encodeURIComponent(id)}">Открыть рабочую карту</a></div><div class="detail-grid"><section class="card"><h3>Что нужно выполнить</h3><div class="kv"><span>Клиент</span><b>${esc(o.customer_name)} · ${esc(o.phone)}</b></div><div class="kv"><span>Адрес</span><b>${esc(o.address||'—')}</b></div><div class="kv"><span>Автомобиль</span><b>${esc([o.vehicle_plate,o.vehicle_brand,o.vehicle_model,o.vehicle_year].filter(Boolean).join(' ')||'—')}</b></div><div class="kv"><span>Загрязнение</span><b>${esc(o.contamination||'—')}</b></div><div class="kv"><span>Пятна / шерсть / запах</span><b>${o.stains?'пятна ':''}${o.pet_hair?'шерсть ':''}${o.odor?'запах':''||'—'}</b></div><div class="kv"><span>Расчётное время</span><b>${o.estimated_minutes?`${Math.floor(o.estimated_minutes/60)} ч ${o.estimated_minutes%60||''}`:'—'}</b></div><div class="field"><label>Комментарий клиента</label><textarea readonly>${esc(o.customer_comment||'')}</textarea></div><div class="toolbar"><a class="btn" href="tel:${esc(o.phone)}">Позвонить</a><a class="btn" href="sms:${esc(o.phone)}">SMS</a></div></section><section class="card"><h3>Решение по заказу</h3><form id="orderForm"><div class="field"><label>Статус</label><select name="status" ${canManage()?'':'disabled'}>${allStatuses.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel[s]}</option>`).join('')}</select></div><div class="field"><label>Оплата</label><select name="payment_status" ${canManage()?'':'disabled'}><option value="unpaid" ${o.payment_status==='unpaid'?'selected':''}>Не оплачено</option><option value="paid" ${o.payment_status==='paid'?'selected':''}>Оплачено</option><option value="refunded" ${o.payment_status==='refunded'?'selected':''}>Возврат</option></select></div><div class="field"><label>Риск</label><select name="risk" ${canManage()?'':'disabled'}>${['low','caution','high_risk','stop'].map(r=>`<option value="${r}" ${o.risk_level===r?'selected':''}>${r.toUpperCase()}</option>`).join('')}</select></div><div class="field"><label>Окончательная согласованная цена</label><input name="final_price" type="number" min="0" value="${o.final_price??''}" ${canManage()?'':'disabled'}><div class="mini">Цена сайта — только ориентир. Внести после осмотра и согласия клиента.</div></div><div class="field"><label>Исполнитель</label><select name="assigned_to" ${canManage()?'':'disabled'}><option value="">Не назначен</option>${staff.map(p=>`<option value="${p.id}" ${o.assigned_to===p.id?'selected':''}>${esc(p.display_name||p.role)}</option>`).join('')}</select></div><div class="field"><label>Внутренняя заметка</label><textarea name="note">${esc(o.internal_note||'')}</textarea></div>${canManage()?`<h4>Дата и время</h4><div class="settings-grid"><div class="field"><label>Дата</label><input name="date" type="date" value="${localStart.date}"></div><div class="field"><label>Время</label><input name="time" type="time" value="${localStart.time}"></div><div class="field"><label>Длительность, мин.</label><input name="duration" type="number" min="30" step="15" value="${appt?Math.max(30,Math.round((new Date(appt.ends_at)-new Date(appt.starts_at))/60000)):o.estimated_minutes||240}"></div><div class="field"><label>Бронь</label><select name="tentative"><option value="true" ${appt?.tentative!==false?'selected':''}>Ожидает подтверждения</option><option value="false" ${appt?.tentative===false?'selected':''}>Подтверждена</option></select></div></div>`:''}<button class="btn primary" type="submit">Сохранить решение</button></form></section></div>${signed.length?`<section class="panel"><div class="panel-head">Фото клиента</div><div class="photo-grid">${signed.map(p=>`<a href="${p.url}" target="_blank" rel="noopener noreferrer"><img src="${p.url}" alt="Фото заказа"></a>`).join('')}</div></section>`:'<div class="notice">Фото нет. Сложный материал или сильное загрязнение нельзя окончательно оценивать дистанционно.</div>'}<section class="panel"><div class="panel-head"><span>Готовность технологии</span><a class="btn" href="technology.html?order=${encodeURIComponent(id)}">Открыть карту</a></div><div class="cardless">${tech?`Риск: <b>${esc(tech.risk_level)}</b> · материал: ${esc(tech.material_guess||'не указан')} · ${tech.reviewed_at?'подтверждено человеком':'требуется подтверждение'}`:'Черновик ещё не сформирован. Карта подберёт проходы, сушку между проходами, инструмент, проверенную химию и условия STOP по конкретным зонам заказа.'}</div></section>`;
  main.querySelector('#backOrders').addEventListener('click',orders);
  mountClientCommunication(o,company);
  if(canManage()){
    const quick=nextStatusAction(o.status);
    const controls=[];
    if(quick&&!(quick.status==='in_progress'&&!workReady))controls.push(`<button class="btn primary" data-quick-status="${quick.status}">${quick.label}</button>`);
    if(o.status==='completed'&&o.payment_status!=='paid')controls.push('<button class="btn" data-mark-paid>✓ Отметить оплату</button>');
    if(controls.length){
      main.querySelector('.decision-bar')?.insertAdjacentHTML('afterend',`<div class="quick-workflow"><span>Быстрое действие</span><div class="toolbar">${controls.join('')}</div></div>`);
      main.querySelector('[data-quick-status]')?.addEventListener('click',async e=>{
        const next=e.currentTarget.dataset.quickStatus;
        e.currentTarget.disabled=true;
        if(!ensureWritable()){e.currentTarget.disabled=false;return;}
        const {error}=await sb.rpc('save_order_decision',{p_order_id:id,p_patch:{status:next,_expected_updated_at:o.updated_at},p_appointment:null});
        if(error){
          window.SIR_ADMIN_RUNTIME?.record(error,'order.quick_status');
          e.currentTarget.disabled=false;alert(orderActionError(error));return;
        }
        orderDetail(id);
      });
      main.querySelector('[data-mark-paid]')?.addEventListener('click',async e=>{
        e.currentTarget.disabled=true;
        if(!ensureWritable()){e.currentTarget.disabled=false;return;}
        const {error}=await sb.rpc('save_order_decision',{p_order_id:id,p_patch:{payment_status:'paid',_expected_updated_at:o.updated_at},p_appointment:null});
        if(error){e.currentTarget.disabled=false;alert(error.message);return;}
        orderDetail(id);
      });
    }
  }
  if(events.length){
    main.insertAdjacentHTML('beforeend',`<section class="panel order-history"><div class="panel-head"><span>История статусов</span><span class="mini">${events.length} событий</span></div><div class="activity-list">${events.map(x=>`<div class="activity-row"><span>${new Date(x.created_at).toLocaleString('ru')}</span><b>${esc(statusLabel[x.from_value]||x.from_value||'—')} → ${esc(statusLabel[x.to_value]||x.to_value||'—')}</b><small>${esc(x.note||'Статус синхронизирован с заказом')}</small></div>`).join('')}</div></section>`);
  }
  main.querySelector('#orderForm').addEventListener('submit',async e=>{
    e.preventDefault();
    if(!ensureWritable())return;
    const form=e.currentTarget,button=form.querySelector('button[type="submit"]'),f=new FormData(form);
    const patch={_expected_updated_at:o.updated_at,internal_note:String(f.get('note')||'')};
    button.disabled=true;
    try{
      if(canManage()){
        patch.status=String(f.get('status'));
        patch.payment_status=String(f.get('payment_status')||'unpaid');
        patch.risk_level=String(f.get('risk'));
        patch.final_price=numOrNull(f.get('final_price'));
        patch.assigned_to=f.get('assigned_to')||null;
        if(patch.status==='in_progress'&&patch.risk_level==='stop')throw new Error('STOP risk blocks work start');

        const date=String(f.get('date')||''),time=String(f.get('time')||'');
        if((date&&!time)||(!date&&time))throw new Error('invalid appointment interval');
        let appointment=null;
        if(date&&time){
          const start=new Date(`${date}T${time}:00`);
          if(Number.isNaN(start.getTime()))throw new Error('invalid appointment interval');
          const duration=Math.max(30,+f.get('duration')||240);
          appointment={id:appt?.id||null,starts_at:start.toISOString(),ends_at:new Date(start.getTime()+duration*60000).toISOString(),tentative:String(f.get('tentative'))==='true',address:o.address||null};
        }
        const {error}=await sb.rpc('save_order_decision',{p_order_id:id,p_patch:patch,p_appointment:appointment});
        if(error)throw error;
      }else{
        const {error}=await sb.from('orders').update(patch).eq('id',id);
        if(error)throw error;
      }
      alert('Сохранено');orderDetail(id);
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'order.save');
      alert(orderActionError(error));
    }finally{
      button.disabled=false;
    }
  });
}

function previewOrderDetail(id){
  const o=previewOrders.find(x=>x.id===id);if(!o){orders();return;}
  main.dataset.orderId=id;main.dataset.preview='true';
  const price=o.final_price??o.preliminary_price??0;
  main.innerHTML=`<div class="section-title"><div><h1>${esc(o.order_no)}</h1><p>Демонстрационный заказ · ${esc(serviceLabel[o.service_type])}</p></div><button class="btn" id="backOrders">← Заказы</button></div><div class="notice safe">Работайте с ним как с реальным. Изменения сохраняются только до закрытия или обновления страницы.</div><div class="decision-bar"><div><span>Следующее действие</span><b>${o.status==='new'?'Проверить материал, согласовать точную цену и время':o.status==='completed'?'Заказ завершён — проверить оплату и запрос отзыва':'Выполнить действие по выбранному статусу'}</b></div><span class="risk ${o.risk_level}">${o.risk_level.toUpperCase()}</span></div><div class="detail-grid"><section class="card"><h3>Заказ клиента</h3><div class="kv"><span>Клиент</span><b>${esc(o.customer_name)} · ${esc(o.phone)}</b></div><div class="kv"><span>Адрес / расстояние</span><b>${esc(o.address)} · ${o.distance_km} км</b></div><div class="kv"><span>Автомобиль</span><b>${esc([o.vehicle_plate,o.vehicle_brand,o.vehicle_model,o.vehicle_year].join(' '))}</b></div><div class="kv"><span>Мест зарегистрировано</span><b>${o.registered_seats}</b></div><div class="kv"><span>Что чистим</span><b>${esc(o.cleaning_scope)}</b></div><div class="kv"><span>Выбрано</span><b>${esc(o.selected_areas)}</b></div><div class="kv"><span>Материал</span><b>${esc(o.material)}</b></div><div class="kv"><span>Загрязнение</span><b>${esc(o.contamination)} · пятна · шерсть</b></div><div class="field"><label>Комментарий клиента</label><textarea readonly>${esc(o.customer_comment)}</textarea></div></section><section class="card"><h3>Решение по заказу</h3><form id="demoOrderForm"><div class="field"><label>Статус</label><select name="status">${allStatuses.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel[s]}</option>`).join('')}</select></div><div class="field"><label>Риск</label><select name="risk">${['low','caution','high_risk','stop'].map(r=>`<option value="${r}" ${o.risk_level===r?'selected':''}>${r.toUpperCase()}</option>`).join('')}</select></div><div class="field"><label>Точная цена после осмотра, NOK</label><input name="price" type="number" min="0" value="${price}"><div class="mini">Цена сайта приблизительная. Окончательную цену вносим после осмотра и согласия клиента.</div></div><div class="field"><label>Исполнитель</label><select name="worker"><option>Не назначен</option><option ${o.worker==='Слава'?'selected':''}>Слава</option><option ${o.worker==='Иван'?'selected':''}>Иван</option></select></div><div class="field"><label>Дата и время</label><input name="appointment" type="datetime-local" value="${o.appointment||''}"></div><div class="field"><label>Внутренняя заметка</label><textarea name="note">${esc(o.internal_note||'')}</textarea></div><button class="btn primary" type="submit">Сохранить решение</button><div class="mini" id="demoSaveStatus"></div></form></section></div><section class="panel"><div class="panel-head"><span>Подсказка по выполнению</span><span class="risk caution">Требуется проверка человеком</span></div><div class="cardless demo-plan"><div><b>План: 4 ч 30 мин</b><ol><li>Фото до работы, сухая уборка и удаление шерсти.</li><li>Проверить ткань, экокожу, швы и стойкость цвета на незаметном участке.</li><li>Ткань: контролируемое нанесение подходящего текстильного средства, мягкая агитация и экстракция без переувлажнения.</li><li>Экокожа: только совместимое средство и мягкая салфетка; не использовать жёсткую щётку и сильную щёлочь.</li><li>Повторный проход делать после удаления раствора и проверки остаточной влажности. Полностью высушивать между обычными проходами не требуется, но нельзя насыщать наполнитель водой.</li><li>Финальная экстракция, вентиляция и фото после работы.</li></ol></div><div><b>Сушка и риски</b><ul><li>Ориентир сушки: 6–12 часов при вентиляции.</li><li>STOP при переносе красителя, расслаивании экокожи, слабых швах или неизвестном пятне без безопасного теста.</li><li>Не обещать полное удаление старого кофейного пятна до теста.</li><li>Не направлять влагу в электронику сидений, замки ремней и разъёмы.</li></ul></div></div></section>`;
  main.querySelector('#backOrders').addEventListener('click',orders);
  mountClientCommunication(o,{});
  main.querySelector('#demoOrderForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target);o.status=String(f.get('status'));o.risk_level=String(f.get('risk'));o.final_price=+f.get('price')||null;o.worker=String(f.get('worker'));o.appointment=String(f.get('appointment'));o.internal_note=String(f.get('note')||'');const s=main.querySelector('#demoSaveStatus');s.textContent='Сохранено в безопасном предпросмотре';s.className='notice safe';});
}

async function customers(){
  activeView='customers';
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Клиенты</h1><p>История и рекомендации</p></div></div><div class="card empty">Доступно после входа.</div>';return;}
  if(!['OWNER','ADMIN','MANAGER'].includes(currentRole)){main.innerHTML='<div class="notice">Раздел клиентов доступен OWNER, ADMIN и MANAGER.</div>';return;}
  const {data=[],error}=await sb.from('customers').select('*').order('created_at',{ascending:false}).limit(200);
  if(error){window.SIR_ADMIN_RUNTIME?.record(error,'customers.load');showDataLoadError('Клиенты','customers');return;}
  main.innerHTML=`<div class="section-title"><div><h1>Клиенты</h1><p>${data.length} записей</p></div></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Имя</th><th>Телефон</th><th>Реф. код</th><th>Бонус</th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x.name)}</td><td><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></td><td>${esc(x.referral_code||'—')}</td><td>${money(x.credit_balance)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
async function guide(){
  activeView='guide';
  main.innerHTML=`<div class="section-title"><div><h1>Справочник SIR</h1><p>Наш полный рабочий справочник теперь находится прямо в админке</p></div><div class="toolbar"><a class="btn" target="_blank" rel="noopener noreferrer" href="../guide-app/index-v13.html">Открыть отдельно</a><a class="btn primary" href="guide-editor.html">Редактировать знания</a></div></div><div class="guide-rules"><div><b>Один интерфейс</b><span>Полные карточки арсенала, цветовая маркировка и наличие показаны без упрощённой копии.</span></div><div><b>В конкретном заказе</b><span>Рабочая карта использует подтверждённые процедуры и химию из базы.</span></div><div><b>Безопасность</b><span>Неизвестный материал или несовместимость → spot-test либо STOP.</span></div></div><iframe class="guide-frame guide-frame-primary" src="../guide-app/index-v13.html?embedded=admin" scrolling="no" title="Справочник SIR: химия, оборудование и расходники"></iframe>`;
  const frame=main.querySelector('.guide-frame-primary');
  let liveChemicals=[];
  if(!preview&&sb){
    const {data,error}=await sb.from('chemicals').select('*').eq('active',true).order('brand').order('name');
    if(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'guide.live_chemicals');
      frame.insertAdjacentHTML('beforebegin','<div class="notice">Live-база химии временно недоступна. Показана встроенная проверенная копия справочника; изменения склада/карточек не отображаются до восстановления связи.</div>');
    }else liveChemicals=data||[];
  }
  frame.addEventListener('load',()=>{
    if(liveChemicals.length)frame.contentWindow?.postMessage({type:'sir-guide-chemicals',items:liveChemicals},location.origin);
    const fit=()=>{const doc=frame.contentDocument;if(doc)frame.style.height=`${Math.ceil(doc.documentElement.scrollHeight)}px`;};
    fit();
    if(frame.contentDocument?.body&&window.ResizeObserver){const observer=new ResizeObserver(fit);observer.observe(frame.contentDocument.body);frame._guideObserver=observer;}
  });
}
async function inventory(options={}){
  activeView='inventory';
  const demo=[
    {id:'stock-1',brand:'Koch-Chemie',name:'Pol Star',stock_status:'ok',stock_note:'Рабочий запас',hse_status:'source_reviewed',risk_level:'caution'},
    {id:'stock-2',brand:'Koch-Chemie',name:'Green Star',stock_status:'low',stock_note:'Заказать следующую канистру',hse_status:'verified',risk_level:'high_risk'},
    {id:'stock-3',brand:'Gtechniq',name:'W4 Citrus Foam',stock_status:'out',stock_note:'Не использовать до точного SDS',hse_status:'stop_no_exact_sds',risk_level:'stop'}
  ];
  let rows=demo;
  if(!preview&&sb){
    const {data,error}=await sb.from('chemicals').select('id,name,brand,active,stock_status,stock_note,hse_status,risk_level').eq('active',true).order('brand').order('name');
    if(error){main.innerHTML=`<div class="notice error">Не удалось загрузить склад: ${esc(error.message)}</div>`;return;}
    rows=data||[];
  }
  const hseProblem=x=>x.risk_level==='stop'||!['verified','source_reviewed'].includes(x.hse_status);
  const low=rows.filter(x=>x.stock_status==='low').length,out=rows.filter(x=>x.stock_status==='out').length,stops=rows.filter(hseProblem).length;
  const visibleRows=options.hseOnly?rows.filter(hseProblem):rows;
  const hseReason=x=>x.risk_level==='stop'?'STOP: средство заблокировано':!['verified','source_reviewed'].includes(x.hse_status)?`HMS не подтверждён: ${x.hse_status||'unverified'}`:'';
  main.innerHTML=`<div class="section-title"><div><h1>${options.hseOnly?'HMS / STOP — заблокированные средства':'Склад и химия'}</h1><p>${options.hseOnly?'Показаны только средства, которые требуют проверки безопасности или имеют STOP':'Наличие средств и контроль HMS в одном списке'}</p></div><div class="toolbar">${options.hseOnly?'<button class="btn" id="showAllInventory">Показать весь склад</button>':''}<a class="btn" href="guide-editor.html">Карточки химии</a></div></div>
    <div class="control-grid inventory-metrics">
      <div class="card metric"><span>${options.hseOnly?'Показано проблемных':'Всего активных'}</span><strong>${options.hseOnly?visibleRows.length:rows.length}</strong></div>
      <div class="card metric metric-warn"><span>Заканчивается</span><strong>${low}</strong></div>
      <div class="card metric metric-danger"><span>Нет в наличии</span><strong>${out}</strong></div>
      <div class="card metric ${stops?'metric-danger':''}"><span>HMS / STOP</span><strong>${stops}</strong></div>
    </div>
    ${preview?'<div class="notice">Предпросмотр — статусы склада демонстрационные.</div>':''}
    <div class="panel"><div class="panel-head"><span>${options.hseOnly?'Требует проверки безопасности':'Контроль наличия'}</span><span class="mini">${options.hseOnly?visibleRows.length+' средств':'Есть · Заканчивается · Нет'}</span></div>
      ${visibleRows.length?`<div class="table-wrap"><table class="table inventory-table"><thead><tr><th>Средство</th><th>HMS</th>${options.hseOnly?'<th>Причина</th>':''}<th>Наличие</th><th>Заметка</th><th></th></tr></thead><tbody>
      ${visibleRows.map(x=>`<tr data-chemical="${x.id}"><td><b>${esc([x.brand,x.name].filter(Boolean).join(' '))}</b></td><td><span class="risk ${x.risk_level==='stop'?'stop':(x.risk_level||'caution').replace('_','-')}">${esc((x.risk_level||'caution').toUpperCase())}</span><div class="mini">${esc(x.hse_status||'unverified')}</div></td>${options.hseOnly?`<td><b>${esc(hseReason(x))}</b></td>`:''}<td><select class="stock-status" ${canAdmin()&&!preview?'':'disabled'}><option value="ok" ${x.stock_status==='ok'?'selected':''}>Есть</option><option value="low" ${x.stock_status==='low'?'selected':''}>Заканчивается</option><option value="out" ${x.stock_status==='out'?'selected':''}>Нет</option></select></td><td><input class="stock-note" value="${esc(x.stock_note||'')}" placeholder="Например: заказать 1 л" ${canAdmin()&&!preview?'':'disabled'}></td><td>${canAdmin()&&!preview?'<button class="btn save-stock">Сохранить</button>':''}</td></tr>`).join('')}
      </tbody></table></div>`:'<div class="empty">Заблокированных средств нет.</div>'}
    </div>
    ${!canAdmin()&&!preview?'<div class="notice">Менять наличие могут OWNER и ADMIN. Остальные роли видят состояние склада.</div>':''}`;
  main.querySelector('#showAllInventory')?.addEventListener('click',()=>inventory());
    main.querySelectorAll('.save-stock').forEach(btn=>btn.addEventListener('click',async()=>{
    if(!ensureWritable())return;
    const tr=btn.closest('[data-chemical]'),patch={stock_status:tr.querySelector('.stock-status').value,stock_note:tr.querySelector('.stock-note').value.trim()||null};
    btn.disabled=true;
    const {error}=await sb.from('chemicals').update(patch).eq('id',tr.dataset.chemical);
    btn.disabled=false;
    if(error){alert(error.message);return;}
    btn.textContent='Сохранено';
    setTimeout(()=>btn.textContent='Сохранить',1200);
  }));
}

async function team(){
  activeView='team';
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Команда</h1><p>OWNER · ADMIN · MANAGER · WORKER</p></div></div><div class="card empty">Доступно после входа.</div>';return;}
  if(!['OWNER','ADMIN','MANAGER'].includes(currentRole)){main.innerHTML='<div class="notice">Раздел команды доступен OWNER, ADMIN и MANAGER.</div>';return;}
  const {data=[],error}=await sb.from('profiles').select('*').order('created_at');
  if(error){window.SIR_ADMIN_RUNTIME?.record(error,'team.load');showDataLoadError('Команда','team');return;}
  main.innerHTML=`<div class="section-title"><div><h1>Команда</h1><p>Раздельные аккаунты и роли</p></div></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Имя</th><th>Роль</th><th>Активен</th><th></th></tr></thead><tbody>${data.map(p=>`<tr data-profile="${p.id}"><td>${esc(p.display_name||p.id)}</td><td><select class="role" ${canAdmin()?'':'disabled'}>${['owner','admin','manager','worker'].map(r=>`<option value="${r}" ${p.role===r?'selected':''}>${r.toUpperCase()}</option>`).join('')}</select></td><td><input class="active" type="checkbox" ${p.active?'checked':''} ${canAdmin()?'':'disabled'}></td><td>${canAdmin()?'<button class="btn save-profile">Сохранить</button>':''}</td></tr>`).join('')}</tbody></table></div></div><div class="notice">Пароли сотрудников никогда не показываются владельцу. Новый сотрудник создаёт собственный пароль через Supabase Auth.</div>`;
  main.querySelectorAll('.save-profile').forEach(b=>b.addEventListener('click',async()=>{if(!ensureWritable())return;const tr=b.closest('[data-profile]'),id=tr.dataset.profile,role=tr.querySelector('.role').value,active=tr.querySelector('.active').checked;const {error}=await sb.from('profiles').update({role,active}).eq('id',id);if(error)alert(error.message);else alert('Сохранено');}));
}
async function audit(){
  activeView='audit';
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Журнал</h1><p>Кто и что изменил</p></div></div><div class="card empty">Доступно после входа.</div>';return;}
  if(!canAdmin()){main.innerHTML='<div class="notice">Журнал действий доступен только OWNER и ADMIN.</div>';return;}
  const {data=[],error}=await sb.from('audit_events').select('*').order('created_at',{ascending:false}).limit(300);
  if(error){window.SIR_ADMIN_RUNTIME?.record(error,'audit.load');showDataLoadError('Журнал действий','audit');return;}
  main.innerHTML=`<div class="section-title"><div><h1>Журнал</h1><p>Критические изменения</p></div></div><div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Время</th><th>Событие</th><th>Объект</th><th>Пользователь</th></tr></thead><tbody>${data.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString('ru')}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)} ${esc(x.entity_id||'')}</td><td>${esc(x.actor_email||x.actor_id||'—')}</td></tr>`).join('')}</tbody></table></div></div>`;
}

async function settings(){
  activeView='settings';
  if(preview||!sb){main.innerHTML='<div class="section-title"><div><h1>Настройки</h1><p>Предпросмотр</p></div></div><div class="card empty">Реальные настройки сохраняются только в базе.</div>';return;}
  if(!canAdmin()){main.innerHTML='<div class="notice">Настройки доступны только OWNER и ADMIN.</div>';return;}
  const [priceRes,settingsRes]=await Promise.all([sb.from('price_rules').select('*').order('service_code').order('size_key'),sb.from('app_settings').select('*').order('key')]);
  const loadError=priceRes.error||settingsRes.error;
  if(loadError){window.SIR_ADMIN_RUNTIME?.record(loadError,'settings.load');showDataLoadError('Настройки','settings');return;}
  const prices=priceRes.data||[],settingsRows=settingsRes.data||[];
  const map=Object.fromEntries(settingsRows.map(x=>[x.key,x.value||{}])),company=map.company||{},travel=map.travel||{},ref=map.referral||{},work=map.work_rules||{};
  main.innerHTML=`<div class="section-title"><div><h1>Настройки</h1><p>Изменения применяются к сайту без редактирования кода</p></div></div>${canAdmin()?'':'<div class="notice">Изменять настройки могут OWNER и ADMIN.</div>'}<form id="settingsForm"><div class="settings-grid"><div class="card"><h3>Компания</h3>${input('phone_primary','Основной телефон',company.phone_primary||C.phonePrimary)}${input('phone_secondary','Второй телефон',company.phone_secondary||C.phoneSecondary)}${input('radius_km','Радиус, км',company.radius_km||40,'number')}${input('review_url','Ссылка для отзыва (Google / сайт)',company.review_url||'','url')}<div class="mini">Если ссылка пустая, SMS попросит клиента ответить оценкой 1–5.</div></div><div class="card"><h3>Выезд</h3>${input('travel_0_10','0–10 км',travel['0_10']??0,'number')}${input('travel_11_20','11–20 км',travel['11_20']??150,'number')}${input('travel_21_30','21–30 км',travel['21_30']??250,'number')}${input('travel_31_40','31–40 км',travel['31_40']??350,'number')}${input('minimum_mobile_order','Минимальный выездной заказ',travel.minimum_mobile_order??750,'number')}</div><div class="card"><h3>Рекомендации</h3>${input('referrer_credit','Бонус рекомендателю',ref.referrer_credit??200,'number')}${input('new_customer_discount','Скидка новому клиенту',ref.new_customer_discount??100,'number')}${input('ref_minimum_order','Минимальный заказ',ref.minimum_order??750,'number')}</div><div class="card"><h3>Рабочее время</h3>${input('working_day_start','Начало',work.working_day_start||'08:00','time')}${input('working_day_end','Конец',work.working_day_end||'20:00','time')}${input('default_buffer_minutes','Буфер между работами, мин.',work.default_buffer_minutes??30,'number')}</div></div><div class="panel"><div class="panel-head">Стартовые цены</div><div class="table-wrap"><table class="table"><thead><tr><th>Услуга</th><th>Размер</th><th>Лёгкое</th><th>Среднее</th><th>Сильное</th></tr></thead><tbody>${prices.map(p=>`<tr data-price="${p.id}"><td>${esc(p.service_code)}</td><td>${esc(p.size_key)}</td><td><input class="p-light" type="number" min="0" value="${p.light_price??''}"></td><td><input class="p-medium" type="number" min="0" value="${p.medium_price??''}"></td><td><input class="p-heavy" type="number" min="0" value="${p.heavy_price??''}"></td></tr>`).join('')}</tbody></table></div></div>${canAdmin()?'<button class="btn primary save-settings" type="submit">Сохранить все настройки</button>':''}</form>`;
  if(!canAdmin())return;
  main.querySelector('#settingsForm').addEventListener('submit',async e=>{
    e.preventDefault();if(!ensureWritable())return;const f=new FormData(e.target),updates=[
      ['company',{...company,phone_primary:String(f.get('phone_primary')),phone_secondary:String(f.get('phone_secondary')),radius_km:+f.get('radius_km'),review_url:safeHttpUrl(f.get('review_url'))||null}],
      ['travel',{'0_10':+f.get('travel_0_10'),'11_20':+f.get('travel_11_20'),'21_30':+f.get('travel_21_30'),'31_40':+f.get('travel_31_40'),minimum_mobile_order:+f.get('minimum_mobile_order')}],
      ['referral',{referrer_credit:+f.get('referrer_credit'),new_customer_discount:+f.get('new_customer_discount'),minimum_order:+f.get('ref_minimum_order')}],
      ['work_rules',{working_day_start:String(f.get('working_day_start')),working_day_end:String(f.get('working_day_end')),default_buffer_minutes:+f.get('default_buffer_minutes')}]
    ];
    const settingsPayload=Object.fromEntries(updates);
    const pricesPayload=[...main.querySelectorAll('[data-price]')].map(tr=>({
      id:tr.dataset.price,
      light_price:numOrNull(tr.querySelector('.p-light').value),
      medium_price:numOrNull(tr.querySelector('.p-medium').value),
      heavy_price:numOrNull(tr.querySelector('.p-heavy').value)
    }));
    const submit=e.currentTarget.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
    const {error}=await sb.rpc('save_admin_settings_bundle',{p_settings:settingsPayload,p_prices:pricesPayload});
    if(submit)submit.disabled=false;
    if(error){window.SIR_ADMIN_RUNTIME?.record(error,'settings.atomic_save');alert('Не удалось сохранить настройки. Все изменения отменены — частичного сохранения нет.');return;}
    alert('Настройки сохранены атомарно. Клиентский калькулятор получит новые цены автоматически.');settings();
  });
}
function input(name,label,value,type='text'){return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}"></div>`;}
function numOrNull(v){const s=String(v??'').trim();return s===''?null:+s;}
function localDate(v){if(!v)return'';const d=v instanceof Date?v:new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function toLocalParts(v){const d=new Date(v);return{date:localDate(d),time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};}

if(sb){sb.auth.getSession().then(async({data})=>{if(data.session){const {data:p}=await sb.from('profiles').select('role,active').eq('id',data.session.user.id).single();if(p?.active){currentRole=(p.role||'worker').toUpperCase();enter(currentRole);}}});}
})();
