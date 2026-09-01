(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('calendarApp');
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const statusLabel={new:'Новый',under_review:'На рассмотрении',offer_sent:'Предложение отправлено',awaiting_confirmation:'Ждёт подтверждения',confirmed:'Подтверждён',scheduled:'Запланирован',in_progress:'В работе',completed:'Выполнен',customer_requested_new_time:'Нужно другое время',cancelled_customer:'Отменён клиентом',cancelled_sir:'Отменён SIR',no_show:'Неявка'};
  let session,profile,cursor=new Date(),appointments=[],orders=[],work={start:'08:00',end:'20:00',buffer:30};
  cursor.setDate(1);cursor.setHours(12,0,0,0);
  init();

  async function init(){
    const {data:{session:s}}=await sb.auth.getSession();session=s;
    if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>.</div>';return;}
    const {data:p}=await sb.from('profiles').select('role,active').eq('id',session.user.id).single();profile=p;
    if(!profile?.active||!['owner','admin','manager'].includes(profile.role)){root.innerHTML='<div class="notice">Календарь управления доступен OWNER, ADMIN и MANAGER.</div>';return;}
    await load();render();
  }

  function monthBounds(){const start=new Date(cursor.getFullYear(),cursor.getMonth(),1,0,0,0,0);const end=new Date(cursor.getFullYear(),cursor.getMonth()+1,1,0,0,0,0);return{start,end};}
  async function load(){
    const {start,end}=monthBounds();
    const [{data:a=[],error:ae},{data:o=[]},{data:s=[]}]=await Promise.all([
      sb.from('appointments').select('id,order_id,starts_at,ends_at,tentative,location_mode,address,buffer_minutes,orders!inner(id,order_no,customer_name,phone,status,service_type,estimated_minutes,address,final_price,preliminary_price)').lt('starts_at',end.toISOString()).gt('ends_at',start.toISOString()).order('starts_at'),
      sb.from('orders').select('id,order_no,customer_name,phone,status,service_type,estimated_minutes,address,preliminary_price,final_price').not('status','in','(completed,cancelled_customer,cancelled_sir,no_show)').order('created_at',{ascending:false}).limit(300),
      sb.from('app_settings').select('value').eq('key','work_rules')
    ]);
    if(ae){root.innerHTML=`<div class="notice">Ошибка календаря: ${esc(ae.message)}</div>`;return;}
    appointments=a;orders=o;
    const v=s?.[0]?.value||{};work={start:v.working_day_start||'08:00',end:v.working_day_end||'20:00',buffer:+v.default_buffer_minutes||30};
  }

  function render(){
    const title=cursor.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
    root.innerHTML=`<div class="cal-head"><div><div class="cal-month">${title[0].toUpperCase()+title.slice(1)}</div><div class="mini">Рабочий день ${work.start}–${work.end} · буфер ${work.buffer} мин</div></div><div class="toolbar"><button class="btn" id="prev">←</button><button class="btn" id="today">Сегодня</button><button class="btn" id="next">→</button><a class="btn" href="./">Заказы</a></div></div><div class="legend"><span><i style="background:#62d494"></i>свободно</span><span><i style="background:#f5c861"></i>ожидает подтверждения</span><span><i style="background:#40a8d0"></i>подтверждено</span><span><i style="background:#b895ff"></i>в работе</span><span><i style="background:#8c969b"></i>выполнено</span><span><i style="background:#ff7272"></i>отмена/проблема</span></div><div class="cal-week">${['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(x=>`<div class="cal-dow">${x}</div>`).join('')}${calendarCells()}</div>`;
    document.getElementById('prev').onclick=()=>move(-1);document.getElementById('next').onclick=()=>move(1);document.getElementById('today').onclick=async()=>{cursor=new Date();cursor.setDate(1);cursor.setHours(12,0,0,0);await reload();};
    root.querySelectorAll('.cal-free').forEach(b=>b.addEventListener('click',()=>openFree(b.dataset.date,b.dataset.start,b.dataset.end)));
    root.querySelectorAll('.cal-event').forEach(b=>b.addEventListener('click',()=>openEvent(b.dataset.id)));
  }
  async function move(n){cursor=new Date(cursor.getFullYear(),cursor.getMonth()+n,1,12);await reload();}
  async function reload(){root.innerHTML='<div class="empty">Обновляю календарь…</div>';await load();render();}

  function calendarCells(){
    const y=cursor.getFullYear(),m=cursor.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset,12);let html='';
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);const same=d.getMonth()===m,key=localDate(d),dayEvents=appointments.filter(a=>localDate(new Date(a.starts_at))===key);const free=same?freeWindows(d,dayEvents):[];
      html+=`<div class="cal-cell ${same?'':'other'}"><div class="cal-date">${d.getDate()} ${['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'][d.getDay()]}</div>${dayEvents.map(eventHtml).join('')}${free.map(w=>`<button class="cal-free" data-date="${key}" data-start="${w.start}" data-end="${w.end}">Свободно ${w.start}–${w.end}</button>`).join('')}</div>`;
    }return html;
  }
  function eventHtml(a){const o=a.orders||{},cls=a.tentative?'tentative':o.status||'';return`<button class="cal-event ${esc(cls)}" data-id="${a.id}"><b>${hm(a.starts_at)}–${hm(a.ends_at)}</b> · ${esc(o.order_no||'заказ')}<br>${esc(o.customer_name||'')} · ${esc(statusLabel[o.status]||o.status||'')}</button>`;}
  function freeWindows(day,events){
    const ds=atTime(day,work.start),de=atTime(day,work.end),active=events.filter(a=>!['cancelled_customer','cancelled_sir','no_show'].includes(a.orders?.status)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));let cursorTime=ds.getTime(),out=[];
    for(const a of active){const nextStart=new Date(a.starts_at).getTime()-Math.max(work.buffer,+a.buffer_minutes||0)*60000;if(nextStart-cursorTime>=60*60000)out.push(win(cursorTime,nextStart));cursorTime=Math.max(cursorTime,new Date(a.ends_at).getTime()+Math.max(work.buffer,+a.buffer_minutes||0)*60000);}
    if(de.getTime()-cursorTime>=60*60000)out.push(win(cursorTime,de.getTime()));return out;
  }
  const win=(s,e)=>({start:clock(new Date(s)),end:clock(new Date(e))});

  function openFree(date,start,end){
    const scheduledIds=new Set(appointments.map(a=>a.order_id));const available=orders.filter(o=>!scheduledIds.has(o.id));
    if(!available.length){dialog(`<h2>Свободное окно ${start}–${end}</h2><p>Нет незапланированных активных заказов. Сначала создайте/получите заказ.</p>`,`<a class="btn primary" href="./">Открыть заказы</a>`);return;}
    const maxMinutes=Math.max(60,minutesBetween(start,end));
    const options=available.map(o=>`<option value="${o.id}" data-minutes="${+o.estimated_minutes||120}" data-address="${esc(o.address||'')}">${esc(o.order_no)} · ${esc(o.customer_name)} · ${esc(o.service_type)}</option>`).join('');
    dialog(`<h2>Запланировать работу</h2><div class="field"><label>Заказ</label><select id="calOrder">${options}</select></div><div class="field"><label>Начало</label><input id="calStart" type="datetime-local" value="${date}T${start}"></div><div class="field"><label>Длительность, мин</label><input id="calDuration" type="number" min="30" step="15" max="720"></div><div class="field"><label>Формат</label><select id="calMode"><option value="mobile">SIR приезжает к клиенту</option><option value="shop">Клиент приезжает к SIR</option><option value="other">Другое место</option></select></div><div class="field"><label>Адрес / место</label><input id="calAddress"></div><div class="notice safe">Слот создаётся как временный. После отправки предложения клиент подтверждает его по персональной ссылке.</div>`,`<button class="btn" data-close>Отмена</button><button class="btn primary" id="calSave">Сохранить временный слот</button>`);
    const sel=document.getElementById('calOrder'),dur=document.getElementById('calDuration'),addr=document.getElementById('calAddress');
    const sync=()=>{const opt=sel.selectedOptions[0];dur.value=Math.min(maxMinutes,+opt.dataset.minutes||120);addr.value=opt.dataset.address||'';};sync();sel.onchange=sync;document.getElementById('calSave').onclick=saveBooking;
  }
  async function saveBooking(){
    const orderId=document.getElementById('calOrder').value,startVal=document.getElementById('calStart').value,duration=Math.max(30,+document.getElementById('calDuration').value||120),mode=document.getElementById('calMode').value,address=document.getElementById('calAddress').value.trim();if(!orderId||!startVal)return;
    const start=new Date(startVal),end=new Date(start.getTime()+duration*60000),button=document.getElementById('calSave');button.disabled=true;button.textContent='Сохраняю…';
    const {error}=await sb.from('appointments').insert({order_id:orderId,starts_at:start.toISOString(),ends_at:end.toISOString(),tentative:true,location_mode:mode,address:address||null,buffer_minutes:work.buffer,created_by:session.user.id});
    if(error){alert(error.message);button.disabled=false;button.textContent='Сохранить временный слот';return;}
    const row=orders.find(o=>o.id===orderId);if(row&&row.status==='new')await sb.from('orders').update({status:'under_review'}).eq('id',orderId);
    closeDialog();await reload();
  }
  function openEvent(id){const a=appointments.find(x=>x.id===id);if(!a)return;const o=a.orders||{};dialog(`<h2>${esc(o.order_no||'Заказ')}</h2><div class="status-row"><b>${esc(o.customer_name||'')}</b><div class="mini">${esc(o.phone||'')}</div></div><p><b>${hm(a.starts_at)}–${hm(a.ends_at)}</b> · ${esc(statusLabel[o.status]||o.status||'')}</p><p>${a.tentative?'Временный слот — клиент ещё не подтвердил.':'Слот подтверждён.'}</p><p>${esc(a.address||o.address||'')}</p><p>Оценка времени: ${+o.estimated_minutes||'—'} мин · Цена: ${o.final_price??o.preliminary_price??'—'} NOK</p>`,`<button class="btn" data-close>Закрыть</button><a class="btn" href="tel:${esc(o.phone||'')}">Позвонить</a><a class="btn primary" href="./?order=${encodeURIComponent(o.id)}">Открыть заказ</a>`);}
  function dialog(content,actions){const back=document.createElement('div');back.className='dialog-back';back.id='calDialog';back.innerHTML=`<div class="dialog">${content}<div class="dialog-actions">${actions}</div></div>`;document.body.appendChild(back);back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-close]'))closeDialog();});}
  function closeDialog(){document.getElementById('calDialog')?.remove();}
  function atTime(day,hhmm){const [h,m]=hhmm.split(':').map(Number);return new Date(day.getFullYear(),day.getMonth(),day.getDate(),h,m,0,0);}
  function localDate(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function clock(d){return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
  function hm(v){return clock(new Date(v));}
  function minutesBetween(a,b){const [ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number);return bh*60+bm-ah*60-am;}
})();
