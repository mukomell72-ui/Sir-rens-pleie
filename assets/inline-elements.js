(()=>{
  const KEY='sir_inline_car_elements_v1';
  const defs=[
    ['el_seat','Сиденья','Seter','Seats','Выберите количество','Velg antall','Choose quantity'],
    ['el_ceiling','Потолок','Taktrekk','Headliner','','',''],
    ['el_floor_carpet','Пол / ковролин','Gulv / teppe','Floor / carpet','','',''],
    ['el_trunk','Багажник','Bagasjerom','Boot','','',''],
    ['el_door_cards','Дверные карты','Dørpaneler','Door cards','','',''],
    ['el_dashboard_console','Панель + консоль','Dashbord + konsoll','Dashboard + console','','',''],
    ['el_interior_plastic','Пластик салона','Innvendig plast','Interior plastics','','',''],
    ['el_textile_mats','Текстильные коврики','Tekstilmatter','Textile mats','','',''],
    ['el_seat_belt','Ремни безопасности','Sikkerhetsbelter','Seat belts','Выберите количество','Velg antall','Choose quantity'],
    ['el_interior_glass','Стёкла внутри','Innvendig glass','Interior glass','','',''],
    ['el_child_seat','Детское кресло','Barnesete','Child seat','','','']
  ];
  const lang=()=>document.querySelector('[data-lang].active')?.dataset.lang||'no';
  const tx=(ru,no,en)=>lang()==='ru'?ru:lang()==='en'?en:no;
  const load=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
  const save=obj=>sessionStorage.setItem(KEY,JSON.stringify(obj));
  const seatsMax=()=>Number(document.querySelector('.service-card.open input[name="seats"]:checked')?.value||load().seatsMax||5)||5;
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
    return `<div class="inline-qty" data-inline-qty="${type}"><span class="inline-qty-title">${title}</span><div class="qty-stepper"><button type="button" data-inline-minus="${type}">−</button><input name="${name}" type="number" inputmode="numeric" min="1" max="${max}" value="${Math.min(max,Math.max(1,Number(value)||1))}"><button type="button" data-inline-plus="${type}">+</button></div></div>`;
  }
  function panelMarkup(saved,max){
    const items=defs.map(([name,ru,no,en])=>`<div class="inline-element"><input type="checkbox" id="inline-${name}" name="${name}" ${saved[name]?'checked':''}><label for="inline-${name}"><b>${tx(ru,no,en)}</b><small>${tx('Нажмите, чтобы добавить','Trykk for å legge til','Tap to add')}</small><span class="inline-element-mark">✓</span></label></div>`).join('');
    return `<div class="inline-elements-panel"><div class="inline-elements-title">${tx('Выберите элементы салона','Velg deler av interiøret','Choose interior areas')}</div><div class="inline-elements-help">${tx('Выберите всё, что нужно почистить. Количество сидений и ремней указывается здесь же.','Velg alt som skal renses. Antall seter og belter velges her.','Choose everything to clean. Seat and belt quantities are selected here too.')}</div><div class="inline-elements-grid">${items}</div>${qtyMarkup('seat',saved.seat_qty,max)}${qtyMarkup('belt',saved.belt_qty,max)}<div class="inline-elements-error">${tx('Выберите хотя бы один элемент салона.','Velg minst ett område.','Choose at least one interior area.')}</div></div>`;
  }
  function syncQty(panel){
    const max=seatsMax();
    for(const [flag,type,inputName] of [['el_seat','seat','seat_qty'],['el_seat_belt','belt','belt_qty']]){
      const checked=panel.querySelector(`input[name="${flag}"]`)?.checked;
      const wrap=panel.querySelector(`[data-inline-qty="${type}"]`);
      const input=panel.querySelector(`input[name="${inputName}"]`);
      if(wrap)wrap.classList.toggle('open',!!checked);
      if(input){input.max=String(max);if(Number(input.value)>max)input.value=String(max)}
    }
  }
  function bind(panel){
    if(panel.dataset.bound==='1')return;panel.dataset.bound='1';
    panel.addEventListener('change',e=>{if(e.target.matches('input')){syncQty(panel);panel.querySelector('.inline-elements-error')?.classList.remove('show');stateFromPanel(panel)}});
    panel.addEventListener('click',e=>{
      const type=e.target.dataset.inlinePlus||e.target.dataset.inlineMinus;if(!type)return;
      const input=panel.querySelector(`input[name="${type==='seat'?'seat_qty':'belt_qty'}"]`);if(!input)return;
      const delta=e.target.dataset.inlinePlus?1:-1;const max=Number(input.max)||9;input.value=String(Math.min(max,Math.max(1,Number(input.value||1)+delta)));input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    syncQty(panel);stateFromPanel(panel);
  }
  function enhancePackage(){
    const card=document.querySelector('.service-card.open');if(!card)return;
    const packageRadio=card.querySelector('input[name="package"][value="elements"]');if(!packageRadio)return;
    const step=packageRadio.closest('#step')||packageRadio.closest('.wizard');if(!step)return;
    let panel=step.querySelector('.inline-elements-panel');
    if(!panel){
      step.insertAdjacentHTML('beforeend',panelMarkup(load(),seatsMax()));
      panel=step.querySelector('.inline-elements-panel');bind(panel);
    }
    const show=()=>{panel.classList.toggle('open',packageRadio.checked);if(packageRadio.checked){sessionStorage.setItem('sir_inline_elements_mode','1');syncQty(panel)}else sessionStorage.removeItem('sir_inline_elements_mode')};
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
    requestAnimationFrame(()=>next.click());
  }
  document.addEventListener('click',validateBeforeNext,true);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-lang]'))setTimeout(()=>{const p=document.querySelector('.inline-elements-panel');if(p)p.remove();enhancePackage()},30);setTimeout(()=>{enhancePackage();skipLegacyStep()},0)},true);
  const obs=new MutationObserver(()=>{enhancePackage();skipLegacyStep()});obs.observe(document.body,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',()=>{enhancePackage();skipLegacyStep()});
})();