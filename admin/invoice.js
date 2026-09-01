(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('invoiceApp');
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=v=>`${new Intl.NumberFormat('nb-NO',{minimumFractionDigits:2,maximumFractionDigits:2}).format(+v||0)} NOK`;
  document.getElementById('printBtn').addEventListener('click',()=>window.print());
  document.getElementById('closeBtn').addEventListener('click',()=>window.close());
  init();

  async function init(){
    const id=new URLSearchParams(location.search).get('id');
    if(!id){root.innerHTML='<div class="notice">Не указан счёт.</div>';return;}
    const {data:{session}}=await sb.auth.getSession();
    if(!session){root.innerHTML='<div class="notice">Сначала войдите в SIR Admin.</div>';return;}
    const [{data:p},{data:i,error},{data:s}]=await Promise.all([
      sb.from('profiles').select('role,active').eq('id',session.user.id).single(),
      sb.from('accounting_invoices').select('*').eq('id',id).single(),
      sb.from('app_settings').select('value').eq('key','accounting').maybeSingle()
    ]);
    if(!p?.active||!['owner','admin'].includes(p.role)){root.innerHTML='<div class="notice">Нет доступа.</div>';return;}
    if(error||!i){root.innerHTML='<div class="notice">Счёт не найден.</div>';return;}
    render(i,s?.value||{});
  }

  function render(i,s){
    const title=i.kind==='credit'?'KREDITNOTA':'FAKTURA';
    const org=`Org.nr. ${esc(i.seller_org_no)}${i.seller_mva_registered?' MVA':''}`;
    root.innerHTML=`<article class="invoice-shell"><div class="invoice-head"><div><div class="invoice-brand">${esc(i.seller_name)}</div><div>${esc(i.seller_address)}</div><div>${org}</div></div><div class="invoice-meta"><h1>${title}</h1><div><b>Nr.</b> ${i.invoice_no}</div><div><b>Dato</b> ${esc(i.invoice_date)}</div><div><b>Forfall</b> ${esc(i.due_date)}</div></div></div><div class="invoice-grid"><section><h3>Kunde</h3><div><b>${esc(i.buyer_name)}</b></div><div>${esc(i.buyer_address||'')}</div>${i.buyer_org_no?`<div>Org.nr. ${esc(i.buyer_org_no)}</div>`:''}</section><section><h3>Levering</h3><div>${esc(i.delivery_date)}</div><div>${esc(i.delivery_place)}</div></section></div><table><thead><tr><th>Beskrivelse</th><th class="num">Netto</th><th class="num">MVA</th><th class="num">Beløp</th></tr></thead><tbody><tr><td>${esc(i.description)}</td><td class="num">${money(i.amount_net)}</td><td class="num">${i.vat_rate}% · ${money(i.vat_amount)}</td><td class="num">${money(i.amount_gross)}</td></tr></tbody><tfoot><tr><td colspan="3" class="num"><b>Å betale</b></td><td class="num invoice-total">${money(i.amount_gross)}</td></tr></tfoot></table><div class="invoice-grid"><section><h3>Betaling</h3><div>Betalingsfrist: ${esc(i.due_date)}</div>${s.bank_account?`<div>Kontonummer: <b>${esc(s.bank_account)}</b></div>`:''}${i.payment_method?`<div>Betalingsmåte: ${esc(i.payment_method)}</div>`:''}</section><section><h3>Status</h3><div>${esc(i.status)}</div>${i.paid_at?`<div>Betalt: ${new Date(i.paid_at).toLocaleDateString('nb-NO')}</div>`:''}</section></div><div class="invoice-footer">${i.seller_mva_registered?'MVA er spesifisert i norske kroner. ':''}${i.kind==='credit'?'Denne kreditnotaen korrigerer tidligere salgsdokument. ':''}SIR Rens & Pleie · ${org}</div></article>`;
  }
})();