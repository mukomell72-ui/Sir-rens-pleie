(() => {
  const TYPES=[
    ['city','Городской / малолитражка','City car / small car','Bybil / småbil'],
    ['hatchback','Хэтчбек','Hatchback','Kombi / hatchback'],
    ['sedan','Седан','Sedan','Sedan'],
    ['liftback','Лифтбек / фастбек','Liftback / fastback','Liftback / fastback'],
    ['wagon','Универсал','Estate / wagon','Stasjonsvogn'],
    ['coupe','Купе','Coupe','Coupé'],
    ['convertible','Кабриолет / родстер','Convertible / roadster','Cabriolet / roadster'],
    ['crossover','Кроссовер','Crossover','Crossover'],
    ['suv','SUV / внедорожник','SUV / off-road','SUV / terrengbil'],
    ['mpv','Минивэн / MPV','Minivan / MPV','Minivan / flerbruksbil'],
    ['passenger_van','Микроавтобус / пассажирский фургон','Passenger van / minibus','Minibuss / personbil-varebil'],
    ['van','Фургон / коммерческий','Van / commercial','Varebil / nyttekjøretøy'],
    ['pickup','Пикап','Pickup','Pickup'],
    ['sports','Спорткар','Sports car','Sportsbil'],
    ['other','Другое','Other','Annet']
  ];

  function lang(){return localStorage.getItem('sir_lang')||'no';}
  function label(){const l=lang();return l==='ru'?'Тип автомобиля':l==='en'?'Vehicle type':'Biltype';}
  function placeholder(){const l=lang();return l==='ru'?'Выберите тип автомобиля':l==='en'?'Choose vehicle type':'Velg biltype';}
  function typeText(row){const l=lang();return l==='ru'?row[1]:l==='en'?row[2]:row[3];}

  function mapOfficial(raw){
    const s=String(raw||'').toLowerCase();
    if(!s)return'';
    if(/pickup|pick-up/.test(s))return'pickup';
    if(/varebil|cargo|panel van|delivery|nyttekj/.test(s))return'van';
    if(/minibuss|minibus|passenger van|shuttle/.test(s))return'passenger_van';
    if(/flerbruksbil|multi-purpose|multipurpose|mpv|minivan/.test(s))return'mpv';
    if(/terreng|off.?road|suv/.test(s))return'suv';
    if(/crossover/.test(s))return'crossover';
    if(/stasjonsvogn|station wagon|estate|wagon|kombi.*wagon/.test(s))return'wagon';
    if(/liftback|fastback/.test(s))return'liftback';
    if(/hatchback|kombi/.test(s))return'hatchback';
    if(/cabrio|convertible|roadster/.test(s))return'convertible';
    if(/coup/.test(s))return'coupe';
    if(/sedan|saloon|limousine/.test(s))return'sedan';
    return'other';
  }

  function refreshOptions(select,current){
    const wanted=current||select.value||'';
    const first=document.createElement('option');first.value='';first.textContent=placeholder();
    select.replaceChildren(first,...TYPES.map(row=>{const o=document.createElement('option');o.value=row[0];o.textContent=typeText(row);return o;}));
    if(wanted&&[...select.options].some(o=>o.value===wanted))select.value=wanted;
  }

  function enhance(){
    const card=document.querySelector('.service-card.open');if(!card)return;
    const hidden=card.querySelector('input[name="vehicle_body"]');
    if(!hidden)return;
    const row=hidden.closest('.summary-row');if(!row)return;
    const labelEl=row.querySelector('[data-vehicle-label="body"]');if(labelEl)labelEl.textContent=label();

    hidden.type='hidden';
    hidden.setAttribute('aria-hidden','true');
    let select=row.querySelector('select[data-vehicle-type]');
    if(!select){
      select=document.createElement('select');
      select.dataset.vehicleType='1';
      select.setAttribute('aria-label',label());
      refreshOptions(select,'');
      row.append(select);
      select.addEventListener('change',()=>{
        hidden.value=select.value;
        hidden.dispatchEvent(new Event('input',{bubbles:true}));
        hidden.dispatchEvent(new Event('change',{bubbles:true}));
      });
    }
    select.setAttribute('aria-label',label());
    const existing=hidden.dataset.userVehicleType||'';
    refreshOptions(select,existing||select.value);
  }

  function syncAfterLookup(){
    setTimeout(()=>{
      const card=document.querySelector('.service-card.open');if(!card)return;
      const hidden=card.querySelector('input[name="vehicle_body"]');
      const select=card.querySelector('select[data-vehicle-type]');
      if(!hidden||!select)return;
      const mapped=mapOfficial(hidden.value);
      if(mapped){
        select.value=mapped;
        hidden.dataset.officialBody=hidden.value;
        hidden.dataset.userVehicleType=mapped;
        hidden.value=mapped;
        hidden.dispatchEvent(new Event('input',{bubbles:true}));
      }
    },350);
  }

  document.addEventListener('change',e=>{
    if(e.target?.matches?.('select[data-vehicle-type]')){
      const hidden=e.target.closest('.summary-row')?.querySelector('input[name="vehicle_body"]');
      if(hidden)hidden.dataset.userVehicleType=e.target.value;
    }
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('.vehicle-lookup-btn'))syncAfterLookup();
    if(e.target.closest('[data-lang]'))setTimeout(enhance,30);
    setTimeout(enhance,0);
  },true);

  const obs=new MutationObserver(enhance);obs.observe(document.body,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',enhance);
})();
