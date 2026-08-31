(() => {
  const distanceKey='sir_order_distance_km';
  const numberFrom=text=>{
    const digits=String(text||'').replace(/[^0-9]/g,'');
    return digits?Number(digits):null;
  };
  const money=n=>`${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(Number(n)||0)} NOK`;
  const labels=()=>{
    const lang=localStorage.getItem('sir_lang')||'no';
    if(lang==='ru')return{note:'Минимальный выездной заказ — {min} + доплата за расстояние. В расчёте ниже минимум уже учтён.'};
    if(lang==='en')return{note:'Minimum mobile order is {min} plus travel. The estimate below already includes the minimum.'};
    return{note:'Minste bestilling for mobil service er {min} pluss kjøring. Minstebeløpet er allerede tatt med i estimatet.'};
  };
  function travelFor(km){
    const rows=window.SIR_CONFIG?.pricing?.travel||[];
    for(const r of rows)if(km<=Number(r.maxKm))return Number(r.price)||0;
    return null;
  }
  function patch(){
    const card=document.querySelector('.service-card.open');if(!card)return;
    const priceEl=card.querySelector('.summary .price');if(!priceEl)return;
    const shown=numberFrom(priceEl.textContent);if(shown==null)return;
    const min=Number(window.SIR_CONFIG?.pricing?.minimumMobileOrder)||0;
    const km=Number(sessionStorage.getItem(distanceKey)||0);
    const travel=travelFor(km);if(travel==null)return;
    const minimumTotal=min+travel;
    const wantedPrice=money(minimumTotal);
    if(shown<minimumTotal&&priceEl.textContent!==wantedPrice)priceEl.textContent=wantedPrice;
    let note=card.querySelector('.mobile-minimum-note');
    if(!note){note=document.createElement('div');note.className='notice safe mobile-minimum-note';card.querySelector('.summary')?.after(note);}
    if(note){
      const wantedNote=labels().note.replace('{min}',money(min));
      if(note.textContent!==wantedNote)note.textContent=wantedNote;
    }
  }
  document.addEventListener('input',e=>{if(e.target?.matches?.('[name="distance_km"]'))sessionStorage.setItem(distanceKey,String(e.target.value||0));});
  document.addEventListener('change',e=>{if(e.target?.matches?.('[name="distance_km"]'))sessionStorage.setItem(distanceKey,String(e.target.value||0));});
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-lang]'))setTimeout(patch,20);});
  addEventListener('DOMContentLoaded',()=>{
    const obs=new MutationObserver(()=>patch());obs.observe(document.body,{childList:true,subtree:true});patch();
  });
})();
