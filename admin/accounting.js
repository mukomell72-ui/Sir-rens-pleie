(() => {
  const A=window.SIR_ACCT={};
  const C=window.SIR_CONFIG;
  A.root=document.getElementById('accountingApp');
  A.sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  A.money=v=>`${new Intl.NumberFormat('nb-NO',{minimumFractionDigits:0,maximumFractionDigits:2}).format(+v||0)} NOK`;
  A.num=v=>Number(v||0);
  A.esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  A.iso=d=>new Date(d).toLocaleDateString('ru-RU');
  A.today=()=>new Date().toISOString().slice(0,10);
  A.methods={bank:'Банк',card:'Карта',cash:'Наличные',vipps:'Vipps',other:'Другое'};
  A.categories=['Химия','Расходники','Топливо','Оборудование','Реклама','Телефон / интернет','Страхование','Банк / комиссии','Парковка / дорога','Аренда','Прочее'];
  A.state={session:null,profile:null,settings:{},orders:[],entries:[],mileage:[],assets:[],invoices:[],tab:'dashboard'};
  A.views={};

  A.load=async()=>{
    const s=A.state, since=new Date();since.setFullYear(since.getFullYear()-2);
    const [{data:settingRow},{data:o=[]},{data:e=[]},{data:m=[]},{data:a=[]},{data:i=[]}]=await Promise.all([
      A.sb.from('app_settings').select('value').eq('key','accounting').maybeSingle(),
      A.sb.from('orders').select('id,order_no,customer_name,phone,address,status,service_type,final_price,preliminary_price,completed_at,payment_status,paid_at').gte('created_at',since.toISOString()).order('created_at',{ascending:false}).limit(1000),
      A.sb.from('accounting_entries').select('*').order('entry_date',{ascending:false}).limit(1500),
      A.sb.from('accounting_mileage').select('*').order('trip_date',{ascending:false}).limit(1500),
      A.sb.from('accounting_assets').select('*').order('purchase_date',{ascending:false}).limit(1000),
      A.sb.from('accounting_invoices').select('*').order('invoice_no',{ascending:false}).limit(1000)
    ]);
    s.settings=settingRow?.value||{};s.orders=o;s.entries=e;s.mileage=m;s.assets=a;s.invoices=i;
  };

  A.activeEntries=kind=>A.state.entries.filter(e=>e.kind===kind&&!e.voided_at);
  A.stats=()=>{
    const s=A.state,d=new Date();d.setMonth(d.getMonth()-12);
    const sales=s.orders.filter(o=>o.status==='completed'&&o.completed_at&&new Date(o.completed_at)>=d).reduce((x,o)=>x+A.num(o.final_price??o.preliminary_price),0);
    const manual12=A.activeEntries('manual_income').filter(e=>new Date(e.entry_date)>=new Date(Date.now()-365*864e5)).reduce((x,e)=>x+A.num(e.amount_gross),0);
    const credits12=s.invoices.filter(i=>i.kind==='credit'&&new Date(i.invoice_date)>=new Date(Date.now()-365*864e5)).reduce((x,i)=>x+A.num(i.amount_gross),0);
    const turnover=Math.max(0,sales+manual12+credits12);
    const expense=A.activeEntries('expense').reduce((x,e)=>x+A.num(e.amount_gross)*A.num(e.deductible_percent||100)/100,0);
    const allIncome=s.orders.filter(o=>o.status==='completed').reduce((x,o)=>x+A.num(o.final_price??o.preliminary_price),0)+A.activeEntries('manual_income').reduce((x,e)=>x+A.num(e.amount_gross),0)+s.invoices.filter(i=>i.kind==='credit').reduce((x,i)=>x+A.num(i.amount_gross),0);
    const profit=allIncome-expense,reserve=Math.max(0,profit)*A.num(s.settings.tax_reserve_percent||0)/100;
    const outVat=s.invoices.reduce((x,i)=>x+A.num(i.vat_amount),0);
    const inVat=A.activeEntries('expense').reduce((x,e)=>{const r=A.num(e.vat_rate);if(r<=0)return x;const vat=A.num(e.amount_gross)-A.num(e.amount_gross)/(1+r/100);return x+vat*A.num(e.deductible_percent||100)/100;},0);
    return{turnover,expense,profit,reserve,outVat,inVat,vatPayable:outVat-inVat};
  };

  A.uploadDocument=async(file,folder)=>{
    const allowed=['application/pdf','image/jpeg','image/png','image/webp'];
    if(!allowed.includes(file.type))throw new Error('Допустимы PDF, JPG, PNG или WEBP.');
    if(file.size>15*1024*1024)throw new Error('Файл больше 15 MB.');
    const safe=String(file.name||'document').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-80),d=new Date(),u=A.state.session.user.id;
    const path=`${u}/${folder}/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${crypto.randomUUID()}-${safe}`;
    const {error}=await A.sb.storage.from('accounting-documents').upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw error;return path;
  };
  A.openDocument=async path=>{
    const {data,error}=await A.sb.storage.from('accounting-documents').createSignedUrl(path,300);
    if(error){alert(error.message);return;}window.open(data.signedUrl,'_blank','noopener');
  };
  const csvCell=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const download=(name,rows)=>{const text='\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'),blob=new Blob([text],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  A.exportCsv=type=>{
    const s=A.state;
    if(type==='ledger')return download('sir-regnskap-poster.csv',[['date','type','category','description','counterparty','document_no','gross_nok','vat_rate','business_percent','payment_method','voided'],...s.entries.map(e=>[e.entry_date,e.kind,e.category,e.description,e.counterparty_name,e.document_no,e.amount_gross,e.vat_rate,e.deductible_percent,e.payment_method,e.voided_at?'yes':'no'])]);
    if(type==='invoices')return download('sir-fakturaer.csv',[['invoice_no','type','date','due_date','buyer','description','net_nok','vat_rate','vat_nok','gross_nok','status','paid_at'],...s.invoices.map(i=>[i.invoice_no,i.kind,i.invoice_date,i.due_date,i.buyer_name,i.description,i.amount_net,i.vat_rate,i.vat_amount,i.amount_gross,i.status,i.paid_at||''])]);
    if(type==='mileage')return download('sir-kjorebok.csv',[['date','vehicle','from','to','purpose','km','order_id'],...s.mileage.map(m=>[m.trip_date,m.vehicle_plate,m.start_place,m.end_place,m.purpose,m.kilometers,m.order_id||''])]);
    if(type==='assets')return download('sir-utstyr.csv',[['purchase_date','name','supplier','document_no','price_nok','vat_rate','business_percent','expected_years','disposed_at'],...s.assets.map(a=>[a.purchase_date,a.name,a.supplier,a.document_no,a.purchase_price,a.vat_rate,a.business_use_percent,a.expected_use_years||'',a.disposed_at||''])]);
  };

  A.render=()=>{
    const s=A.state;
    A.root.innerHTML=`<div class="section-title"><div><h1>ENK / Regnskap</h1><p>Внутренний учёт SIR: доходы, расходы, MVA, счета, поездки и документы</p></div><div class="toolbar"><button class="btn" id="refresh">Обновить</button><a class="btn" href="./">← Admin</a></div></div><div class="acct-tabs">${[['dashboard','Обзор'],['ledger','Доходы / расходы'],['invoices','Счета'],['mileage','Поездки'],['assets','Оборудование'],['settings','Настройки ENK']].map(([id,l])=>`<button class="acct-tab ${s.tab===id?'active':''}" data-tab="${id}">${l}</button>`).join('')}</div><div id="acctView"></div>`;
    A.root.querySelector('#refresh').addEventListener('click',async()=>{await A.load();A.render();});
    A.root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{s.tab=b.dataset.tab;A.render();}));
    const view=A.root.querySelector('#acctView'),fn=A.views[s.tab];if(fn)fn(view);
  };

  async function init(){
    const {data:{session}}=await A.sb.auth.getSession();A.state.session=session;
    if(!session){A.root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>.</div>';return;}
    const {data:p,error}=await A.sb.from('profiles').select('role,active,display_name').eq('id',session.user.id).single();
    if(error||!p?.active||!['owner','admin'].includes(p.role)){A.root.innerHTML='<div class="notice">Раздел ENK / Regnskap доступен только OWNER и ADMIN.</div>';return;}
    A.state.profile=p;await A.load();A.render();
  }
  addEventListener('DOMContentLoaded',init);
})();