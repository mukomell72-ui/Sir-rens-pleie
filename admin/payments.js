(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('paymentsApp');
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=v=>`${new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0}).format(+v||0)} NOK`;
  let session,profile,orders=[],referrals=[],customers=[];
  init();

  async function init(){
    const {data:{session:s}}=await sb.auth.getSession();session=s;
    if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>.</div>';return;}
    const {data:p}=await sb.from('profiles').select('role,active').eq('id',session.user.id).single();profile=p;
    if(!profile?.active||!['owner','admin','manager'].includes(profile.role)){root.innerHTML='<div class="notice">Нет доступа к оплатам и реферальным начислениям.</div>';return;}
    await load();render();
  }
  async function load(){
    const [{data:o=[]},{data:r=[]},{data:c=[]}]=await Promise.all([
      sb.from('orders').select('id,order_no,customer_id,customer_name,phone,status,final_price,preliminary_price,payment_status,paid_at,referral_discount,referral_code_used,created_at').order('created_at',{ascending:false}).limit(300),
      sb.from('referrals').select('*').order('created_at',{ascending:false}).limit(300),
      sb.from('customers').select('id,name,phone,referral_code,credit_balance').limit(500)
    ]);orders=o;referrals=r;customers=c;
  }
  function render(){
    const customerMap=Object.fromEntries(customers.map(c=>[c.id,c]));
    const paid=orders.filter(o=>o.payment_status==='paid').reduce((s,o)=>s+(+o.final_price||+o.preliminary_price||0),0);
    const unpaid=orders.filter(o=>o.status==='completed'&&o.payment_status!=='paid').length;
    const credits=customers.reduce((s,c)=>s+(+c.credit_balance||0),0);
    root.innerHTML=`<div class="section-title"><div><h1>Оплаты и рекомендации</h1><p>Бонус начисляется рекомендателю только после статуса «Выполнен» + «Оплачено».</p></div><a class="btn" href="./">← Admin</a></div>
      <div class="grid"><div class="card metric"><span>Оплачено</span><strong>${money(paid)}</strong></div><div class="card metric"><span>Выполнено, но не оплачено</span><strong>${unpaid}</strong></div><div class="card metric"><span>Бонусы клиентов</span><strong>${money(credits)}</strong></div><div class="card metric"><span>Рекомендации</span><strong>${referrals.length}</strong></div></div>
      <section class="panel"><div class="panel-head">Заказы и оплата</div><div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Клиент</th><th>Статус</th><th>Цена</th><th>Реф. скидка</th><th>Оплата</th><th></th></tr></thead><tbody>${orders.map(o=>`<tr data-order="${o.id}"><td><b>${esc(o.order_no)}</b></td><td>${esc(o.customer_name)}<div class="mini">${esc(o.phone)}</div></td><td>${esc(o.status)}</td><td>${money(o.final_price??o.preliminary_price)}</td><td>${o.referral_discount?money(o.referral_discount):'—'}</td><td><select class="pay-status"><option value="unpaid" ${o.payment_status==='unpaid'?'selected':''}>Не оплачено</option><option value="paid" ${o.payment_status==='paid'?'selected':''}>Оплачено</option><option value="refunded" ${o.payment_status==='refunded'?'selected':''}>Возврат</option></select>${o.paid_at?`<div class="mini">${new Date(o.paid_at).toLocaleString('ru')}</div>`:''}</td><td><button class="btn save-pay">Сохранить</button></td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel"><div class="panel-head">Реферальные начисления</div><div class="table-wrap"><table class="table"><thead><tr><th>Кто рекомендовал</th><th>Новый клиент</th><th>Код</th><th>Бонус</th><th>Скидка</th><th>Статус</th></tr></thead><tbody>${referrals.map(r=>{const a=customerMap[r.referrer_customer_id]||{},b=customerMap[r.referred_customer_id]||{};return`<tr><td>${esc(a.name||'—')}<div class="mini">Баланс: ${money(a.credit_balance)}</div></td><td>${esc(b.name||'—')}</td><td>${esc(r.referral_code)}</td><td>${money(r.referrer_credit)}</td><td>${money(r.new_customer_discount)}</td><td>${esc(r.status)}</td></tr>`}).join('')||'<tr><td colspan="6">Пока нет рекомендаций.</td></tr>'}</tbody></table></div></section>`;
    root.querySelectorAll('.save-pay').forEach(b=>b.addEventListener('click',()=>savePayment(b.closest('[data-order]'))));
  }
  async function savePayment(tr){
    const id=tr.dataset.order,status=tr.querySelector('.pay-status').value;
    const row=orders.find(o=>o.id===id);
    if(status==='paid'&&row?.status!=='completed'&&!confirm('Заказ ещё не имеет статус «Выполнен». Отметить оплату всё равно? Бонус рекомендателю начислится только после завершения заказа.'))return;
    const {error}=await sb.from('orders').update({payment_status:status}).eq('id',id);
    if(error){alert(error.message);return;}
    await load();render();
  }
})();
