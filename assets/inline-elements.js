(()=>{
  const KEY='sir_inline_car_elements_v1';
  const CONDITION_KEY='sir_inline_condition_v1';
  const defs=[
    ['el_seat','Сиденья','Seter','Seats'],
    ['el_ceiling','Потолок','Taktrekk','Headliner'],
    ['el_floor_carpet','Пол / ковролин','Gulv / teppe','Floor / carpet'],
    ['el_trunk','Багажник','Bagasjerom','Boot'],
    ['el_door_cards','Дверные карты','Dørpaneler','Door cards'],
    ['el_dashboard_console','Панель + консоль','Dashbord + konsoll','Dashboard + console'],
    ['el_interior_plastic','Весь внутренний пластик','All innvendig plast','All interior plastics'],
    ['el_textile_mats','Текстильные коврики','Tekstilmatter','Textile mats'],
    ['el_seat_belt','Ремни безопасности','Sikkerhetsbelter','Seat belts'],
    ['el_interior_glass','Стёкла внутри','Innvendig glass','Interior glass'],
    ['el_child_seat','Детское кресло','Barnesete','Child seat']
  ];
  let priceRows=[];
  let priceRulesReady=false;
  const lang=()=>document.querySelector('[data-lang].active')?.dataset.lang||'no';
  const tx=(ru,no,en)=>lang()==='ru'?ru:lang()==='en'?en:no;
  const load=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
  const save=obj=>sessionStorage.setItem(KEY,JSON.stringify(obj));
  const seatsMax=()=>Math.max(1,Number(document.querySelector('.service-card.open input[name="seats"]:checked')?.value||load().seatsMax||5)||5);
  const level=()=>sessionStorage.getItem(CONDITION_KEY)||'medium';
  const money=v=>`${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(Number(v)||0)} NOK`;
  const rowFor=(code,size='default')=>priceRows.find(r=>r.service_code===code&&String(r.size_key)===String(size))||priceRows.find(r=>r.service_code===code&&String(r.size_key)==='default');
  const rowPrice=(code,size,lvl)=>{
    const row=rowFor(code,size);const v=row?.[`${lvl}_price`];
    if(v!==null&&v!==undefined&&Number.isFinite(Number(v)))return Number(v);
    const C=window.SIR_CONFIG?.pricing;
    if(code==='seat')return Number(C?.seat?.[lvl]??0)||null;
    if(code==='seat_discounted'){
      const base=Number(C?.seat?.discountedSeatBase??150);
      return base+(lvl==='medium'?50:lvl==='heavy'?100:0);
    }
    if(code==='ceiling')return Number(C?.ceiling?.[String(size)]?.[lvl]??0)||null;
    return null;
  };
  const seatTotal=(qty,lvl)=>{let total=0;for(let i=1;i<=qty;i++){const discounted=i===4||i===7||i===8;const p=rowPrice(discounted?'seat_discounted':'seat','default',lvl);if(p==null)return null;total+=p;}return total;};
  function selectedPrice(panel){
    const max=seatsMax(),lvl=level();let total=0;
    const add=(flag,code,size='default',qty=1)=>{
      if(!panel.querySelector(`input[name="${flag}"]`)?.checked)return true;
      let p;
      if(code==='seat')p=seatTotal(qty,lvl);
      else p=rowPrice(code,size,lvl);
      if(p==null)return false;
      total+=p*(code==='seat'?1:qty);return true;
    };
    const seatQty=Math.min(max,Math.max(1,Number(panel.querySelector('input[name="seat_qty"]')?.value)||1));
    const beltQty=Math.min(max,Math.max(1,Number(panel.querySelector('input[name="belt_qty"]')?.value)||1));
    let complete=true;
    complete=add('el_seat','seat','default',seatQty)&&complete;
    complete=add('el_ceiling','ceiling',String(max))&&complete;
    complete=add('el_floor_carpet','floor_carpet',String(max))&&complete;
    complete=add('el_trunk','trunk',max>=9?'large':'standard')&&complete;
    complete=add('el_door_cards','door_cards','4')&&complete;
    complete=add('el_dashboard_console','dashboard_console')&&complete;
    complete=add('el_interior_plastic','interior_plastic')&&complete;
    complete=add('el_textile_mats','textile_mats','4')&&complete;
    complete=add('el_seat_belt','seat_belt','1',beltQty)&&complete;
    complete=add('el_interior_glass','interior_glass')&&complete;
    complete=add('el_child_seat','child_seat')&&complete;
    return{total,complete};
  }
  function setPriceText(out,text,value=''){
    if(out.textContent!==text)out.textContent=text;
    const next=String(value);
    if(out.dataset.value!==next)out.dataset.value=next;
  }
  function refreshPrice(panel){
    const out=panel?.querySelector('[data-inline-price]');if(!out)return;
    const any=defs.some(([name])=>panel.querySelector(`input[name="${name}"]`)?.checked);
    if(!any){setPriceText(out,tx('Выберите элементы — цена появится здесь','Velg områder – prisen vises her','Choose areas — the price will appear here'));return;}
    const p=selectedPrice(panel);
    if(!p.complete&&!priceRulesReady){setPriceText(out,tx('Рассчитываем цену…','Beregner pris…','Calculating price…'));return;}
    if(!p.complete){setPriceText(out,tx('Цена уточняется по выбранным элементам','Prisen avklares for de valgte områdene','Price is being confirmed for the selected areas'));return;}
    setPriceText(out,`${tx('Выбранные элементы','Valgte områder','Selected areas')}: ${money(p.total)}`,p.total);
  }
  async function loadPriceRules(){
    const C=window.SIR_CONFIG;if(!C?.supabaseUrl||!C?.supabasePublishableKey){priceRulesReady=true;refreshPrice(document.querySelector('.inline-elements-panel.open'));return;}
    try{
      const r=await fetch(`${C.supabaseUrl}/rest/v1/price_rules?active=eq.true&select=service_code,size_key,light_price,medium_price,heavy_price`,{headers:{apikey:C.supabasePublishableKey}});
      if(r.ok)priceRows=await r.json();
    }catch(_e){}finally{priceRulesReady=true;refreshPrice(document.querySelector('.inline-elements-panel.open'));}
  }
  function stateFromPanel(panel){
    const s=load();
    for(const [name] of defs)s[name]=!!panel.querySelector(`input[name="${name}"]`)?.checked;
    s.seat_qty=Number(panel.querySelector('input[name="seat_qty"]')?.value||s.seat_qty||1);
    s.belt_qty=Number(panel.querySelector('input[name="belt_qty"]')?.value||s.belt_qty||1);
    s.seatsMax=seatsMax();
    save(s);return s;
  }
  function qtyMarkup(type,value,max){
    const isSeat=type==='seat';
    const name=isSeat?'seat_qty':'belt_qty';
    const title=isSeat?tx('Сколько сидений чистим','Hvor mange seter skal renses','How many seats to clean'):tx('Сколько ремней чистим','Hvor mange belter skal renses','How many seat belts to clean');
    return `<div class="inline-qty" data-inline-qty="${type}"><span class="inline-qty-title">${title}</span><div class="qty-stepper"><button type="button" data-inline-minus="${type}" aria-label="${tx('Уменьшить','Reduser','Decrease')}">−</button><input name="${name}" type="number" inputmode="numeric" min="1" max="${max}" value="${Math.min(max,Math.max(1,Number(value)||1))}" aria-label="${title}"><button type="button" data-inline-plus="${type}" aria-label="${tx('Увеличить','Øk','Increase')}">+</button></div></div>`;
  }
  function panelMarkup(saved,max){
    const items=defs.map(([name,ru,no,en])=>{
      const qty=name==='el_seat'?qtyMarkup('seat',saved.seat_qty,max):name==='el_seat_belt'?qtyMarkup('belt',saved.belt_qty,max):'';
      return `<div class="inline-element-block"><div class="inline-element"><input type="checkbox" id="inline-${name}" name="${name}" ${saved[name]?'checked':''}><label for="inline-${name}"><b>${tx(ru,no,en)}</b><small>${tx('Нажмите, чтобы добавить','Trykk for å legge til','Tap to add')}</small><span class="inline-element-mark">✓</span></label></div>${qty}</div>`;
    }).join('');
    return `<div class="inline-elements-panel"><div class="inline-elements-title">${tx('Выберите элементы салона','Velg deler av interiøret','Choose interior areas')}</div><div class="inline-elements-help">${tx('Выберите всё, что нужно почистить. Количество сидений и ремней указывается сразу под выбранным элементом.','Velg alt som skal renses. Antall seter og belter velges rett under området.','Choose everything to clean. Seat and belt quantities appear directly below the selected area.')}</div><div class="inline-elements-price" data-inline-price></div><div class="inline-elements-grid">${items}</div><div class="inline-elements-error">${tx('Выберите хотя бы один элемент салона.','Velg minst ett område.','Choose at least one interior area.')}</div></div>`;
  }
  function syncQty(panel){
    const max=seatsMax();
    for(const [flag,type,inputName] of [['el_seat','seat','seat_qty'],['el_seat_belt','belt','belt_qty']]){
      const checked=panel.querySelector(`input[name="${flag}"]`)?.checked;
      const wrap=panel.querySelector(`[data-inline-qty="${type}"]`);
      const input=panel.querySelector(`input[name="${inputName}"]`);
      if(wrap)wrap.classList.toggle('open',!!checked);
      if(input){input.max=String(max);const next=Math.min(max,Math.max(1,Number(input.value)||1));if(String(next)!==input.value)input.value=String(next);}
    }
  }
  function bind(panel){
    if(panel.dataset.bound==='1')return;panel.dataset.bound='1';
    panel.addEventListener('change',e=>{if(e.target.matches('input')){syncQty(panel);panel.querySelector('.inline-elements-error')?.classList.remove('show');stateFromPanel(panel);refreshPrice(panel)}});
    panel.addEventListener('input',e=>{if(e.target.matches('input[type="number"]')){syncQty(panel);stateFromPanel(panel);refreshPrice(panel)}});
    panel.addEventListener('click',e=>{
      const type=e.target.dataset.inlinePlus||e.target.dataset.inlineMinus;if(!type)return;
      const input=panel.querySelector(`input[name="${type==='seat'?'seat_qty':'belt_qty'}"]`);if(!input)return;
      const delta=e.target.dataset.inlinePlus?1:-1;const max=Number(input.max)||9;input.value=String(Math.min(max,Math.max(1,Number(input.value||1)+delta)));input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    syncQty(panel);stateFromPanel(panel);refreshPrice(panel);
  }
  function enhancePackage(){
    const card=document.querySelector('.service-card.open');if(!card)return;
    const packageRadio=card.querySelector('input[name="package"][value="elements"]');if(!packageRadio)return;
    const step=packageRadio.closest('#step')||packageRadio.closest('.wizard');if(!step)return;
    const choice=packageRadio.closest('.choice');if(!choice)return;
    const packageTitle=choice.querySelector('label b');
    const wantedTitle=tx('Отдельные элементы салона','Enkeltdeler i interiøret','Individual interior areas');
    if(packageTitle&&packageTitle.textContent!==wantedTitle)packageTitle.textContent=wantedTitle;
    let panel=step.querySelector('.inline-elements-panel');
    if(!panel){
      choice.insertAdjacentHTML('afterend',panelMarkup(load(),seatsMax()));
      panel=step.querySelector('.inline-elements-panel');bind(panel);
    }
    const show=()=>{panel.classList.toggle('open',packageRadio.checked);if(packageRadio.checked){sessionStorage.setItem('sir_inline_elements_mode','1');syncQty(panel);refreshPrice(panel)}else sessionStorage.removeItem('sir_inline_elements_mode')};
    if(packageRadio.dataset.inlineBound!=='1'){
      packageRadio.dataset.inlineBound='1';
      step.querySelectorAll('input[name="package"]').forEach(r=>r.addEventListener('change',show));
    }
    show();
  }
  function validateBeforeNext(e){
    const card=document.querySelector('.service-card.open');if(!card)return;
    const panel=card.querySelector('.inline-elements-panel.open');if(!panel)return;
    const next=e.target.closest?.('#next');if(!next)return;
    const any=defs.some(([name])=>panel.querySelector(`input[name="${name}"]`)?.checked);
    if(!any){e.preventDefault();e.stopImmediatePropagation();panel.querySelector('.inline-elements-error')?.classList.add('show');panel.scrollIntoView({behavior:'smooth',block:'center'});return;}
    stateFromPanel(panel);sessionStorage.setItem('sir_inline_elements_ready','1');
  }
  function skipLegacyStep(){
    if(sessionStorage.getItem('sir_inline_elements_ready')!=='1')return;
    const card=document.querySelector('.service-card.open');if(!card)return;
    const title=card.querySelector('.step-title')?.textContent.trim();
    if(!['Выберите элементы','Velg områder','Choose areas'].includes(title))return;
    const next=card.querySelector('#next');if(!next||next.dataset.inlineSkip==='1')return;
    next.dataset.inlineSkip='1';
    queueMicrotask(()=>{if(next.isConnected)next.click();});
  }
  document.addEventListener('change',e=>{
    if(e.target.matches('input[name="seats"]:checked')){const s=load();s.seatsMax=Math.max(1,Number(e.target.value)||5);save(s);}
    if(e.target.matches('input[name="condition"]:checked'))sessionStorage.setItem(CONDITION_KEY,e.target.value||'medium');
  },true);
  document.addEventListener('click',validateBeforeNext,true);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-lang]'))setTimeout(()=>{const p=document.querySelector('.inline-elements-panel');if(p)p.remove();enhancePackage()},30);setTimeout(()=>{enhancePackage();skipLegacyStep()},0)},true);
  const obs=new MutationObserver(()=>{enhancePackage();skipLegacyStep()});obs.observe(document.body,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',()=>{enhancePackage();skipLegacyStep();loadPriceRules()});
})();
