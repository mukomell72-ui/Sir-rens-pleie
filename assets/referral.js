(() => {
  const key='sir_referral_code';
  const params=new URLSearchParams(location.search);
  const fromUrl=(params.get('ref')||params.get('referral')||'').trim().toUpperCase();
  const valid=v=>/^SIR-[A-Z0-9]{4,24}$/.test(String(v||'').trim().toUpperCase());
  if(valid(fromUrl))sessionStorage.setItem(key,fromUrl);

  const labels=()=>{
    const lang=localStorage.getItem('sir_lang')||'no';
    if(lang==='ru')return{label:'Код рекомендации',empty:'Можно оставить пустым.',saved:'Код сохранён. Скидка проверится сервером при отправке заказа.',removed:'Код удалён.',invalid:'Проверьте код: формат SIR-XXXXXXXX.',applied:n=>`Скидка по рекомендации применена: ${n} NOK.`};
    if(lang==='en')return{label:'Referral code',empty:'Can be left blank.',saved:'Code saved. The server will verify the discount when the request is sent.',removed:'Code removed.',invalid:'Check the code format: SIR-XXXXXXXX.',applied:n=>`Referral discount applied: ${n} NOK.`};
    return{label:'Anbefalingskode',empty:'Kan stå tomt.',saved:'Koden er lagret. Serveren kontrollerer rabatten når forespørselen sendes.',removed:'Koden er fjernet.',invalid:'Kontroller kodeformatet: SIR-XXXXXXXX.',applied:n=>`Anbefalingsrabatt er brukt: ${n} NOK.`};
  };

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:(input?.url||'');
    const code=sessionStorage.getItem(key)||'';
    const isOrder=url.includes('/rest/v1/rpc/public_submit_order');
    if(code&&isOrder&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body);
        if(body?.p_payload)body.p_payload.referral_code=code;
        init={...init,body:JSON.stringify(body)};
      }catch(_e){}
    }
    const response=await nativeFetch(input,init);
    if(isOrder&&response.ok){
      try{
        const data=await response.clone().json();
        const discount=Number(data?.referral_discount||0);
        sessionStorage.setItem('sir_last_referral_discount',String(discount));
        setTimeout(()=>showAppliedDiscount(discount),40);
      }catch(_e){}
    }
    return response;
  };

  function showAppliedDiscount(discount){
    if(!(discount>0))return;
    const body=document.querySelector('.service-card.open .service-body');
    if(!body)return;
    let note=body.querySelector('.referral-applied');
    if(!note){note=document.createElement('div');note.className='notice safe referral-applied';body.appendChild(note);}
    note.textContent=labels().applied(discount);
  }

  addEventListener('DOMContentLoaded',()=>{
    const host=document.querySelector('.referral');
    if(!host)return;
    const current=sessionStorage.getItem(key)||'';
    const box=document.createElement('div');
    box.style.minWidth='220px';
    box.innerHTML=`<label id="sirReferralLabel" style="display:block;font-size:12px;margin-bottom:6px;opacity:.8"></label><input id="sirReferralCode" autocomplete="off" placeholder="SIR-XXXXXXXX" value="${current.replace(/[&<>\"]/g,'')}" style="width:100%;min-height:42px;border-radius:12px;border:1px solid #31454f;background:#0c1317;color:#fff;padding:10px"><div id="sirReferralStatus" style="font-size:12px;margin-top:6px;opacity:.8"></div>`;
    host.appendChild(box);
    const input=box.querySelector('#sirReferralCode'),status=box.querySelector('#sirReferralStatus'),label=box.querySelector('#sirReferralLabel');
    let statusKind=current?'saved':'empty';
    const refresh=()=>{const l=labels();label.textContent=l.label;status.textContent=l[statusKind];};
    refresh();
    input.addEventListener('change',()=>{
      const v=input.value.trim().toUpperCase();input.value=v;
      if(!v){sessionStorage.removeItem(key);statusKind='removed';refresh();return;}
      if(!valid(v)){statusKind='invalid';refresh();return;}
      sessionStorage.setItem(key,v);statusKind='saved';refresh();
    });
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(refresh,0)));
  });
})();
