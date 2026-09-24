(() => {
  const C=window.SIR_CONFIG;
  if(!C?.supabaseUrl||!C?.supabasePublishableKey||!window.supabase)return;
  const client=window.SIR_ADMIN_SB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{auth:{persistSession:true}});
  const observer=new MutationObserver(enhance);observer.observe(document.getElementById('main'),{childList:true,subtree:true});enhance();

  function enhance(){
    const role=(document.getElementById('roleBadge')?.textContent||'').trim().toUpperCase();
    if(role!=='WORKER')return;
    const form=document.getElementById('orderForm');
    if(!form||document.getElementById('workerProgress'))return;
    const tech=document.querySelector('a[href^="technology.html?order="]');if(!tech)return;
    const orderId=new URL(tech.href,location.href).searchParams.get('order');if(!orderId)return;
    const currentStatus=form.querySelector('[name="status"]')?.value||'';
    const action=currentStatus==='scheduled'||currentStatus==='confirmed'
      ?'<button class="btn primary" type="button" data-worker-status="in_progress">▶ Начать работу</button>'
      :currentStatus==='in_progress'
        ?'<button class="btn primary" type="button" data-worker-status="completed">✓ Завершить работу</button>'
        :'<span class="mini">Для текущего статуса рабочих действий нет.</span>';
    const box=document.createElement('div');box.id='workerProgress';box.className='notice safe';box.innerHTML=`<b>Ход работы</b><p class="mini">Исполнитель может менять только разрешённый рабочий этап своего заказа. Цена и управление заказом защищены.</p><div class="toolbar">${action}</div><div class="mini" id="workerStatusMsg"></div>`;
    form.insertAdjacentElement('afterend',box);
    box.querySelectorAll('[data-worker-status]').forEach(btn=>btn.addEventListener('click',()=>setStatus(orderId,btn.dataset.workerStatus,btn)));
  }
  async function setStatus(id,status,btn){
    btn.disabled=true;const msg=document.getElementById('workerStatusMsg');
    try{
      const {data:order,error:readError}=await client.from('orders').select('status,risk_level,assigned_to').eq('id',id).single();
      if(readError)throw readError;
      if(order?.risk_level==='stop'){
        msg.textContent='STOP: работу нельзя начать или завершить, пока риск не снят ответственным лицом.';
        return;
      }
      const valid=(status==='in_progress'&&['scheduled','confirmed'].includes(order?.status))||(status==='completed'&&order?.status==='in_progress');
      if(!valid){msg.textContent='Статус заказа уже изменился. Обновите страницу перед действием.';return;}
      const {error}=await client.from('orders').update({status}).eq('id',id);
      if(error)throw error;
      msg.textContent=status==='in_progress'?'Работа начата.':'Работа отмечена выполненной.';
      setTimeout(()=>location.reload(),500);
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'worker.status');
      msg.textContent='Не удалось изменить статус. Проверьте подключение и условия STOP.';
    }finally{
      btn.disabled=false;
    }
  }
})();
