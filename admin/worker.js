(() => {
  const C=window.SIR_CONFIG;
  if(!C?.supabaseUrl||!C?.supabasePublishableKey||!window.supabase)return;
  const client=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true}});
  const observer=new MutationObserver(enhance);observer.observe(document.getElementById('main'),{childList:true,subtree:true});enhance();

  function enhance(){
    const role=(document.getElementById('roleBadge')?.textContent||'').trim().toUpperCase();
    if(role!=='WORKER')return;
    const form=document.getElementById('orderForm');
    if(!form||document.getElementById('workerProgress'))return;
    const tech=document.querySelector('a[href^="technology.html?order="]');if(!tech)return;
    const orderId=new URL(tech.href,location.href).searchParams.get('order');if(!orderId)return;
    const box=document.createElement('div');box.id='workerProgress';box.className='notice safe';box.innerHTML='<b>Ход работы</b><p class="mini">Исполнитель может только начать назначенную работу, завершить её и добавить внутреннюю заметку. Цена и клиентские данные защищены.</p><div class="toolbar"><button class="btn" type="button" data-worker-status="in_progress">Начать работу</button><button class="btn primary" type="button" data-worker-status="completed">Завершить работу</button></div><div class="mini" id="workerStatusMsg"></div>';
    form.insertAdjacentElement('afterend',box);
    box.querySelectorAll('[data-worker-status]').forEach(btn=>btn.addEventListener('click',()=>setStatus(orderId,btn.dataset.workerStatus,btn)));
  }
  async function setStatus(id,status,btn){
    btn.disabled=true;const msg=document.getElementById('workerStatusMsg');
    const {error}=await client.from('orders').update({status}).eq('id',id);
    if(error){msg.textContent=error.message;btn.disabled=false;return;}
    msg.textContent=status==='in_progress'?'Работа начата.':'Работа отмечена выполненной.';
    setTimeout(()=>location.reload(),500);
  }
})();
