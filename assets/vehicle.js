(() => {
  const C=window.SIR_CONFIG;
  const endpoint=()=>String(C.vehicleLookupUrl||'').trim()||null;
  const labels=()=>{
    const lang=localStorage.getItem('sir_lang')||'no';
    if(lang==='ru')return{find:'Найти автомобиль',ready:'Данные будут запрошены через SIR / Statens vegvesen.',off:'Автопоиск пока не подключён. Регномер можно указать вручную.',empty:'Введите регистрационный номер.',loading:'Ищем автомобиль…',brand:'Марка',model:'Модель',year:'Год',body:'Кузов',check:'Проверьте данные — их можно исправить.',fail:'Не удалось получить данные. Продолжите вручную.'};
    if(lang==='en')return{find:'Find vehicle',ready:'Vehicle details will be requested through SIR / Statens vegvesen.',off:'Automatic lookup is not enabled yet. You can enter the registration number manually.',empty:'Enter a registration number.',loading:'Looking up vehicle…',brand:'Make',model:'Model',year:'Year',body:'Body',check:'Check the details — they can be corrected.',fail:'Could not retrieve vehicle details. Continue manually.'};
    return{find:'Finn kjøretøy',ready:'Kjøretøydata hentes via SIR / Statens vegvesen.',off:'Automatisk oppslag er ikke aktivert ennå. Registreringsnummer kan fylles inn manuelt.',empty:'Skriv inn registreringsnummer.',loading:'Søker etter kjøretøy…',brand:'Merke',model:'Modell',year:'År',body:'Karosseri',check:'Kontroller opplysningene — de kan korrigeres.',fail:'Kunne ikke hente kjøretøydata. Fortsett manuelt.'};
  };
  function enhance(){
    const plate=document.querySelector('.service-card.open input[name="plate"]');
    if(!plate||plate.dataset.enhanced)return;
    plate.dataset.enhanced='1';
    const wrap=plate.parentElement,l=labels(),ep=endpoint();
    const button=document.createElement('button');button.type='button';button.className='btn vehicle-lookup-btn';button.textContent=l.find;button.style.marginTop='8px';button.disabled=!ep;
    const info=document.createElement('div');info.className='status-line vehicle-lookup-info';info.textContent=ep?l.ready:l.off;
    wrap.append(button,info);
    button.addEventListener('click',async()=>{
      const currentEndpoint=endpoint(),text=labels(),value=plate.value.replace(/\s+/g,'').toUpperCase();
      if(!value){info.textContent=text.empty;plate.focus();return;}
      if(!currentEndpoint){info.textContent=text.off;return;}
      button.disabled=true;info.textContent=text.loading;
      try{
        const r=await fetch(currentEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registrationNumber:value})});
        if(!r.ok)throw new Error('lookup failed');const d=await r.json();
        const box=document.createElement('div');box.className='summary';box.style.marginTop='10px';box.innerHTML=`<div class="summary-row"><span>${text.brand}</span><input name="vehicle_brand" value="${esc(d.brand||'')}" aria-label="${text.brand}"></div><div class="summary-row"><span>${text.model}</span><input name="vehicle_model" value="${esc(d.model||'')}" aria-label="${text.model}"></div><div class="summary-row"><span>${text.year}</span><input name="vehicle_year" value="${esc(d.year||'')}" aria-label="${text.year}"></div><div class="summary-row"><span>${text.body}</span><input name="vehicle_body" value="${esc(d.body||'')}" aria-label="${text.body}"></div>`;
        wrap.querySelector('.summary')?.remove();wrap.append(box);info.textContent=text.check;
      }catch(_e){info.textContent=text.fail;}finally{button.disabled=false;}
    });
  }
  function refreshLanguage(){
    const button=document.querySelector('.service-card.open .vehicle-lookup-btn'),info=document.querySelector('.service-card.open .vehicle-lookup-info');if(!button||!info)return;
    const l=labels(),ep=endpoint();button.textContent=l.find;button.disabled=!ep;if(!ep)info.textContent=l.off;
  }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  const obs=new MutationObserver(enhance);obs.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-lang]'))setTimeout(refreshLanguage,0);setTimeout(enhance,0);});
})();
