(() => {
  const consentKey='sir_privacy_consent';
  const version='2026-08-30-v2';
  const nativeFetch=window.fetch.bind(window);

  window.fetch=(input,init={})=>{
    let url=typeof input==='string'?input:(input?.url||'');
    const isOrder=url.includes('/rest/v1/rpc/public_submit_order');
    if(isOrder){
      if(sessionStorage.getItem(consentKey)!=='yes')return Promise.reject(new Error('privacy notice acknowledgement required'));
      if(typeof init.body==='string'){
        try{
          const body=JSON.parse(init.body);
          if(body?.p_payload){body.p_payload.privacy_accepted=true;body.p_payload.privacy_version=version;}
          init={...init,body:JSON.stringify(body)};
        }catch(_e){}
      }
      url=url.replace('/rest/v1/rpc/public_submit_order','/rest/v1/rpc/public_submit_order_v2');
      input=typeof input==='string'?url:new Request(url,input);
    }
    return nativeFetch(input,init);
  };

  function labels(){
    const lang=localStorage.getItem('sir_lang')||'no';
    if(lang==='ru')return{title:'Конфиденциальность заявки',text:'Я прочитал(а) информацию о конфиденциальности и понимаю, что SIR использует данные заявки и приложенные фотографии, чтобы обработать запрос, связаться со мной и выполнить согласованную услугу.',link:'Подробнее: Personvern',need:'Поставьте галочку, чтобы подтвердить ознакомление с информацией о конфиденциальности.'};
    if(lang==='en')return{title:'Request privacy',text:'I have read the privacy information and understand that SIR uses the request details and attached photos to handle my request, contact me and perform the agreed service.',link:'More: Privacy',need:'Tick the box to confirm that you have read the privacy information.'};
    return{title:'Personvern for forespørselen',text:'Jeg har lest personverninformasjonen og forstår at SIR bruker opplysningene i forespørselen og eventuelle bilder for å behandle henvendelsen, kontakte meg og gjennomføre avtalt tjeneste.',link:'Les mer: Personvern',need:'Kryss av for å bekrefte at du har lest personverninformasjonen.'};
  }

  function inject(){
    const phone=document.querySelector('.service-card.open .service-body [name="phone"]');
    if(!phone)return;
    const root=phone.closest('.service-body');
    if(root.querySelector('#sirPrivacyConsent'))return;
    const l=labels(),box=document.createElement('div');
    box.className='notice safe privacy-consent';
    box.innerHTML=`<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input id="sirPrivacyConsent" type="checkbox" style="margin-top:3px" ${sessionStorage.getItem(consentKey)==='yes'?'checked':''}><span><b>${l.title}</b><br>${l.text} <a href="privacy.html" target="_blank" rel="noopener">${l.link}</a><span class="privacy-consent-error" hidden style="display:block;margin-top:8px;color:#ffb4b4;font-weight:800">${l.need}</span></span></label>`;
    root.querySelector('#step')?.appendChild(box);
    const cb=box.querySelector('#sirPrivacyConsent');
    cb.addEventListener('change',e=>{
      const err=box.querySelector('.privacy-consent-error');
      if(e.target.checked){sessionStorage.setItem(consentKey,'yes');box.style.borderLeftColor='var(--accent)';if(err)err.hidden=true;}
      else sessionStorage.removeItem(consentKey);
    });
  }

  document.addEventListener('click',e=>{
    const next=e.target.closest('.service-card.open #next');if(!next)return;
    const acknowledgement=document.querySelector('.service-card.open #sirPrivacyConsent');
    if(!acknowledgement)return;
    if(!acknowledgement.checked){
      e.preventDefault();e.stopImmediatePropagation();
      const box=document.querySelector('.service-card.open .privacy-consent');
      if(box){
        const err=box.querySelector('.privacy-consent-error');if(err)err.hidden=false;
        box.style.borderLeftColor='var(--danger)';
        acknowledgement.focus({preventScroll:true});
        setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'center'}),0);
      }
    }
  },true);

  addEventListener('DOMContentLoaded',()=>{
    const observer=new MutationObserver(()=>inject());observer.observe(document.body,{childList:true,subtree:true});inject();
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const old=document.querySelector('.privacy-consent');if(old){old.remove();inject();}},0)));
  });
})();
