(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('invoiceApp');
  const sb=window.SIR_ADMIN_SB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=v=>`${new Intl.NumberFormat('nb-NO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(+v||0)} NOK`;
  const invoiceStatusLabel={draft:'Черновик',issued:'Выставлен',paid:'Оплачен',credited:'Исправлен кредит-нотой',cancelled:'Отменён',overdue:'Просрочен'};
  const paymentMethodLabel={bank:'Банковский перевод',card:'Карта',cash:'Наличные',vipps:'Vipps',other:'Другое'};
  document.getElementById('printBtn').addEventListener('click',()=>window.print());
  document.getElementById('closeBtn').addEventListener('click',()=>window.close());
  init();

  async function init(){
    const id=new URLSearchParams(location.search).get('id');
    if(!id){root.innerHTML='<div class="notice">Не указан счёт.</div>';return;}
    try{
      const {data:{session},error:sessionError}=await sb.auth.getSession();
      if(sessionError)throw sessionError;
      if(!session){root.innerHTML='<div class="notice">Сначала войдите в админ-панель SIR.</div>';return;}
      const [profileRes,invoiceRes,settingsRes]=await Promise.all([
        sb.from('profiles').select('role,active').eq('id',session.user.id).single(),
        sb.from('accounting_invoices').select('*').eq('id',id).single(),
        sb.from('app_settings').select('value').eq('key','accounting').maybeSingle()
      ]);
      if(profileRes.error)throw profileRes.error;
      const p=profileRes.data;
      if(!p?.active||!['owner','admin'].includes(p.role)){root.innerHTML='<div class="notice">Нет доступа.</div>';return;}
      if(invoiceRes.error||!invoiceRes.data)throw invoiceRes.error||new Error('invoice not found');
      if(settingsRes.error)window.SIR_ADMIN_RUNTIME?.record(settingsRes.error,'invoice.settings');
      render(invoiceRes.data,settingsRes.data?.value||{});
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'invoice.load');
      root.innerHTML='<div class="notice"><b>Счёт не загружен.</b><br>Печать заблокирована до успешной загрузки подтверждённых данных.</div>';
      document.getElementById('printBtn').disabled=true;
    }
  }

  function render(i,s){
    const title=i.kind==='credit'?'КРЕДИТ-НОТА':'СЧЁТ';
    const org=`Org.nr. ${esc(i.seller_org_no)}${i.seller_mva_registered?' MVA':''}`;
    root.innerHTML=`<article class="invoice-shell"><div class="invoice-head"><div><div class="invoice-brand">${esc(i.seller_name)}</div><div>${esc(i.seller_address)}</div><div>${org}</div></div><div class="invoice-meta"><h1>${title}</h1><div><b>№</b> ${i.invoice_no}</div><div><b>Дата</b> ${esc(i.invoice_date)}</div><div><b>Срок оплаты</b> ${esc(i.due_date)}</div></div></div><div class="invoice-grid"><section><h3>Клиент</h3><div><b>${esc(i.buyer_name)}</b></div><div>${esc(i.buyer_address||'')}</div>${i.buyer_org_no?`<div>Орг. № ${esc(i.buyer_org_no)}</div>`:''}</section><section><h3>Выполнение</h3><div>${esc(i.delivery_date)}</div><div>${esc(i.delivery_place)}</div></section></div><table><thead><tr><th>Описание</th><th class="num">Без MVA</th><th class="num">MVA</th><th class="num">Сумма</th></tr></thead><tbody><tr><td>${esc(i.description)}</td><td class="num">${money(i.amount_net)}</td><td class="num">${i.vat_rate}% · ${money(i.vat_amount)}</td><td class="num">${money(i.amount_gross)}</td></tr></tbody><tfoot><tr><td colspan="3" class="num"><b>К оплате</b></td><td class="num invoice-total">${money(i.amount_gross)}</td></tr></tfoot></table><div class="invoice-grid"><section><h3>Оплата</h3><div>Срок оплаты: ${esc(i.due_date)}</div>${s.bank_account?`<div>Банковский счёт: <b>${esc(s.bank_account)}</b></div>`:''}${i.payment_method?`<div>Способ оплаты: ${esc(paymentMethodLabel[i.payment_method]||i.payment_method)}</div>`:''}</section><section><h3>Статус</h3><div>${esc(invoiceStatusLabel[i.status]||i.status)}</div>${i.paid_at?`<div>Оплачено: ${new Date(i.paid_at).toLocaleDateString('ru-RU')}</div>`:''}</section></div><div class="invoice-footer">${i.seller_mva_registered?'MVA указан в норвежских кронах. ':''}${i.kind==='credit'?'Эта кредит-нота корректирует ранее выставленный документ продажи. ':''}SIR Rens & Pleie · ${org}</div></article>`;
  }
})();