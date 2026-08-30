(() => {
  const C=window.SIR_CONFIG;
  if(!C?.supabaseUrl||!C?.supabasePublishableKey||!window.supabase)return;
  const client=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true}});
  let lastOrderId='';

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
    const role=(document.getElementById('roleBadge')?.textContent||'').trim().toUpperCase();
    if(!['OWNER','ADMIN','MANAGER'].includes(role))return;
    lastOrderId=orderId;
    const box=document.createElement('div');box.className='notice safe';box.innerHTML='<b>Предложение клиенту</b><p class="mini">Сначала сохраните окончательную цену, дату и время. Затем откройте готовое SMS с защищённой ссылкой подтверждения.</p><button class="btn primary" type="button" id="sendOfferBtn">Подготовить SMS клиенту</button><div id="offerStatus" class="mini"></div>';
    form.insertAdjacentElement('afterend',box);
    box.querySelector('#sendOfferBtn').addEventListener('click',()=>issue(orderId));
  }

  async function issue(orderId){
    const btn=document.getElementById('sendOfferBtn'),status=document.getElementById('offerStatus');
    btn.disabled=true;status.textContent='Готовим защищённую ссылку…';
    const {data,error}=await client.rpc('issue_order_confirmation_token',{p_order:orderId});
    if(error){status.textContent='Сначала проверьте цену и календарь: '+error.message;btn.disabled=false;return;}
    const [{data:order},{data:appt}]=await Promise.all([
      client.from('orders').select('phone,final_price,service_type').eq('id',orderId).single(),
      client.from('appointments').select('starts_at,address,location_mode').eq('order_id',orderId).order('starts_at',{ascending:false}).limit(1).maybeSingle()
    ]);
    const link=new URL('../order/',location.href);link.searchParams.set('o',data.order_no);link.searchParams.set('t',data.token);
    const when=appt?.starts_at?new Intl.DateTimeFormat('nb-NO',{weekday:'short',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(appt.starts_at)):'—';
    const text=`SIR Rens & Pleie\nTilbud ${data.order_no}\nTjeneste: ${order?.service_type||''}\nTid: ${when}\nPris: ${order?.final_price||0} NOK\nBekreft, velg annet tidspunkt eller avbestill her:\n${link.href}`;
    status.textContent='Ссылка создана. Открываем SMS — отправка останется под вашим контролем.';
    location.href=`sms:${order?.phone||''}?body=${encodeURIComponent(text)}`;
    btn.disabled=false;
  }
})();
