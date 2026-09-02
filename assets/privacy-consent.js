(() => {
  const consentKey='sir_privacy_consent';
  const version='2026-09-02-v3';
  const termsKey='sir_terms_acknowledgement';
  const termsVersion='2026-09-02-v1';
  const nativeFetch=window.fetch.bind(window);

  window.fetch=(input,init={})=>{
    let url=typeof input==='string'?input:(input?.url||'');
    const isOrder=url.includes('/rest/v1/rpc/public_submit_order');
    if(isOrder){
      if(sessionStorage.getItem(consentKey)!=='yes')return Promise.reject(new Error('privacy notice acknowledgement required'));
      if(typeof init.body==='string'){
        try{
          const body=JSON.parse(init.body);
          if(body?.p_payload){body.p_payload.privacy_accepted=true;body.p_payload.privacy_version=version;body.p_payload.terms_acknowledged=sessionStorage.getItem(termsKey)==='yes';body.p_payload.terms_version=termsVersion;}
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
    if(lang==='ru')return{title:'Конфиденциальность заявки',text:'Я прочитал(а) информацию о конфиденциальности и понимаю, как SIR использует данные заявки и приложенные фотографии.',link:'Подробнее: конфиденциальность',need:'Подтвердите ознакомление с информацией о конфиденциальности.',terms:'Я прочитал(а) условия и понимаю, что это заявка без обязанности оплаты, а цена на сайте ориентировочная. Окончательная цена и запись требуют отдельного подтверждения.',termsLink:'Условия услуги',termsNeed:'Подтвердите ознакомление с условиями и статусом ориентировочной цены.'};
    if(lang==='en')return{title:'Request privacy',text:'I have read the privacy information and understand how SIR uses the request details and attached photos.',link:'More: Privacy',need:'Confirm that you have read the privacy information.',terms:'I have read the terms and understand this is a request without a payment obligation and that website prices are indicative. The final price and appointment require separate confirmation.',termsLink:'Service terms',termsNeed:'Confirm that you have read the terms and indicative-price notice.'};
    return{title:'Personvern for forespørselen',text:'Jeg har lest personverninformasjonen og forstår hvordan SIR bruker opplysningene i forespørselen og eventuelle bilder.',link:'Les mer: Personvern',need:'Bekreft at du har lest personverninformasjonen.',terms:'Jeg har lest vilkårene og forstår at dette er en forespørsel uten betalingsplikt, og at prisene på nettstedet er veiledende. Endelig pris og tidspunkt krever separat bekreftelse.',termsLink:'Vilkår for tjenesten',termsNeed:'Bekreft at du har lest vilkårene og informasjonen om veiledende pris.'};
  }

  function inject(){
    const phone=document.querySelector('.service-card.open .service-body [name="phone"]');
    if(!phone)return;
    const root=phone.closest('.service-body');
    if(root.querySelector('#sirPrivacyConsent'))return;
    const l=labels(),box=document.createElement('div');
    box.className='notice safe privacy-consent';
    box.innerHTML=`<label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer"><input id="sirPrivacyConsent" type="checkbox" style="margin-top:3px" ${sessionStorage.getItem(consentKey)==='yes'?'checked':''}><span><b>${l.title}</b><br>${l.text} <a href="privacy.html" target="_blank" rel="noopener noreferrer">${l.link}</a><span class="privacy-consent-error" hidden style="display:block;margin-top:8px;color:#ffb4b4;font-weight:800">${l.need}</span></span></label><label style="display:flex;gap:10px;align-items:flex-start;cursor:pointer;margin-top:14px"><input id="sirTermsAcknowledgement" type="checkbox" style="margin-top:3px" ${sessionStorage.getItem(termsKey)==='yes'?'checked':''}><span><b>${l.termsLink}</b><br>${l.terms} <a href="terms.html" target="_blank" rel="noopener noreferrer">${l.termsLink}</a><span class="terms-consent-error" hidden style="display:block;margin-top:8px;color:#ffb4b4;font-weight:800">${l.termsNeed}</span></span></label>`;
    root.querySelector('#step')?.appendChild(box);
    const cb=box.querySelector('#sirPrivacyConsent');
    cb.addEventListener('change',e=>{
      const err=box.querySelector('.privacy-consent-error');
      if(e.target.checked){sessionStorage.setItem(consentKey,'yes');box.style.borderLeftColor='var(--accent)';if(err)err.hidden=true;}
      else sessionStorage.removeItem(consentKey);
    });
    const terms=box.querySelector('#sirTermsAcknowledgement');
    terms.addEventListener('change',e=>{const err=box.querySelector('.terms-consent-error');if(e.target.checked){sessionStorage.setItem(termsKey,'yes');if(err)err.hidden=true;}else sessionStorage.removeItem(termsKey);});
  }

  document.addEventListener('click',e=>{
    const next=e.target.closest('.service-card.open #next');if(!next)return;
    const acknowledgement=document.querySelector('.service-card.open #sirPrivacyConsent');
    if(!acknowledgement)return;
    const terms=document.querySelector('.service-card.open #sirTermsAcknowledgement');
    if(!acknowledgement.checked||!terms?.checked){
      e.preventDefault();e.stopImmediatePropagation();
      const box=document.querySelector('.service-card.open .privacy-consent');
      if(box){
        const err=box.querySelector('.privacy-consent-error');if(err)err.hidden=acknowledgement.checked;
        const termsErr=box.querySelector('.terms-consent-error');if(termsErr)termsErr.hidden=!!terms?.checked;
        box.style.borderLeftColor='var(--danger)';
        (acknowledgement.checked?terms:acknowledgement).focus({preventScroll:true});
        setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'center'}),0);
      }
    }
  },true);

  addEventListener('DOMContentLoaded',()=>{
    const observer=new MutationObserver(()=>inject());observer.observe(document.body,{childList:true,subtree:true});inject();
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const old=document.querySelector('.privacy-consent');if(old){old.remove();inject();}},0)));
  });
})();
