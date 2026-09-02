(()=>{
  const endpoint=()=>String(window.SIR_CONFIG?.postalLookupUrl||'https://fxdgeizhlhgvybclvmyo.supabase.co/functions/v1/postal-distance').trim();
  const copy={
    ru:{postal:'Почтовый индекс',city:'Город',distance:'Расстояние до Kongsberg, км',loading:'Проверяем индекс…',found:(city,km)=>`${city} подтверждён · около ${km} км по дороге до Kongsberg`,invalid:'Введите норвежский индекс из 4 цифр.',missing:'Индекс не найден. Проверьте цифры.',failed:'Не удалось проверить индекс. Расстояние можно указать вручную.'},
    en:{postal:'Postal code',city:'City',distance:'Distance to Kongsberg, km',loading:'Checking postal code…',found:(city,km)=>`${city} confirmed · about ${km} km by road to Kongsberg`,invalid:'Enter a 4-digit Norwegian postal code.',missing:'Postal code not found. Check the digits.',failed:'Could not check the postal code. Enter the distance manually.'},
    no:{postal:'Postnummer',city:'Poststed',distance:'Avstand til Kongsberg, km',loading:'Kontrollerer postnummer…',found:(city,km)=>`${city} bekreftet · ca. ${km} km på vei til Kongsberg`,invalid:'Skriv inn et norsk postnummer med 4 sifre.',missing:'Postnummeret ble ikke funnet. Kontroller sifrene.',failed:'Kunne ikke kontrollere postnummeret. Avstanden kan fylles inn manuelt.'}
  };
  const language=()=>document.querySelector('[data-lang].active')?.dataset.lang||localStorage.getItem('sir_lang')||'no';
  let timer=0,controller=null;
  function enhance(){
    const root=document.querySelector('.service-card.open .service-body');if(!root)return;
    let postal=root.querySelector('input[name="postal_code"]');
    if(!postal){
      const distanceInput=root.querySelector('input[name="distance_km"]'),addressInput=root.querySelector('input[name="address"]');if(!distanceInput||!addressInput)return;
      const postalField=document.createElement('div');postalField.className='field';postalField.innerHTML='<label data-postal-label>Почтовый индекс</label><input name="postal_code" inputmode="numeric" autocomplete="postal-code" maxlength="4" pattern="[0-9]{4}" placeholder="3616"><div class="status-line" data-postal-status aria-live="polite"></div>';
      const cityField=document.createElement('div');cityField.className='field';cityField.innerHTML='<label data-city-label>Город</label><input name="city" readonly>';
      addressInput.closest('.field').before(postalField,cityField);distanceInput.closest('.field').querySelector('label').setAttribute('data-distance-label','');postal=postalField.querySelector('input');
    }
    if(postal.dataset.enhanced)return;
    postal.dataset.enhanced='1';
    const city=root.querySelector('input[name="city"]'),distance=root.querySelector('input[name="distance_km"]'),status=root.querySelector('[data-postal-status]');
    const translate=()=>{const t=copy[language()]||copy.no;root.querySelector('[data-postal-label]').textContent=t.postal;root.querySelector('[data-city-label]').textContent=t.city;root.querySelector('[data-distance-label]').textContent=t.distance;};
    const lookup=async()=>{
      const t=copy[language()]||copy.no,code=postal.value.replace(/\D/g,'').slice(0,4);postal.value=code;
      if(code.length<4){city.value='';status.textContent=code?t.invalid:'';return;}
      controller?.abort();controller=new AbortController();status.textContent=t.loading;postal.setAttribute('aria-busy','true');
      try{
        const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postalCode:code}),signal:controller.signal});
        const data=await response.json().catch(()=>({}));
        if(!response.ok){city.value='';status.textContent=response.status===404?t.missing:t.failed;return;}
        city.value=data.city||'';distance.value=String(data.distanceKm??'');
        city.dispatchEvent(new Event('input',{bubbles:true}));distance.dispatchEvent(new Event('input',{bubbles:true}));status.textContent=t.found(city.value,distance.value);
      }catch(error){if(error.name!=='AbortError')status.textContent=t.failed;}finally{postal.removeAttribute('aria-busy');}
    };
    postal.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(lookup,300);});postal.addEventListener('blur',lookup);translate();if(postal.value.length===4&&!city.value)lookup();
    document.addEventListener('click',event=>{if(event.target.closest('[data-lang]'))setTimeout(translate,0)},true);
  }
  new MutationObserver(enhance).observe(document.body,{subtree:true,childList:true});document.addEventListener('click',()=>setTimeout(enhance,0),true);enhance();
})();
