(() => {
  const C=window.SIR_CONFIG;
  const endpoint=()=>String(C.vehicleLookupUrl||'').trim()||null;
  const saved={brand:'',model:'',year:'',body:'',material:''};
  const clearSaved=()=>{for(const key of Object.keys(saved))saved[key]='';};

  const labels=()=>{
    const lang=localStorage.getItem('sir_lang')||'no';
    if(lang==='ru')return{find:'Найти автомобиль',ready:'При поиске регистрационный номер передаётся Statens vegvesen через SIR для получения технических данных автомобиля.',off:'Автопоиск сейчас недоступен. Заполните данные автомобиля вручную.',empty:'Введите регистрационный номер.',loading:'Ищем автомобиль…',brand:'Марка',model:'Модель',year:'Год',body:'Кузов',material:'Материал салона',check:'Автомобиль найден. Проверьте данные — их можно исправить.',notFound:'Автомобиль с таким номером не найден. Проверьте номер или заполните данные вручную.',limited:'Слишком много запросов. Заполните данные вручную или попробуйте позже.',service:'Поиск автомобиля временно недоступен. Заполните данные вручную.',fail:'Не удалось получить данные. Заполните их вручную.'};
    if(lang==='en')return{find:'Find vehicle',ready:'When you search, the registration number is sent to Statens vegvesen through SIR to retrieve technical vehicle details.',off:'Automatic lookup is unavailable. Enter the vehicle details manually.',empty:'Enter a registration number.',loading:'Looking up vehicle…',brand:'Make',model:'Model',year:'Year',body:'Body',material:'Interior material',check:'Vehicle found. Check the details — they can be corrected.',notFound:'No vehicle was found for that registration number. Check it or enter the details manually.',limited:'Too many lookups. Enter the details manually or try again later.',service:'Vehicle lookup is temporarily unavailable. Enter the details manually.',fail:'Could not retrieve vehicle details. Enter them manually.'};
    return{find:'Finn kjøretøy',ready:'Når du søker, sendes registreringsnummeret via SIR til Statens vegvesen for å hente tekniske kjøretøyopplysninger.',off:'Automatisk oppslag er ikke tilgjengelig. Fyll inn kjøretøyopplysningene manuelt.',empty:'Skriv inn registreringsnummer.',loading:'Søker etter kjøretøy…',brand:'Merke',model:'Modell',year:'År',body:'Karosseri',material:'Interiørmateriale',check:'Kjøretøy funnet. Kontroller opplysningene — de kan korrigeres.',notFound:'Fant ikke kjøretøy med dette registreringsnummeret. Kontroller nummeret eller fyll inn manuelt.',limited:'For mange oppslag. Fyll inn manuelt eller prøv igjen senere.',service:'Kjøretøyoppslag er midlertidig utilgjengelig. Fyll inn opplysningene manuelt.',fail:'Kunne ikke hente kjøretøydata. Fyll inn opplysningene manuelt.'};
  };

  function detailsBox(wrap,text){
    let box=wrap.querySelector('.vehicle-details');
    if(box)return box;
    box=document.createElement('div');
    box.className='summary vehicle-details';
    box.style.marginTop='10px';
    box.innerHTML=[
      ['brand',text.brand,'text'],['model',text.model,'text'],['year',text.year,'number'],['body',text.body,'text'],['material',text.material,'text']
    ].map(([key,label,type])=>`<div class="summary-row"><span data-vehicle-label="${key}">${label}</span><input name="vehicle_${key}" type="${type}" value="${esc(saved[key])}" aria-label="${label}" ${key==='year'?'min="1900" max="2100" inputmode="numeric"':''}></div>`).join('');
    box.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{saved[input.name.replace('vehicle_','')]=input.value;}));
    wrap.append(box);
    return box;
  }

  function setDetails(box,data){
    const values={brand:data.brand||'',model:data.model||'',year:data.year||'',body:data.body||''};
    for(const [key,value] of Object.entries(values)){
      saved[key]=String(value);
      const input=box.querySelector(`[name="vehicle_${key}"]`);if(input)input.value=saved[key];
    }
  }

  function enhance(){
    const plate=document.querySelector('.service-card.open input[name="plate"]');
    if(!plate||plate.dataset.enhanced)return;
    plate.dataset.enhanced='1';
    const wrap=plate.parentElement,l=labels(),ep=endpoint();
    const button=document.createElement('button');button.type='button';button.className='btn vehicle-lookup-btn';button.textContent=l.find;button.style.marginTop='8px';button.disabled=!ep;
    const info=document.createElement('div');info.className='status-line vehicle-lookup-info';info.textContent=ep?l.ready:l.off;
    wrap.append(button,info);
    const box=detailsBox(wrap,l);

    button.addEventListener('click',async()=>{
      const currentEndpoint=endpoint(),text=labels(),value=plate.value.replace(/\s+/g,'').toUpperCase();
      if(!value){info.textContent=text.empty;plate.focus();return;}
      if(!currentEndpoint){info.textContent=text.off;return;}
      button.disabled=true;info.textContent=text.loading;
      try{
        const r=await fetch(currentEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registrationNumber:value})});
        let d={};try{d=await r.json();}catch(_e){}
        if(!r.ok){
          if(r.status===404||d.error==='not_found')info.textContent=text.notFound;
          else if(r.status===429||d.error==='rate_limited')info.textContent=text.limited;
          else if(r.status===503||d.error==='rate_limit_unavailable'||d.error==='server_not_configured')info.textContent=text.service;
          else info.textContent=text.fail;
          return;
        }
        setDetails(box,d);info.textContent=text.check;
      }catch(_e){info.textContent=text.fail;}finally{button.disabled=false;}
    });
  }

  function refreshLanguage(){
    const button=document.querySelector('.service-card.open .vehicle-lookup-btn'),info=document.querySelector('.service-card.open .vehicle-lookup-info');if(!button||!info)return;
    const l=labels(),ep=endpoint();button.textContent=l.find;button.disabled=!ep;if(!ep)info.textContent=l.off;
    const box=document.querySelector('.service-card.open .vehicle-details');
    if(box){for(const key of ['brand','model','year','body','material']){const span=box.querySelector(`[data-vehicle-label="${key}"]`),input=box.querySelector(`[name="vehicle_${key}"]`);if(span)span.textContent=l[key];if(input)input.setAttribute('aria-label',l[key]);}}
  }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  const obs=new MutationObserver(enhance);obs.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('.service-card[data-service="car"] .service-head'))clearSaved();
    if(e.target.closest('[data-lang]'))setTimeout(refreshLanguage,0);
    setTimeout(enhance,0);
  },true);
})();
