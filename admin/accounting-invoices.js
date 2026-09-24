(() => {
  const A=window.SIR_ACCT;
  const invoiceStatusLabel={draft:'Черновик',issued:'Выставлен',paid:'Оплачен',credited:'Исправлен кредит-нотой',cancelled:'Отменён',overdue:'Просрочен'};
  A.views.invoices=view=>{
    const s=A.state,enkReady=s.settings?.enk_registered===true,invoiced=new Set(s.invoices.filter(i=>i.kind==='sale').map(i=>i.order_id)),ready=s.orders.filter(o=>o.status==='completed'&&!invoiced.has(o.id));
    view.innerHTML=`${enkReady?'':'<div class="notice warn">ENK ещё не зарегистрирован. Можно вести подготовительный учёт, но официальные счета отключены до регистрации предприятия и заполнения юридических реквизитов.</div>'}<section class="panel"><div class="panel-head"><span>Готовы к выставлению</span><span class="mini">${enkReady?'Номер присваивается только сервером':'Выставление счетов временно заблокировано'}</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Заказ</th><th>Клиент</th><th>Дата выполнения</th><th>Сумма</th><th></th></tr></thead><tbody>${ready.map(o=>`<tr><td><b>${A.esc(o.order_no)}</b></td><td>${A.esc(o.customer_name)}</td><td>${o.completed_at?A.iso(o.completed_at):'—'}</td><td>${A.money(o.final_price??o.preliminary_price)}</td><td>${enkReady?`<button class="btn primary issue-invoice" data-order="${o.id}">Выставить счёт</button>`:'<span class="mini">Ожидает регистрации ENK</span>'}</td></tr>`).join('')||'<tr><td colspan="5">Нет выполненных заказов без счёта.</td></tr>'}</tbody></table></div></section><section class="panel"><div class="panel-head"><span>Счета и кредит-ноты</span><button class="btn" data-export="invoices">CSV</button></div><div class="table-wrap"><table class="table"><thead><tr><th>№</th><th>Дата</th><th>Клиент</th><th>Тип</th><th>Без MVA</th><th>MVA</th><th>Итого</th><th>Статус</th><th></th></tr></thead><tbody>${s.invoices.map(i=>`<tr><td><b>${i.invoice_no}</b></td><td>${A.esc(i.invoice_date)}</td><td>${A.esc(i.buyer_name)}</td><td>${i.kind==='credit'?'Кредит-нота':'Счёт'}</td><td>${A.money(i.amount_net)}</td><td>${A.money(i.vat_amount)}</td><td>${A.money(i.amount_gross)}</td><td>${A.esc(invoiceStatusLabel[i.status]||i.status)}</td><td><div class="toolbar"><a class="btn tiny" href="invoice.html?id=${encodeURIComponent(i.id)}" target="_blank" rel="noopener noreferrer">Открыть</a>${i.kind==='sale'&&i.status==='issued'?`<button class="btn tiny mark-paid" data-id="${i.id}">Оплачено</button><button class="btn tiny credit-note" data-id="${i.id}">Кредит-нота</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="9">Счетов пока нет.</td></tr>'}</tbody></table></div></section>`;
    view.querySelectorAll('.issue-invoice').forEach(b=>b.addEventListener('click',()=>issue(b.dataset.order)));
    view.querySelectorAll('.mark-paid').forEach(b=>b.addEventListener('click',()=>paid(b.dataset.id)));
    view.querySelectorAll('.credit-note').forEach(b=>b.addEventListener('click',()=>credit(b.dataset.id)));
    view.querySelector('[data-export="invoices"]').addEventListener('click',()=>A.exportCsv('invoices'));
  };
  async function issue(orderId){
    if(A.state.settings?.enk_registered!==true){alert('Сначала зарегистрируйте ENK и внесите юридические реквизиты.');return;}
    try{
      const {data,error}=await A.sb.rpc('create_accounting_invoice_from_order',{p_order_id:orderId});if(error)throw error;
      await A.load();A.render();if(data?.id)window.open(`invoice.html?id=${encodeURIComponent(data.id)}`,'_blank','noopener');
    }catch(error){window.SIR_ADMIN_RUNTIME?.record(error,'accounting.invoice_issue');alert('Не удалось выставить счёт. Проверьте реквизиты ENK и данные заказа.');}
  }
  async function paid(id){
    const method=prompt('Способ оплаты: bank / card / cash / vipps / other','bank');if(method===null)return;
    const m=String(method).trim().toLowerCase();if(!Object.keys(A.methods).includes(m)){alert('Допустимые способы: банковский перевод, карта, наличные, Vipps или другое');return;}
    try{const {error}=await A.sb.rpc('set_accounting_invoice_paid',{p_invoice_id:id,p_paid:true,p_method:m});if(error)throw error;await A.load();A.render();}
    catch(error){window.SIR_ADMIN_RUNTIME?.record(error,'accounting.invoice_paid');alert('Не удалось изменить оплату счёта. Изменения не применены.');}
  }
  async function credit(id){
    if(!confirm('Создать новый нумерованный кредит-нот и пометить исходный счёт как исправленный кредит-нотой?'))return;
    try{
      const {data,error}=await A.sb.rpc('create_accounting_credit_note',{p_invoice_id:id});if(error)throw error;
      await A.load();A.render();if(data?.id)window.open(`invoice.html?id=${encodeURIComponent(data.id)}`,'_blank','noopener');
    }catch(error){window.SIR_ADMIN_RUNTIME?.record(error,'accounting.credit_note');alert('Не удалось создать кредит-ноту. Изменения не применены.');}
  }
})();