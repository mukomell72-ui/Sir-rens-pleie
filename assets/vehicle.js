(() => {
  const C=window.SIR_CONFIG;
  const endpoint=()=>C.vehicleLookupUrl||(C.supabaseUrl?`${C.supabaseUrl}/functions/v1/vehicle-lookup`:null);
  function enhance(){
    const plate=document.querySelector('.service-card.open input[name="plate"]');
    if(!plate||plate.dataset.enhanced)return;
    plate.dataset.enhanced='1';
    const wrap=plate.parentElement;
    const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Найти автомобиль';button.style.marginTop='8px';
    const info=document.createElement('div');info.className='status-line';info.textContent=endpoint()?'Данные будут запрошены через SIR / Statens vegvesen.':'Автопоиск включится после подключения базы SIR; поля пока вводятся вручную.';
    wrap.append(button,info);
    button.addEventListener('click',async()=>{
      const ep=endpoint();const value=plate.value.replace(/\s+/g,'').toUpperCase();if(!value){plate.focus();return;}if(!ep){info.textContent='Автопоиск пока не подключён.';return;}
      button.disabled=true;info.textContent='Ищем автомобиль…';
      try{
        const r=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registrationNumber:value})});
        if(!r.ok)throw new Error('lookup failed');const d=await r.json();
        const box=document.createElement('div');box.className='summary';box.style.marginTop='10px';box.innerHTML=`<div class="summary-row"><span>Марка</span><input name="vehicle_brand" value="${esc(d.brand||'')}" aria-label="Марка"></div><div class="summary-row"><span>Модель</span><input name="vehicle_model" value="${esc(d.model||'')}" aria-label="Модель"></div><div class="summary-row"><span>Год</span><input name="vehicle_year" value="${esc(d.year||'')}" aria-label="Год"></div><div class="summary-row"><span>Кузов</span><input name="vehicle_body" value="${esc(d.body||'')}" aria-label="Кузов"></div>`;
        wrap.querySelector('.summary')?.remove();wrap.append(box);info.textContent='Проверьте данные — их можно исправить.';
      }catch(e){info.textContent='Не удалось получить данные. Продолжите вручную.';}finally{button.disabled=false;}
    });
  }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  const obs=new MutationObserver(enhance);obs.observe(document.body,{subtree:true,childList:true});document.addEventListener('click',()=>setTimeout(enhance,0));
})();
