(() => {
  const C=window.SIR_CONFIG;
  const state={service:null,step:0,language:'ru',data:{},files:[]};
  const rules={};
  const T={
    ru:{back:'Назад',next:'Далее',send:'Отправить заявку',light:'Лёгкое',medium:'Среднее',heavy:'Сильное',special:'Особое состояние',prelim:'Предварительная цена',manual:'Оценка после фото',received:'Заявка получена'},
    no:{back:'Tilbake',next:'Neste',send:'Send forespørsel',light:'Lett',medium:'Middels',heavy:'Kraftig',special:'Spesiell tilstand',prelim:'Foreløpig pris',manual:'Vurderes etter bilder',received:'Forespørselen er mottatt'},
    en:{back:'Back',next:'Next',send:'Send request',light:'Light',medium:'Medium',heavy:'Heavy',special:'Special condition',prelim:'Preliminary price',manual:'Review after photos',received:'Request received'}
  };
  const t=k=>T[state.language][k]||T.ru[k]||k;
  const services={car:{title:'Салон автомобиля'},sofa:{title:'Диван'},chair:{title:'Кресло'},mattress:{title:'Матрас'}};
  const elementDefs=[
    ['seat','Сиденья','Количество выбранных сидений'],
    ['ceiling','Потолок','Деликатная зона: минимальное увлажнение'],
    ['floor_carpet','Пол / ковролин','Глубокая экстракционная очистка'],
    ['trunk','Багажник','Пол и текстиль багажника'],
    ['door_cards','4 дверные карты','Комплект дверей'],
    ['dashboard_console','Панель + консоль','Очистка интерьерных поверхностей'],
    ['interior_plastic','Весь внутренний пластик','Пластиковые элементы салона'],
    ['textile_mats','4 текстильных коврика','Комплект ковриков'],
    ['seat_belt','Ремни безопасности','Количество ремней'],
    ['interior_glass','Стёкла внутри','Все внутренние стёкла'],
    ['child_seat','Детское кресло','Отдельная безопасная очистка']
  ];
  const cards=[...document.querySelectorAll('.service-card')];
  const configReady=loadRemoteConfig();

  cards.forEach(card=>card.querySelector('.service-head').addEventListener('click',async()=>{await configReady;openService(card.dataset.service);}));
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{state.language=b.dataset.lang;document.querySelectorAll('[data-lang]').forEach(x=>x.classList.toggle('active',x===b));if(state.service)render();}));

  async function loadRemoteConfig(){
    if(!C.supabaseUrl||!C.supabasePublishableKey)return;
    const h={apikey:C.supabasePublishableKey};
    try{
      const [pr,st]=await Promise.all([
        fetch(`${C.supabaseUrl}/rest/v1/price_rules?active=eq.true&select=service_code,size_key,light_price,medium_price,heavy_price,metadata`,{headers:h}),
        fetch(`${C.supabaseUrl}/rest/v1/app_settings?key=in.(company,travel,referral)&select=key,value`,{headers:h})
      ]);
      if(pr.ok){
        const rows=await pr.json();
        for(const r of rows){
          (rules[r.service_code]??={})[r.size_key]={light:num(r.light_price),medium:num(r.medium_price),heavy:num(r.heavy_price),metadata:r.metadata||{}};
          const v=rules[r.service_code][r.size_key];
          if(r.service_code==='full_interior')C.pricing.fullInterior[r.size_key]=v;
          else if(r.service_code==='ceiling')C.pricing.ceiling[r.size_key]=v;
          else if(r.service_code==='sofa')C.pricing.sofa[r.size_key]=v;
          else if(r.service_code==='armchair')C.pricing.armchair=v;
          else if(r.service_code==='mattress_single')C.pricing.mattressSingle=v;
          else if(r.service_code==='mattress_double')C.pricing.mattressDouble=v;
          else if(r.service_code==='seat')C.pricing.seat={...C.pricing.seat,...v};
        }
      }
      if(st.ok){
        for(const r of await st.json()){
          const v=r.value||{};
          if(r.key==='company'){
            C.radiusKm=num(v.radius_km)||C.radiusKm;C.phonePrimary=v.phone_primary||C.phonePrimary;C.phoneSecondary=v.phone_secondary||C.phoneSecondary;
          }else if(r.key==='travel'){
            C.pricing.travel=[{maxKm:10,price:num(v['0_10'])},{maxKm:20,price:num(v['11_20'])},{maxKm:30,price:num(v['21_30'])},{maxKm:40,price:num(v['31_40'])}];
            C.pricing.minimumMobileOrder=num(v.minimum_mobile_order)||C.pricing.minimumMobileOrder;
          }else if(r.key==='referral'){
            C.referral.referrerCredit=num(v.referrer_credit)||C.referral.referrerCredit;C.referral.newCustomerDiscount=num(v.new_customer_discount)||C.referral.newCustomerDiscount;C.referral.minimumOrder=num(v.minimum_order)||C.referral.minimumOrder;
          }
        }
      }
    }catch(e){console.warn('SIR catalog fallback',e);}
  }

  function openService(service){state.service=service;state.step=0;state.data={service};state.files=[];cards.forEach(c=>c.classList.toggle('open',c.dataset.service===service));render();document.querySelector(`.service-card[data-service="${service}"]`).scrollIntoView({behavior:'smooth',block:'start'});}
  function steps(){
    if(state.service==='car')return [carVehicle,carPackage,condition,...(state.data.package==='elements'?[carElements]:[]),issues,contact,summary];
    if(state.service==='sofa')return [sofaSize,condition,issues,contact,summary];
    if(state.service==='chair')return [chairType,condition,issues,contact,summary];
    return [mattressType,condition,issues,contact,summary];
  }
  function render(){
    const root=currentRoot();if(!root)return;const s=steps();state.step=Math.max(0,Math.min(state.step,s.length-1));
    root.innerHTML=`<div class="wizard"><div class="progress"><span style="width:${((state.step+1)/s.length)*100}%"></span></div><div id="step"></div><div class="wizard-actions"><button class="btn ghost" id="prev" ${state.step===0?'disabled':''}>← ${t('back')}</button><button class="btn primary" id="next">${state.step===s.length-1?t('send'):t('next')} →</button></div></div>`;
    s[state.step](root.querySelector('#step'));
    root.querySelector('#prev').addEventListener('click',()=>{capture();state.step--;render();});
    root.querySelector('#next').addEventListener('click',async()=>{if(!capture(true)||!validateCurrent(s[state.step]))return;if(state.step===s.length-1)await submit();else{state.step++;render();}});
  }
  function currentRoot(){return document.querySelector(`.service-card[data-service="${state.service}"] .service-body`);}
  function capture(validate=false){
    const root=currentRoot();if(!root)return false;
    root.querySelectorAll('input,select,textarea').forEach(el=>{if(el.type==='file')return;if(el.type==='radio'){if(el.checked)state.data[el.name]=el.value;}else if(el.type==='checkbox')state.data[el.name]=el.checked;else state.data[el.name]=el.value;});
    if(validate){for(const el of root.querySelectorAll('[required]')){if(el.type==='radio'){if(!root.querySelector(`[name="${el.name}"]:checked`)){alert('Заполните обязательный выбор');return false;}}else if(!String(el.value||'').trim()){el.focus();return false;}}}
    return true;
  }
  function validateCurrent(fn){if(fn===carElements&&buildItems().length===0){alert('Выберите хотя бы один элемент салона.');return false;}return true;}
  const choice=(name,value,title,sub,checked=false)=>`<div class="choice"><input type="radio" id="${name}-${value}" name="${name}" value="${value}" ${checked?'checked':''} required><label for="${name}-${value}"><b>${title}</b><small>${sub||''}</small></label></div>`;
  const check=(name,title,sub,checked=false)=>`<div class="choice"><input type="checkbox" id="${name}" name="${name}" ${checked?'checked':''}><label for="${name}"><b>${title}</b><small>${sub||''}</small></label></div>`;

  function carVehicle(el){el.innerHTML=`<div class="step-title">Ваш автомобиль</div><div class="step-help">Укажите регномер и размер салона. Перед работой данные можно проверить и исправить.</div><div class="field"><label>Регистрационный номер</label><input name="plate" value="${esc(state.data.plate||'')}" placeholder="AB12345" autocomplete="off"></div><div class="choice-grid">${[5,7,9].map(n=>choice('seats',n,`${n} мест`,'Размер салона',String(state.data.seats||'5')===String(n))).join('')}</div>`;}
  function carPackage(el){
    const p=state.data.package||'full';
    el.innerHTML=`<div class="step-title">Что чистим?</div><div class="step-help">Полный салон специально выгоднее суммы отдельных зон.</div><div class="choice-grid">${choice('package','full','Полный салон','Сиденья, потолок, пол, багажник, двери, пластик, коврики и стекла',p==='full')}${choice('package','seats','Все сиденья','Расчёт по количеству мест',p==='seats')}${choice('package','elements','Выбрать отдельные элементы','Соберите только нужные зоны',p==='elements')}</div>`;
  }
  function condition(el){const cur=state.data.condition||'medium';el.innerHTML=`<div class="step-title">Степень загрязнения</div><div class="step-help">Минимальная цена — один полноценный щадящий цикл. Чем сложнее состояние, тем больше этапов и времени.</div><div class="choice-grid">${choice('condition','light',t('light'),'Один щадящий основной цикл',cur==='light')}${choice('condition','medium',t('medium'),'Предобработка + основной проход + локальный повтор',cur==='medium')}${choice('condition','heavy',t('heavy'),'Многоэтапная глубокая очистка',cur==='heavy')}${choice('condition','special',t('special'),'Сначала фото и оценка риска',cur==='special')}</div>`;}
  function carElements(el){
    const level=state.data.condition||'medium',seats=String(state.data.seats||5),seatMax=+seats;
    const price=(code,size='default')=>fmt(rule(code,size,level));
    el.innerHTML=`<div class="step-title">Выберите элементы</div><div class="step-help">Цены ниже уже учитывают выбранную степень загрязнения. Итог ещё проверит менеджер по фото.</div><div class="choice-grid">${check('el_seat','Сиденья',`от ${price('seat')} / место`,state.data.el_seat)}${check('el_ceiling','Потолок',price('ceiling',seats),state.data.el_ceiling)}${check('el_floor_carpet','Пол / ковролин',price('floor_carpet',seats),state.data.el_floor_carpet)}${check('el_trunk','Багажник',price('trunk',seatMax>=9?'large':'standard'),state.data.el_trunk)}${check('el_door_cards','4 дверные карты',price('door_cards','4'),state.data.el_door_cards)}${check('el_dashboard_console','Панель + консоль',price('dashboard_console'),state.data.el_dashboard_console)}${check('el_interior_plastic','Весь внутренний пластик',price('interior_plastic'),state.data.el_interior_plastic)}${check('el_textile_mats','4 текстильных коврика',price('textile_mats','4'),state.data.el_textile_mats)}${check('el_seat_belt','Ремни безопасности',`${price('seat_belt','1')} / шт.`,state.data.el_seat_belt)}${check('el_interior_glass','Стёкла внутри',price('interior_glass'),state.data.el_interior_glass)}${check('el_child_seat','Детское кресло',price('child_seat'),state.data.el_child_seat)}</div><div class="settings-grid"><div class="field"><label>Сколько сидений чистим</label><input name="seat_qty" type="number" min="1" max="${seatMax}" value="${Math.min(seatMax,Math.max(1,+state.data.seat_qty||1))}"></div><div class="field"><label>Сколько ремней</label><input name="belt_qty" type="number" min="1" max="${seatMax}" value="${Math.min(seatMax,Math.max(1,+state.data.belt_qty||1))}"></div></div><div id="element-live" class="notice safe"></div>`;
    const refresh=()=>{capture();const c=calc();const full=rule('full_interior',seats,level);let text=c.manual?'Цена после фото':`Выбранные элементы: ${fmt(c.base)}`;if(!c.manual&&full!=null&&c.base>=full-300){const diff=c.base-full;text+=diff>=0?` · Полный салон дешевле на ${fmt(diff)}`:` · Полный салон всего на ${fmt(-diff)} дороже`; }el.querySelector('#element-live').textContent=text;};
    el.querySelectorAll('input').forEach(i=>i.addEventListener('change',refresh));refresh();
  }
  function issues(el){
    el.innerHTML=`<div class="step-title">Что ещё заметно?</div><div class="step-help">Пятна входят в обычную работу соответствующей зоны. Сильная шерсть и запах увеличивают время и могут изменить цену.</div><div class="choice-grid">${check('stains','Пятна','Старые или заметные',state.data.stains)}${check('hair','Шерсть','Домашние животные',state.data.hair)}${check('odor','Запах','Нужно работать с источником, а не маскировать',state.data.odor)}</div><div class="field"><label>Комментарий</label><textarea name="comment" placeholder="Опишите сложные места">${esc(state.data.comment||'')}</textarea></div><div class="field"><label>Фото — до 5 шт.</label><input id="photos-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple><div id="photo-status" class="status-line">${state.files.length?`Выбрано: ${state.files.length}`:'Фото хранятся приватно и видны только сотрудникам SIR.'}</div></div>`;
    const input=el.querySelector('#photos-input'),status=el.querySelector('#photo-status');input.addEventListener('change',()=>{const valid=[...input.files].filter(f=>/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)&&f.size>0&&f.size<=10*1024*1024).slice(0,5);state.files=valid;status.textContent=valid.length?`Выбрано фотографий: ${valid.length}`:'Подходящие фотографии не выбраны.';});
  }
  function contact(el){el.innerHTML=`<div class="step-title">Контакт и выезд</div><div class="field"><label>Имя</label><input name="customer_name" required value="${esc(state.data.customer_name||'')}" autocomplete="name"></div><div class="field"><label>Телефон</label><input name="phone" required inputmode="tel" value="${esc(state.data.phone||'')}" autocomplete="tel"></div><div class="field"><label>Адрес / район</label><input name="address" value="${esc(state.data.address||'')}" autocomplete="street-address"></div><div class="field"><label>Расстояние от Kongsberg, км</label><input name="distance_km" type="number" min="0" max="100" value="${esc(state.data.distance_km||0)}"></div><div class="notice safe">Выезд 0–10 км — бесплатно. 11–40 км рассчитывается автоматически. Дальше 40 км — только по согласованию.</div>`;}
  function sofaSize(el){const cur=String(state.data.size||3);el.innerHTML=`<div class="step-title">Размер дивана</div><div class="choice-grid">${[2,3,4,5].map(n=>choice('size',n,`${n} места`,'Количество посадочных мест',cur===String(n))).join('')}</div>`;}
  function chairType(el){el.innerHTML=`<div class="step-title">Тип кресла</div>${choice('size','armchair','Кресло','Мягкое кресло',true)}`;}
  function mattressType(el){const cur=state.data.size||'double';el.innerHTML=`<div class="step-title">Матрас</div><div class="choice-grid">${choice('size','single','Односпальный','Одна сторона',cur==='single')}${choice('size','double','Двуспальный','Одна сторона',cur==='double')}</div>`;}

  function buildItems(){
    if(state.service!=='car'||state.data.package!=='elements')return[];
    const seats=String(state.data.seats||5),n=+seats,items=[];
    const add=(flag,code,size='default',qty=1)=>{if(state.data[flag])items.push({code,size_key:size,quantity:Math.max(1,+qty||1)});};
    add('el_seat','seat','default',Math.min(n,+state.data.seat_qty||1));add('el_ceiling','ceiling',seats);add('el_floor_carpet','floor_carpet',seats);add('el_trunk','trunk',n>=9?'large':'standard');add('el_door_cards','door_cards','4');add('el_dashboard_console','dashboard_console');add('el_interior_plastic','interior_plastic');add('el_textile_mats','textile_mats','4');add('el_seat_belt','seat_belt','1',Math.min(n,+state.data.belt_qty||1));add('el_interior_glass','interior_glass');add('el_child_seat','child_seat');return items;
  }
  function rule(code,size,level){const r=rules[code]?.[String(size)]||rules[code]?.default;if(r&&r[level]!=null)return num(r[level]);if(code==='full_interior')return num(C.pricing.fullInterior[String(size)]?.[level]);if(code==='ceiling')return num(C.pricing.ceiling[String(size)]?.[level]);if(code==='sofa')return num(C.pricing.sofa[String(size)]?.[level]);if(code==='armchair')return num(C.pricing.armchair[level]);if(code==='mattress_single')return num(C.pricing.mattressSingle[level]);if(code==='mattress_double')return num(C.pricing.mattressDouble[level]);if(code==='seat'){const b=num(C.pricing.seat.light);return b+(level==='medium'?50:level==='heavy'?100:0);}return null;}
  function seatTotal(qty,level){let total=0;for(let i=1;i<=qty;i++){total+=i===4||i===7||i===8?(rule('seat_discounted','default',level)??(150+(level==='medium'?50:level==='heavy'?100:0))):(rule('seat','default',level)??0);}return total;}
  function calc(){
    const d=state.data,level=d.condition||'medium',travel=travelPrice(+d.distance_km||0);if(level==='special'||travel===null)return{manual:true,base:null,travel,price:null};let base=0;
    if(state.service==='car'){
      const seats=String(d.seats||5),pkg=d.package||'full';
      if(pkg==='full')base=rule('full_interior',seats,level)||0;
      else if(pkg==='seats')base=seatTotal(+seats,level);
      else for(const it of buildItems()){base+=it.code==='seat'?seatTotal(it.quantity,level):(rule(it.code,it.size_key,level)||0)*it.quantity;}
    }else if(state.service==='sofa')base=rule('sofa',String(d.size||3),level)||0;
    else if(state.service==='chair')base=rule('armchair','default',level)||0;
    else base=rule(d.size==='single'?'mattress_single':'mattress_double','default',level)||0;
    if(d.hair)base+=rule('extra_pet_hair','default',level)??(level==='heavy'?350:200);
    if(d.odor)base+=rule('extra_odor','default',level)??(level==='heavy'?350:250);
    return{manual:false,base,travel,price:base+travel};
  }
  function travelPrice(km){for(const r of C.pricing.travel){if(km<=r.maxKm)return num(r.price);}return null;}
  function estimatedTime(){const d=state.data,level=d.condition||'medium';let h=2;if(state.service==='car'){if(d.package==='full'||!d.package)h=4;else if(d.package==='seats')h=2.5;else{const items=buildItems();h=Math.max(1.25,items.reduce((s,it)=>s+({seat:.35,ceiling:1,floor_carpet:1,trunk:.55,door_cards:.65,dashboard_console:.45,interior_plastic:.65,textile_mats:.35,seat_belt:.12,interior_glass:.25,child_seat:.5}[it.code]||.4)*(it.code==='seat'||it.code==='seat_belt'?it.quantity:1),0));}}if(level==='light')h*=.82;if(level==='heavy')h*=1.35;if(d.hair)h+=.5;if(d.odor)h+=.5;const lo=Math.max(1,Math.round(h*4)/4),hi=Math.round((lo+.75)*4)/4;return`${lo.toLocaleString('ru-RU')}–${hi.toLocaleString('ru-RU')} ч`;}
  function summary(el){
    const c=calc(),level=state.data.condition||'medium',seats=String(state.data.seats||5);let packageHint='';
    if(state.service==='car'&&state.data.package==='elements'&&!c.manual){const full=rule('full_interior',seats,level);if(full!=null&&c.base>=full-300){const diff=c.base-full;packageHint=`<div class="notice safe"><b>Выгоднее полный салон:</b> ${diff>=0?`он дешевле выбранных элементов на ${fmt(diff)}`:`доплата только ${fmt(-diff)}`}. Полный пакет включает все основные зоны.</div>`;}}
    const items=buildItems();
    el.innerHTML=`<div class="step-title">План и предварительный расчёт</div><div class="summary"><div class="summary-row"><span>Услуга</span><b>${services[state.service].title}</b></div><div class="summary-row"><span>Загрязнение</span><b>${t(level)}</b></div>${items.length?`<div class="summary-row"><span>Выбрано элементов</span><b>${items.length}</b></div>`:''}<div class="summary-row"><span>Фото</span><b>${state.files.length}</b></div><div class="summary-row"><span>Оценка времени</span><b>${estimatedTime()}</b></div>${c.travel===null?'<div class="summary-row"><span>Выезд</span><b>Дальше 40 км — согласование</b></div>':`<div class="summary-row"><span>Выезд</span><b>${fmt(c.travel)}</b></div>`}<div class="summary-row"><span>${t('prelim')}</span><b class="price">${c.manual?t('manual'):fmt(c.price)}</b></div></div>${packageHint}<div class="notice">Сервер SIR пересчитает предварительную цену по актуальному прайсу. Окончательная цена подтверждается менеджером после проверки фото/состояния и не повышается без вашего согласия.</div><div class="notice safe"><b>Безопасность:</b> сложные материалы сначала тестируются. При высоком риске обработка не усиливается автоматически.</div>`;
  }

  async function submit(){
    const c=calc(),items=buildItems();
    const payload={...state.data,service:state.service,items,estimated_time:estimatedTime(),source:'website'};
    const next=currentRoot().querySelector('#next');next.disabled=true;next.textContent='Отправляем…';
    try{
      if(C.supabaseUrl&&C.supabasePublishableKey){
        const r=await fetch(`${C.supabaseUrl}/rest/v1/rpc/public_submit_order`,{method:'POST',headers:{'Content-Type':'application/json','apikey':C.supabasePublishableKey},body:JSON.stringify({p_payload:payload})});
        if(!r.ok)throw new Error(await r.text());const out=await r.json();let photos={uploaded:0,failed:0};if(state.files.length&&C.photoUploadUrl&&out?.upload_token)photos=await uploadPhotos(out.order_no,out.upload_token,state.files,next);showDone(out?.order_no||'SIR',photos,out?.preliminary_price);
      }else{openSmsFallback(c);showDone('SMS',{uploaded:0,failed:state.files.length},c.price);}
    }catch(e){console.error(e);alert('Автоматическая отправка временно недоступна. Откроем SMS, чтобы заявка не потерялась.');openSmsFallback(c);next.disabled=false;next.textContent=t('send');}
  }
  async function uploadPhotos(orderNo,token,files,next){let uploaded=0,failed=0;for(let i=0;i<files.length;i++){next.textContent=`Фото ${i+1}/${files.length}…`;const fd=new FormData();fd.append('order_no',orderNo);fd.append('token',token);fd.append('file',files[i],files[i].name||`photo-${i+1}`);try{const r=await fetch(C.photoUploadUrl,{method:'POST',body:fd});if(r.ok)uploaded++;else failed++;}catch(_e){failed++;}}return{uploaded,failed};}
  function openSmsFallback(c){const text=`SIR Rens & Pleie\nНовая заявка\nУслуга: ${services[state.service].title}\nИмя: ${state.data.customer_name||''}\nТелефон: ${state.data.phone||''}\nЗагрязнение: ${state.data.condition||''}\nПредварительная цена: ${c.manual?'после фото':fmt(c.price)}\nКомментарий: ${state.data.comment||''}`;location.href=`sms:${C.phonePrimary}?body=${encodeURIComponent(text)}`;}
  function showDone(orderNo,photos={uploaded:0,failed:0},serverPrice=null){const root=currentRoot(),photoText=photos.uploaded?`Фото прикреплено: ${photos.uploaded}${photos.failed?`. Не загрузилось: ${photos.failed}`:''}.`:photos.failed?'Фото не прикрепились — их можно отправить менеджеру сообщением.':'';root.innerHTML=`<div class="wizard"><div class="step-title">${t('received')}</div><div class="summary"><div class="summary-row"><span>Номер</span><b>${esc(orderNo)}</b></div>${serverPrice!=null?`<div class="summary-row"><span>Предварительная цена SIR</span><b class="price">${fmt(serverPrice)}</b></div>`:''}<p>Менеджер проверит заявку, время и риски. Окончательное предложение подтверждается отдельно.</p>${photoText?`<p>${esc(photoText)}</p>`:''}</div><a class="btn primary" href="tel:${C.phonePrimary}">Позвонить SIR</a></div>`;}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}function fmt(v){return v==null?'—':`${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(num(v))} NOK`;}function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
})();
