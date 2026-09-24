(() => {
  const C=window.SIR_CONFIG;
  if(!C?.supabaseUrl||!C?.supabasePublishableKey||!window.supabase)return;
  const client=window.SIR_ADMIN_SB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true}});
  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.getElementById('main'),{childList:true,subtree:true});
  enhance();

  function enhance(){
    const form=document.getElementById('orderForm');
    if(!form||document.getElementById('sendOfferBtn'))return;
    const tech=document.querySelector('a[href^="technology.html?order="]');
    if(!tech)return;
    const orderId=new URL(tech.href,location.href).searchParams.get('order');
    if(!orderId)return;
    const badge=document.getElementById('roleBadge');const role=(badge?.dataset.role||badge?.textContent||'').trim().toUpperCase();
    if(!['OWNER','ADMIN','MANAGER'].includes(role))return;
    const box=document.createElement('div');box.className='notice safe';box.innerHTML='<b>Предложение клиенту</b><p class="mini">Сначала сохраните окончательную цену, дату и время. Затем откройте готовое SMS с защищённой ссылкой подтверждения.</p><button class="btn primary" type="button" id="sendOfferBtn">Подготовить SMS клиенту</button><div id="offerStatus" class="mini"></div>';
    form.insertAdjacentElement('afterend',box);
    box.querySelector('#sendOfferBtn').addEventListener('click',()=>issue(orderId));
  }

  async function issue(orderId){
    const btn=document.getElementById('sendOfferBtn'),status=document.getElementById('offerStatus');
    if(!btn||!status)return;
    btn.disabled=true;status.textContent='Готовим защищённую ссылку…';
    try{
      const {data,error}=await client.rpc('issue_order_confirmation_token',{p_order:orderId});
      if(error)throw error;
      if(!data?.order_no||!data?.token||!data?.phone||!data?.appointment_start||data?.final_price==null){
        throw new Error('confirmation payload incomplete');
      }

      const link=new URL('../order/',location.href);
      link.searchParams.set('o',data.order_no);link.searchParams.set('t',data.token);
      const when=new Intl.DateTimeFormat('nb-NO',{weekday:'short',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(data.appointment_start));
      const text=`SIR Rens & Pleie\nTilbud ${data.order_no}\nTjeneste: ${data.service_type||''}\nTid: ${when}\nPris: ${data.final_price} NOK\nBekreft, velg annet tidspunkt eller avbestill her:\n${link.href}`;
      const phone=String(data.phone).trim();
      const normalized=(phone.startsWith('+')?'+':'')+phone.replace(/\D/g,'');
      if(normalized.replace(/\D/g,'').length<6)throw new Error('invalid customer phone');
      status.textContent='Ссылка создана. Открываем SMS — отправка останется под вашим контролем.';
      location.href=`sms:${normalized}?body=${encodeURIComponent(text)}`;
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'offer.issue');
      status.textContent='SMS не открыт. Проверьте окончательную цену, время и телефон клиента, затем повторите.';
    }finally{
      btn.disabled=false;
    }
  }
})();
