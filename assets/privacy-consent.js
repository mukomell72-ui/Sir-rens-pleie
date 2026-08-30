(() => {
  const consentKey='sir_privacy_consent';
  const version='2026-08-30';
  const nativeFetch=window.fetch.bind(window);

  window.fetch=(input,init={})=>{
    let url=typeof input==='string'?input:(input?.url||'');
    const isOrder=url.includes('/rest/v1/rpc/public_submit_order');
    if(isOrder){
      if(sessionStorage.getItem(consentKey)!=='yes')return Promise.reject(new Error('privacy consent required'));
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
    if(lang==='ru')return{title:'Согласие на обработку данных',text:'Я согласен(на), что SIR использует данные заявки и фотографии для оценки, связи и выполнения заказа.',link:'Подробнее: Personvern',need:'Подтвердите согласие на обработку данных заказа.'};
    if(lang==='en')return{title:'Data processing consent',text:'I agree that SIR may use the order details and photos to assess, contact me and perform the service.',link:'More: Privacy',need:'Please confirm consent to process the order data.'};
    return{title:'Samtykke til behandling av opplysninger',text:'Jeg godtar at SIR bruker opplysninger og bilder i forespørselen for vurdering, kontakt og gjennomføring av oppdraget.',link:'Les mer: Personvern',need:'Bekreft samtykke til behandling av opplysningene i bestillingen.'};
  }

  function inject(){
    const phone=document.querySelector('.service-card.open .service-body [name="phone"]');
    if(!phone)return;
    const root=phone.closest('.service-body');
    if(root.querySelector('#sirPrivacyConsent'))return;
    const l=labels(),box=document.createElement('div');
    box.className='notice safe privacy-consent';
    box.innerHTML=`<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input id="sirPrivacyConsent" type="checkbox" style="margin-top:3px" ${sessionStorage.getItem(consentKey)==='yes'?'checked':''}><span><b>${l.title}</b><br>${l.text} <a href="privacy.html" target="_blank" rel="noopener">${l.link}</a></span></label>`;
    root.querySelector('#step')?.appendChild(box);
    box.querySelector('#sirPrivacyConsent').addEventListener('change',e=>{if(e.target.checked)sessionStorage.setItem(consentKey,'yes');else sessionStorage.removeItem(consentKey);});
  }

  document.addEventListener('click',e=>{
    const next=e.target.closest('.service-card.open #next');if(!next)return;
    const consent=document.querySelector('.service-card.open #sirPrivacyConsent');
    const accepted=sessionStorage.getItem(consentKey)==='yes';
    if((consent&&!consent.checked)||(!consent&&!accepted)){
      e.preventDefault();e.stopImmediatePropagation();alert(labels().need);
    }
  },true);

  addEventListener('DOMContentLoaded',()=>{
    const observer=new MutationObserver(()=>inject());observer.observe(document.body,{childList:true,subtree:true});inject();
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const old=document.querySelector('.privacy-consent');if(old){old.remove();inject();}},0)));
  });
})();
