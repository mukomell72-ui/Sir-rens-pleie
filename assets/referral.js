(() => {
  const key='sir_referral_code';
  const params=new URLSearchParams(location.search);
  const fromUrl=(params.get('ref')||params.get('referral')||'').trim().toUpperCase();
  const valid=v=>/^SIR-[A-Z0-9]{4,24}$/.test(String(v||'').trim().toUpperCase());
  if(valid(fromUrl))sessionStorage.setItem(key,fromUrl);

  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init={})=>{
    const url=typeof input==='string'?input:(input?.url||'');
    const code=sessionStorage.getItem(key)||'';
    if(code&&url.includes('/rest/v1/rpc/public_submit_order')&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body);
        if(body?.p_payload)body.p_payload.referral_code=code;
        init={...init,body:JSON.stringify(body)};
      }catch(_e){}
    }
    return nativeFetch(input,init);
  };

  addEventListener('DOMContentLoaded',()=>{
    const host=document.querySelector('.referral');
    if(!host)return;
    const current=sessionStorage.getItem(key)||'';
    const box=document.createElement('div');
    box.style.minWidth='220px';
    box.innerHTML=`<label style="display:block;font-size:12px;margin-bottom:6px;opacity:.8">Код рекомендации</label><input id="sirReferralCode" autocomplete="off" placeholder="SIR-XXXXXXXX" value="${current.replace(/[&<>\"]/g,'')}" style="width:100%;min-height:42px;border-radius:12px;border:1px solid #31454f;background:#0c1317;color:#fff;padding:10px"><div id="sirReferralStatus" style="font-size:12px;margin-top:6px;opacity:.8">${current?'Код сохранён. Скидка проверится сервером при отправке заказа.':'Можно оставить пустым.'}</div>`;
    host.appendChild(box);
    const input=box.querySelector('#sirReferralCode'),status=box.querySelector('#sirReferralStatus');
    input.addEventListener('change',()=>{
      const v=input.value.trim().toUpperCase();input.value=v;
      if(!v){sessionStorage.removeItem(key);status.textContent='Код удалён.';return;}
      if(!valid(v)){status.textContent='Проверьте код: формат SIR-XXXXXXXX.';return;}
      sessionStorage.setItem(key,v);status.textContent='Код сохранён. Скидка проверится сервером при отправке заказа.';
    });
  });
})();
