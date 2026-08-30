(() => {
  const C = window.SIR_CONFIG;
  const state = { service:null, step:0, language:'ru', data:{} };
  const T = {
    ru:{choose:'Выберите услугу',back:'Назад',next:'Далее',send:'Отправить заявку',light:'Лёгкое',medium:'Среднее',heavy:'Сильное',special:'Особое состояние',prelim:'Предварительная цена',manual:'Оценка после фото',received:'Заявка подготовлена',sms:'Открыть SMS и отправить'},
    no:{choose:'Velg tjeneste',back:'Tilbake',next:'Neste',send:'Send forespørsel',light:'Lett',medium:'Middels',heavy:'Kraftig',special:'Spesiell tilstand',prelim:'Foreløpig pris',manual:'Vurderes etter bilder',received:'Forespørselen er klar',sms:'Åpne SMS og send'},
    en:{choose:'Choose service',back:'Back',next:'Next',send:'Send request',light:'Light',medium:'Medium',heavy:'Heavy',special:'Special condition',prelim:'Preliminary price',manual:'Review after photos',received:'Request ready',sms:'Open SMS and send'}
  };
  const t = k => T[state.language][k] || T.ru[k] || k;

  const services = {
    car:{title:'Салон автомобиля', icon:'🚗'}, sofa:{title:'Диван',icon:'🛋️'}, chair:{title:'Кресло',icon:'🪑'}, mattress:{title:'Матрас',icon:'▱'}
  };

  const cards = [...document.querySelectorAll('.service-card')];
  cards.forEach(card => card.querySelector('.service-head').addEventListener('click', () => openService(card.dataset.service)));
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click',()=>{state.language=b.dataset.lang;document.querySelectorAll('[data-lang]').forEach(x=>x.classList.toggle('active',x===b)); if(state.service) render();}));

  function openService(service){
    state.service=service; state.step=0; state.data={service};
    cards.forEach(c=>c.classList.toggle('open',c.dataset.service===service));
    render();
    document.querySelector(`.service-card[data-service="${service}"]`).scrollIntoView({behavior:'smooth',block:'start'});
  }

  function steps(){
    if(state.service==='car') return [carVehicle,carPackage,condition,issues,contact,summary];
    if(state.service==='sofa') return [sofaSize,condition,issues,contact,summary];
    if(state.service==='chair') return [chairType,condition,issues,contact,summary];
    return [mattressType,condition,issues,contact,summary];
  }

  function render(){
    const root=document.querySelector(`.service-card[data-service="${state.service}"] .service-body`);
    if(!root) return;
    const s=steps(); state.step=Math.max(0,Math.min(state.step,s.length-1));
    root.innerHTML=`<div class="wizard"><div class="progress"><span style="width:${((state.step+1)/s.length)*100}%"></span></div><div id="step"></div><div class="wizard-actions"><button class="btn ghost" id="prev" ${state.step===0?'disabled':''}>← ${t('back')}</button><button class="btn primary" id="next">${state.step===s.length-1?t('send'):t('next')} →</button></div></div>`;
    s[state.step](root.querySelector('#step'));
    root.querySelector('#prev').addEventListener('click',()=>{capture();state.step--;render();});
    root.querySelector('#next').addEventListener('click',async()=>{ if(!capture(true)) return; if(state.step===s.length-1) await submit(); else {state.step++;render();} });
  }

  function fieldValue(name){const el=document.querySelector(`[name="${name}"]`);if(!el)return state.data[name];if(el.type==='radio'){const c=document.querySelector(`[name="${name}"]:checked`);return c?.value;}if(el.type==='checkbox')return el.checked;return el.value;}
  function capture(validate=false){
    const root=document.querySelector(`.service-card[data-service="${state.service}"] .service-body`);
    root.querySelectorAll('input,select,textarea').forEach(el=>{if(el.type==='radio'){if(el.checked)state.data[el.name]=el.value;}else if(el.type==='checkbox'){state.data[el.name]=el.checked;}else state.data[el.name]=el.value;});
    if(validate){const req=[...root.querySelectorAll('[required]')];for(const el of req){if(el.type==='radio'){if(!root.querySelector(`[name="${el.name}"]:checked`)){alert('Заполните обязательный выбор');return false;}}else if(!el.value.trim()){el.focus();return false;}}}
    return true;
  }
  const choice=(name,value,title,sub,checked=false)=>`<div class="choice"><input type="radio" id="${name}-${value}" name="${name}" value="${value}" ${checked?'checked':''} required><label for="${name}-${value}"><b>${title}</b><small>${sub||''}</small></label></div>`;

  function carVehicle(el){
    el.innerHTML=`<div class="step-title">Ваш автомобиль</div><div class="step-help">Регномер поможет заполнить данные. Все поля можно исправить вручную.</div><div class="field"><label>Регистрационный номер</label><input name="plate" value="${state.data.plate||''}" placeholder="AB12345" autocomplete="off"></div><div class="choice-grid">${[5,7,9].map(n=>choice('seats',n,`${n} мест`,'Размер салона',String(state.data.seats||'5')===String(n))).join('')}</div>`;
  }
  function carPackage(el){
    el.innerHTML=`<div class="step-title">Что чистим?</div><div class="step-help">Полный салон специально выгоднее набора отдельных элементов.</div><div class="choice-grid">${choice('package','full','Полный салон','Сиденья, потолок, пол, багажник, двери, пластик, коврики и стекла',state.data.package!=='seats')}${choice('package','seats','Только сиденья','Расчёт по количеству мест',state.data.package==='seats')}</div>`;
  }
  function condition(el){
    const cur=state.data.condition||'medium';
    el.innerHTML=`<div class="step-title">Степень загрязнения</div><div class="step-help">Выберите состояние максимально честно. Менеджер проверит фото до окончательной цены.</div><div class="choice-grid">${choice('condition','light',t('light'),'1 щадящий цикл очистки',cur==='light')}${choice('condition','medium',t('medium'),'Предобработка + основной проход + локальный повтор',cur==='medium')}${choice('condition','heavy',t('heavy'),'Многоэтапная глубокая очистка',cur==='heavy')}${choice('condition','special',t('special'),'Цена только после фото и проверки риска',cur==='special')}</div>`;
  }
  function issues(el){
    el.innerHTML=`<div class="step-title">Что ещё заметно?</div><div class="step-help">Это помогает правильно оценить время и безопасную технологию.</div><div class="choice-grid"><div class="choice"><input type="checkbox" id="stains" name="stains" ${state.data.stains?'checked':''}><label for="stains"><b>Пятна</b><small>Старые или заметные</small></label></div><div class="choice"><input type="checkbox" id="hair" name="hair" ${state.data.hair?'checked':''}><label for="hair"><b>Шерсть</b><small>Домашние животные</small></label></div><div class="choice"><input type="checkbox" id="odor" name="odor" ${state.data.odor?'checked':''}><label for="odor"><b>Запах</b><small>Нужна работа с источником</small></label></div></div><div class="field"><label>Комментарий</label><textarea name="comment" placeholder="Опишите сложные места">${state.data.comment||''}</textarea></div><div class="field"><label>Фото</label><input type="file" name="photos" accept="image/*" multiple><div class="status-line">До подключения базы фото не отправляются; после подключения будут храниться приватно.</div></div>`;
  }
  function contact(el){
    el.innerHTML=`<div class="step-title">Контакт и выезд</div><div class="field"><label>Имя</label><input name="customer_name" required value="${state.data.customer_name||''}" autocomplete="name"></div><div class="field"><label>Телефон</label><input name="phone" required inputmode="tel" value="${state.data.phone||''}" autocomplete="tel"></div><div class="field"><label>Адрес / район</label><input name="address" value="${state.data.address||''}" autocomplete="street-address"></div><div class="field"><label>Расстояние от Kongsberg, км</label><input name="distance_km" type="number" min="0" max="40" value="${state.data.distance_km||0}"></div><div class="notice safe">Выезд 0–10 км — бесплатно. Дальше стоимость считается отдельно и показывается до отправки.</div>`;
  }
  function sofaSize(el){const cur=String(state.data.size||3);el.innerHTML=`<div class="step-title">Размер дивана</div><div class="choice-grid">${[2,3,4,5].map(n=>choice('size',n,`${n} места`,'Количество посадочных мест',cur===String(n))).join('')}</div>`;}
  function chairType(el){el.innerHTML=`<div class="step-title">Тип кресла</div>${choice('size','armchair','Кресло','Мягкое кресло',true)}`;}
  function mattressType(el){const cur=state.data.size||'double';el.innerHTML=`<div class="step-title">Матрас</div><div class="choice-grid">${choice('size','single','Односпальный','Одна сторона',cur==='single')}${choice('size','double','Двуспальный','Одна сторона',cur==='double')}</div>`;}

  function calc(){
    const d=state.data, level=d.condition||'medium'; if(level==='special') return {manual:true,price:null,travel:travelPrice(+d.distance_km||0)};
    let base=0;
    if(state.service==='car'){
      const seats=String(d.seats||5);
      if((d.package||'full')==='full') base=C.pricing.fullInterior[seats]?.[level]||C.pricing.fullInterior['5'][level];
      else {const n=+seats;for(let i=1;i<=n;i++){const disc=C.pricing.seat.discountedPositions.includes(i);const light=disc?C.pricing.seat.discountedSeatBase:C.pricing.seat.light;base+=light+(level==='medium'?50:level==='heavy'?100:0);}}
    } else if(state.service==='sofa') base=C.pricing.sofa[String(d.size||3)]?.[level]||0;
    else if(state.service==='chair') base=C.pricing.armchair[level];
    else base=(d.size==='single'?C.pricing.mattressSingle:C.pricing.mattressDouble)[level];
    if(d.hair) base+=level==='heavy'?350:200;
    if(d.odor) base+=level==='heavy'?350:250;
    const travel=travelPrice(+d.distance_km||0);
    return {manual:false,base,travel,price:base+travel};
  }
  function travelPrice(km){for(const r of C.pricing.travel){if(km<=r.maxKm)return r.price;}return null;}
  function estimatedTime(){const level=state.data.condition||'medium';let h=state.service==='car'?(state.data.package==='seats'?2.5:4):2; if(level==='light')h-=.75;if(level==='heavy')h+=1.5;if(state.data.hair)h+=.5;if(state.data.odor)h+=.5;return `${Math.max(1,h).toFixed(h%1?1:0)}–${(Math.max(1,h)+.75).toFixed(1)} ч`}
  function summary(el){const c=calc();el.innerHTML=`<div class="step-title">План и предварительный расчёт</div><div class="summary"><div class="summary-row"><span>Услуга</span><b>${services[state.service].title}</b></div><div class="summary-row"><span>Загрязнение</span><b>${t(state.data.condition||'medium')}</b></div><div class="summary-row"><span>Оценка времени</span><b>${estimatedTime()}</b></div>${c.travel===null?'<div class="summary-row"><span>Выезд</span><b>За пределами 40 км — согласование</b></div>':`<div class="summary-row"><span>Выезд</span><b>${c.travel} NOK</b></div>`}<div class="summary-row"><span>${t('prelim')}</span><b class="price">${c.manual?t('manual'):`${c.price} NOK`}</b></div></div><div class="notice">Это предварительная оценка. Окончательная цена подтверждается после проверки фото/состояния и не повышается без вашего согласия.</div><div class="notice safe"><b>Безопасность:</b> сложные материалы и особые состояния сначала тестируются. Если риск высок, работа не усиливается автоматически.</div>`;}

  async function submit(){
    const c=calc(); const payload={...state.data,service:state.service,preliminary_price:c.price,estimated_time:estimatedTime(),source:'website'};
    const next=document.querySelector(`.service-card[data-service="${state.service}"] #next`); next.disabled=true;
    try{
      if(C.supabaseUrl&&C.supabasePublishableKey){
        const r=await fetch(`${C.supabaseUrl}/rest/v1/rpc/public_submit_order`,{method:'POST',headers:{'Content-Type':'application/json','apikey':C.supabasePublishableKey,'Authorization':`Bearer ${C.supabasePublishableKey}`},body:JSON.stringify({p_payload:payload})});
        if(!r.ok) throw new Error(await r.text());
        const out=await r.json(); showDone(out?.order_no||'SIR');
      } else {
        const text=`SIR Rens & Pleie\nНовая заявка\nУслуга: ${services[state.service].title}\nИмя: ${state.data.customer_name||''}\nТелефон: ${state.data.phone||''}\nЗагрязнение: ${state.data.condition||''}\nПредварительная цена: ${c.manual?'после фото':c.price+' NOK'}\nКомментарий: ${state.data.comment||''}`;
        location.href=`sms:${C.phonePrimary}?body=${encodeURIComponent(text)}`; showDone('SMS');
      }
    }catch(e){alert('Не удалось отправить автоматически. Откроем SMS.'); const text=`SIR заявка: ${state.data.customer_name||''}, ${state.data.phone||''}, ${services[state.service].title}`; location.href=`sms:${C.phonePrimary}?body=${encodeURIComponent(text)}`; next.disabled=false;}
  }
  function showDone(orderNo){const root=document.querySelector(`.service-card[data-service="${state.service}"] .service-body`);root.innerHTML=`<div class="wizard"><div class="step-title">${t('received')}</div><div class="summary"><div class="summary-row"><span>Номер</span><b>${orderNo}</b></div><p>Менеджер проверит заявку, время и риски. Окончательное предложение подтверждается отдельно.</p></div><a class="btn primary" href="tel:${C.phonePrimary}">Позвонить SIR</a></div>`;}
})();
