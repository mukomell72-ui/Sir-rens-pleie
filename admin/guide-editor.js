(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('guideEditor');
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const arr=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
  const lines=v=>String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  let session,profile,chemicals=[],procedures=[],tab='chemicals';
  init();

  async function init(){
    const {data:{session:s}}=await sb.auth.getSession();session=s;
    if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>.</div>';return;}
    const {data:p}=await sb.from('profiles').select('role,active,display_name').eq('id',session.user.id).single();profile=p;
    if(!profile?.active){root.innerHTML='<div class="notice">Доступ отключён.</div>';return;}
    await load();render();
  }
  async function load(){
    const [{data:c=[],error:ce},{data:p=[],error:pe}]=await Promise.all([
      sb.from('chemicals').select('*').order('brand').order('name'),
      sb.from('procedures').select('*').order('surface_type').order('contamination').order('name')
    ]);
    if(ce||pe){root.innerHTML=`<div class="notice">${esc(ce?.message||pe?.message||'Ошибка загрузки')}</div>`;return;}
    chemicals=c;procedures=p;
  }
  const canEdit=()=>['owner','admin'].includes(profile?.role);
  function render(){
    root.innerHTML=`<div class="section-title"><div><h1>Редактор справочника</h1><p>Химия и технологические процедуры меняются здесь без редактирования кода сайта.</p></div><div class="toolbar"><button class="btn ${tab==='chemicals'?'primary':''}" data-tab="chemicals">Химия</button><button class="btn ${tab==='procedures'?'primary':''}" data-tab="procedures">Процедуры</button></div></div>
      <div class="notice safe"><b>Правило SIR:</b> статус <code>manufacturer_verified</code> ставим только после сверки с официальной инструкцией производителя. Непроверенное разведение или смесь не превращается в рабочую инструкцию.</div>
      ${canEdit()?'':'<div class="notice">У вас режим просмотра. Редактирование доступно OWNER и ADMIN.</div>'}
      <div id="guideBody"></div>`;
    root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render();}));
    tab==='chemicals'?renderChemicals():renderProcedures();
  }
  function renderChemicals(){
    const body=root.querySelector('#guideBody');
    body.innerHTML=`<div class="section-title"><div><h2>Химия</h2><p>${chemicals.length} записей</p></div>${canEdit()?'<button class="btn primary" id="addChemical">+ Добавить средство</button>':''}</div>
      <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Средство</th><th>Назначение</th><th>Разведение</th><th>Проверка</th><th>Активно</th><th></th></tr></thead><tbody>${chemicals.map(c=>`<tr><td><b>${esc(c.brand||'')} ${esc(c.name)}</b><div class="mini">${esc(c.category||'')}</div></td><td>${esc((c.intended_surfaces||[]).join(', ')||'—')}</td><td>${esc(c.dilution||'—')}</td><td>${esc(c.verification_status||'draft')}</td><td>${c.active?'да':'нет'}</td><td><button class="btn edit-chemical" data-id="${c.id}">${canEdit()?'Редактировать':'Открыть'}</button></td></tr>`).join('')}</tbody></table></div></div><div id="editArea"></div>`;
    body.querySelector('#addChemical')?.addEventListener('click',()=>chemicalForm(null));
    body.querySelectorAll('.edit-chemical').forEach(b=>b.addEventListener('click',()=>chemicalForm(chemicals.find(x=>x.id===b.dataset.id))));
  }
  function chemicalForm(c){
    const edit=root.querySelector('#editArea');if(!edit)return;
    c=c||{brand:'',name:'',category:'',intended_surfaces:[],prohibited_surfaces:[],dilution:'',application_method:'',dwell_time:'',follow_up:'',warnings:'',purchase_price:null,shop_url:'',verification_status:'draft',source_note:'',active:true};
    edit.innerHTML=`<form class="card" id="chemicalForm"><div class="section-title"><div><h2>${c.id?'Средство':'Новое средство'}</h2><p>${c.id?esc(`${c.brand||''} ${c.name||''}`):'Сначала внесите данные, затем подтверждайте источник.'}</p></div><button class="btn" type="button" id="closeEditor">Закрыть</button></div><div class="settings-grid">
      ${field('brand','Марка',c.brand,true)}${field('name','Название',c.name,true)}${field('category','Категория',c.category)}${field('intended','Разрешённые поверхности через запятую',(c.intended_surfaces||[]).join(', '))}${field('prohibited','Запрещённые/нежелательные поверхности',(c.prohibited_surfaces||[]).join(', '))}${field('dilution','Разведение / готово к применению',c.dilution)}${field('dwell','Выдержка',c.dwell_time)}${field('purchase','Закупочная цена NOK',c.purchase_price??'','number')}${field('shop','Ссылка на магазин',c.shop_url,'url')}${field('source','Официальный источник / инструкция',c.source_note,'url')}
      <div class="field"><label>Статус проверки</label><select name="verification"><option value="draft" ${c.verification_status==='draft'?'selected':''}>draft</option><option value="source_reviewed" ${c.verification_status==='source_reviewed'?'selected':''}>source_reviewed</option><option value="manufacturer_verified" ${c.verification_status==='manufacturer_verified'?'selected':''}>manufacturer_verified</option></select></div><div class="field"><label>Активно</label><select name="active"><option value="true" ${c.active!==false?'selected':''}>Да</option><option value="false" ${c.active===false?'selected':''}>Нет / архив</option></select></div></div>
      ${area('application','Как применять',c.application_method)}${area('follow','Что делать после',c.follow_up)}${area('warnings','Предупреждения / STOP',c.warnings)}
      ${canEdit()?'<button class="btn primary" type="submit">Сохранить</button>':''}</form>`;
    edit.querySelector('#closeEditor').addEventListener('click',()=>{edit.innerHTML='';});
    if(!canEdit())edit.querySelectorAll('input,textarea,select').forEach(x=>x.disabled=true);
    edit.querySelector('#chemicalForm').addEventListener('submit',async e=>{
      e.preventDefault();if(!canEdit())return;const f=new FormData(e.target),verification=String(f.get('verification'));
      const source=String(f.get('source')||'').trim(),dilution=String(f.get('dilution')||'').trim(),application=String(f.get('application')||'').trim();
      if(verification==='manufacturer_verified'&&(!/^https:\/\//i.test(source)||!dilution||!application)){alert('Для manufacturer_verified нужны официальный HTTPS-источник, разведение и способ применения.');return;}
      const row={brand:String(f.get('brand')).trim(),name:String(f.get('name')).trim(),category:String(f.get('category')||'').trim(),intended_surfaces:arr(f.get('intended')),prohibited_surfaces:arr(f.get('prohibited')),dilution,application_method:application,dwell_time:String(f.get('dwell')||'').trim(),follow_up:String(f.get('follow')||'').trim(),warnings:String(f.get('warnings')||'').trim(),purchase_price:numOrNull(f.get('purchase')),shop_url:String(f.get('shop')||'').trim()||null,verification_status:verification,source_note:source||null,active:String(f.get('active'))==='true'};
      const q=c.id?sb.from('chemicals').update(row).eq('id',c.id):sb.from('chemicals').insert(row);const {error}=await q;if(error){alert(error.message);return;}await load();render();
    });
    edit.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderProcedures(){
    const body=root.querySelector('#guideBody');
    body.innerHTML=`<div class="section-title"><div><h2>Процедуры</h2><p>Проходы, сушка, механика и условия STOP</p></div>${canEdit()?'<button class="btn primary" id="addProcedure">+ Добавить процедуру</button>':''}</div>
      <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Процедура</th><th>Поверхность</th><th>Загрязнение</th><th>Риск</th><th>Версия</th><th></th></tr></thead><tbody>${procedures.map(p=>`<tr><td><b>${esc(p.name)}</b><div class="mini">${esc(p.code||'')}</div></td><td>${esc(p.surface_type||'—')}</td><td>${esc(p.contamination||'—')}</td><td><span class="risk ${(p.risk_level||'low').replace('_','-')}">${esc((p.risk_level||'low').toUpperCase())}</span></td><td>${p.version||1}${p.verified?' · verified':''}</td><td><button class="btn edit-procedure" data-id="${p.id}">${canEdit()?'Редактировать':'Открыть'}</button></td></tr>`).join('')||'<tr><td colspan="6">Процедур пока нет.</td></tr>'}</tbody></table></div></div><div id="editArea"></div>`;
    body.querySelector('#addProcedure')?.addEventListener('click',()=>procedureForm(null));
    body.querySelectorAll('.edit-procedure').forEach(b=>b.addEventListener('click',()=>procedureForm(procedures.find(x=>x.id===b.dataset.id))));
  }
  function procedureForm(p){
    const edit=root.querySelector('#editArea');if(!edit)return;
    p=p||{name:'',code:'',surface_type:'',contamination:'medium',risk_level:'caution',steps:[],stop_conditions:[],pass_plan:'',drying_rule:'',mechanical_method:'',chemical_rule:'',source_note:'',verified:false,version:1};
    edit.innerHTML=`<form class="card" id="procedureForm"><div class="section-title"><div><h2>${p.id?'Процедура':'Новая процедура'}</h2><p>При обновлении существующей процедуры версия увеличивается автоматически.</p></div><button class="btn" type="button" id="closeEditor">Закрыть</button></div><div class="settings-grid">
      ${field('name','Название',p.name,true)}${field('code','Код',p.code,true)}${field('surface','Поверхность',p.surface_type,true)}<div class="field"><label>Загрязнение</label><select name="condition"><option value="light" ${p.contamination==='light'?'selected':''}>light</option><option value="medium" ${p.contamination==='medium'?'selected':''}>medium</option><option value="heavy" ${p.contamination==='heavy'?'selected':''}>heavy</option><option value="special" ${p.contamination==='special'?'selected':''}>special</option></select></div><div class="field"><label>Риск</label><select name="risk"><option value="low" ${p.risk_level==='low'?'selected':''}>LOW</option><option value="caution" ${p.risk_level==='caution'?'selected':''}>CAUTION</option><option value="high_risk" ${p.risk_level==='high_risk'?'selected':''}>HIGH RISK</option><option value="stop" ${p.risk_level==='stop'?'selected':''}>STOP</option></select></div>${field('source','Источник / основание',p.source_note,'text')}<div class="field"><label>Проверено SIR</label><select name="verified"><option value="false" ${!p.verified?'selected':''}>Нет</option><option value="true" ${p.verified?'selected':''}>Да</option></select></div></div>
      ${area('pass_plan','Количество/логика проходов',p.pass_plan)}${area('drying_rule','Нужно ли ждать высыхания между проходами',p.drying_rule)}${area('mechanical','Механическое воздействие / инструмент',p.mechanical_method)}${area('chemical_rule','Правило выбора химии',p.chemical_rule)}${area('steps','Шаги — по одному на строку',(Array.isArray(p.steps)?p.steps:[]).join('\n'))}${area('stops','STOP — по одному условию на строку',(Array.isArray(p.stop_conditions)?p.stop_conditions:[]).join('\n'))}
      ${canEdit()?'<button class="btn primary" type="submit">Сохранить</button>':''}</form>`;
    edit.querySelector('#closeEditor').addEventListener('click',()=>{edit.innerHTML='';});
    if(!canEdit())edit.querySelectorAll('input,textarea,select').forEach(x=>x.disabled=true);
    edit.querySelector('#procedureForm').addEventListener('submit',async e=>{
      e.preventDefault();if(!canEdit())return;const f=new FormData(e.target),code=String(f.get('code')).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
      if(!code){alert('Укажите код процедуры.');return;}
      const row={name:String(f.get('name')).trim(),code,surface_type:String(f.get('surface')).trim(),contamination:String(f.get('condition')),risk_level:String(f.get('risk')),steps:lines(f.get('steps')),stop_conditions:lines(f.get('stops')),pass_plan:String(f.get('pass_plan')||'').trim(),drying_rule:String(f.get('drying_rule')||'').trim(),mechanical_method:String(f.get('mechanical')||'').trim(),chemical_rule:String(f.get('chemical_rule')||'').trim(),source_note:String(f.get('source')||'').trim()||null,verified:String(f.get('verified'))==='true'};
      if(row.verified&&(!row.steps.length||!row.stop_conditions.length||!row.pass_plan||!row.drying_rule||!row.chemical_rule)){alert('Проверенная процедура должна содержать шаги, STOP-условия, проходы, сушку и правило выбора химии.');return;}
      const q=p.id?sb.from('procedures').update(row).eq('id',p.id):sb.from('procedures').insert({...row,version:1});const {error}=await q;if(error){alert(error.message);return;}await load();render();
    });
    edit.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function field(name,label,value='',required=false,type='text'){return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''}></div>`;}
  function area(name,label,value=''){return `<div class="field"><label>${label}</label><textarea name="${name}">${esc(value)}</textarea></div>`;}
  function numOrNull(v){const s=String(v??'').trim();return s===''?null:Number(s);}
})();
