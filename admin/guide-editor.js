(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('guideEditor');
  const sb=window.SIR_ADMIN_SB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const arr=v=>String(v||'').split(',').map(x=>x.trim()).filter(Boolean);
  const lines=v=>String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const safeArray=v=>Array.isArray(v)?v:[];
  const RU_SURFACE={
    'clean dry tyre sidewall':'чистая сухая боковина шины',
    'tyres':'шины',
    'most modern clear-coated wheels':'большинство современных дисков с прозрачным лаком',
    'paint':'лакокрасочное покрытие',
    'coated_paint':'защищённое/покрытое ЛКП',
    'solvent-resistant paint':'стойкое к растворителям ЛКП',
    'glass':'стекло',
    'ceramic':'керамика',
    'metal':'металл',
    'solvent-resistant textiles':'стойкий к растворителям текстиль',
    'textiles':'текстиль',
    'upholstery':'обивка',
    'headliner':'потолок салона',
    'room air':'воздух в помещении',
    'mirrors':'зеркала',
    'smooth surfaces':'гладкие поверхности',
    'vehicle interior':'салон автомобиля',
    'vehicle exterior':'кузов автомобиля',
    'engine':'двигатель',
    'smooth leather':'гладкая кожа',
    'suede':'замша',
    'perforated leather':'перфорированная кожа',
    'automotive paintwork':'автомобильное ЛКП',
    'external plastic':'наружный пластик',
    'rubber':'резина',
    'door seals':'уплотнители дверей',
    'tyre sidewall':'боковина шины',
    'leather':'кожа',
    'alcantara':'алькантара',
    'carpet':'ковролин',
    'wheels':'колёсные диски',
    'textile':'текстиль',
    'interior_plastic':'пластик салона',
    'interior_rubber':'резина салона'
  };
  const RU_CATEGORY={
    'tyre protection':'защита шин',
    'tyre cleaner':'очиститель шин',
    'exterior':'кузов / наружные работы',
    'solvent residue remover':'удалитель следов на основе растворителя',
    'solvent spot remover':'локальный пятновыводитель на растворителе',
    'odour eliminator':'нейтрализатор запаха',
    'glass cleaner':'очиститель стекла',
    'cleaner':'очиститель',
    'leather care':'уход за кожей',
    'shampoo':'автошампунь',
    'exterior care':'уход за наружным пластиком и резиной',
    'interior textile/leather cleaner':'очиститель текстиля и кожи салона',
    'interior':'салон'
  };
  const RU_DILUTION={
    'Ready to use.':'Готово к применению.',
    'Ready to use; do not dilute.':'Готово к применению; не разбавлять.',
    'Use as supplied; no dilution step is specified on the product page.':'Использовать в исходной концентрации; производитель не указывает разведение.',
    'Use undiluted.':'Использовать неразбавленным.',
    'Sprayable ready application; manufacturer does not specify a dilution step on the product page.':'Готово к распылению; производитель не указывает разведение.',
    'Ready to use / undiluted.':'Готово к применению / использовать неразбавленным.',
    'Interior/textiles: 1:10–1:20. Exterior/engine: 1:5–1:30.':'Салон/текстиль: 1:10–1:20. Кузов/двигатель: 1:5–1:30.',
    'Apply directly as supplied; no dilution step is stated in the manufacturer application instructions.':'Наносить в исходной концентрации; разведение производителем не предусмотрено.',
    '50 ml in 10 L warm water.':'50 мл на 10 л тёплой воды.',
    '1:5–1:20 depending on soil level.':'1:5–1:20 в зависимости от степени загрязнения.',
    'Starting mix 1:5 in foam-gun bottle; adjust up to 1:10 depending on equipment/foam.':'Начальное разведение 1:5 в бачке пенной насадки; при необходимости увеличить до 1:10 в зависимости от оборудования и пены.',
    'Do not mix stronger than 50:50 product:water in compatible foaming equipment.':'Не использовать концентрацию сильнее 50:50 (средство : вода) в совместимом пенообразующем оборудовании.',
    'Pre-spray 5–10%; direct extraction method 2%. Choose one method.':'Предварительное распыление: 5–10%; при прямой экстракции: 2%. Использовать только один из методов.',
    'Legacy bottle dosage verified from label; professional automatic use blocked until exact matching legacy SDS is obtained.':'Дозировка старой версии подтверждена по этикетке; автоматическое профессиональное применение запрещено до получения точного SDS для этой версии.'
  };
  const RU_VERIFY={draft:'черновик',source_reviewed:'источник проверен',manufacturer_verified:'проверено по инструкции производителя'};
  const RU_HSE={unverified:'не проверено',source_reviewed:'источник проверен',verified:'проверено',stop:'STOP — применение запрещено'};
  const RU_RISK={low:'низкий риск',caution:'осторожно',high_risk:'высокий риск',stop:'STOP'};
  const trSurface=v=>RU_SURFACE[String(v??'').trim()]||String(v??'');
  const trCategory=v=>RU_CATEGORY[String(v??'').trim()]||String(v??'');
  const trDilution=v=>RU_DILUTION[String(v??'').trim()]||String(v??'');
  const trVerify=v=>RU_VERIFY[String(v??'').trim()]||String(v??'');
  const trHse=v=>RU_HSE[String(v??'').trim()]||String(v??'');
  const trRisk=v=>RU_RISK[String(v??'').trim()]||String(v??'');
  let session,profile,chemicals=[],procedures=[],tab='chemicals';
  init();

  async function init(){
    try{
      const {data:{session:s},error:sessionError}=await sb.auth.getSession();
      if(sessionError)throw sessionError;
      session=s;
      if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>.</div>';return;}
      const {data:p,error:profileError}=await sb.from('profiles').select('role,active,display_name').eq('id',session.user.id).single();
      if(profileError)throw profileError;
      profile=p;
      if(!profile?.active){root.innerHTML='<div class="notice">Доступ отключён.</div>';return;}
      if(await load())render();
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'guide_editor.init');
      showLoadError();
    }
  }
  function showLoadError(){
    root.innerHTML='<div class="notice"><b>Справочник не загружен.</b><br>Чтобы не редактировать неполные данные, работа редактора заблокирована.</div><button class="btn primary" id="guideRetry">Повторить</button>';
    root.querySelector('#guideRetry')?.addEventListener('click',()=>location.reload());
  }
  async function load(){
    const [chemRes,procRes]=await Promise.all([
      sb.from('chemicals').select('*').order('brand').order('name'),
      sb.from('procedures').select('*').order('surface_type').order('contamination').order('name')
    ]);
    const error=chemRes.error||procRes.error;
    if(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'guide_editor.load');
      showLoadError();
      return false;
    }
    chemicals=chemRes.data||[];procedures=procRes.data||[];
    return true;
  }
  const canEdit=()=>['owner','admin'].includes(profile?.role);
  function render(){
    root.innerHTML=`<div class="section-title"><div><h1>Редактор справочника</h1><p>Химия и технологические процедуры меняются здесь без редактирования кода сайта.</p></div><div class="toolbar"><button class="btn ${tab==='chemicals'?'primary':''}" data-tab="chemicals">Химия</button><button class="btn ${tab==='procedures'?'primary':''}" data-tab="procedures">Процедуры</button></div></div>
      <div class="notice safe"><b>Правило SIR:</b> статус «проверено по инструкции производителя» (<code>manufacturer_verified</code>) ставим только после сверки с официальной инструкцией. В таблице рабочие значения показаны по-русски, исходные данные производителя в базе сохраняются без изменений.</div>
      ${canEdit()?'':'<div class="notice">У вас режим просмотра. Редактирование доступно OWNER и ADMIN.</div>'}
      <div id="guideBody"></div>`;
    root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;render();}));
    tab==='chemicals'?renderChemicals():renderProcedures();
  }
  function renderChemicals(){
    const body=root.querySelector('#guideBody');
    body.innerHTML=`<div class="section-title"><div><h2>Химия</h2><p>${chemicals.length} записей</p></div>${canEdit()?'<button class="btn primary" id="addChemical">+ Добавить средство</button>':''}</div>
      <div class="panel"><div class="table-wrap"><table class="table"><thead><tr><th>Средство</th><th>Назначение</th><th>Разведение</th><th>Проверка</th><th>HMS/SDS</th><th>Риск</th><th>Активно</th><th></th></tr></thead><tbody>${chemicals.map(c=>`<tr><td><b>${esc(c.brand||'')} ${esc(c.name)}</b><div class="mini">${esc(trCategory(c.category||''))}</div></td><td>${esc(safeArray(c.intended_surfaces).map(trSurface).join(', ')||'—')}</td><td>${esc(trDilution(c.dilution||'—'))}</td><td>${esc(trVerify(c.verification_status||'draft'))}</td><td><b>${esc(trHse(c.hse_status||'unverified'))}</b><div class="mini">${c.hse_verified_at?esc(c.hse_verified_at):'не проверено'}</div></td><td><span class="risk ${String(c.risk_level||'caution').replace('_','-')}">${esc(trRisk(c.risk_level||'caution'))}</span>${c.approval_required?'<div class="mini">нужно подтверждение</div>':''}</td><td>${c.active?'да':'нет'}</td><td><button class="btn edit-chemical" data-id="${c.id}">${canEdit()?'Редактировать':'Открыть'}</button></td></tr>`).join('')}</tbody></table></div></div><div id="editArea"></div>`;
    body.querySelector('#addChemical')?.addEventListener('click',()=>chemicalForm(null));
    body.querySelectorAll('.edit-chemical').forEach(b=>b.addEventListener('click',()=>chemicalForm(chemicals.find(x=>x.id===b.dataset.id))));
  }
  function chemicalForm(c){
    const edit=root.querySelector('#editArea');if(!edit)return;
    c=c||{brand:'',name:'',category:'',intended_surfaces:[],prohibited_surfaces:[],dilution:'',application_method:'',dwell_time:'',follow_up:'',warnings:'',purchase_price:null,shop_url:'',verification_status:'draft',source_note:'',active:true,risk_level:'caution',approval_required:false,hse_status:'unverified',sds_url:'',sds_language:'no',sds_revision:'',hse_verified_at:'',hse_hazards:'',hse_ppe:'',hse_first_aid:'',hse_storage:''};
    edit.innerHTML=`<form class="card" id="chemicalForm"><div class="section-title"><div><h2>${c.id?'Средство':'Новое средство'}</h2><p>${c.id?esc(`${c.brand||''} ${c.name||''}`):'Сначала внесите данные, затем подтверждайте источник.'}</p></div><button class="btn" type="button" id="closeEditor">Закрыть</button></div><div class="settings-grid">
      ${field('brand','Марка',c.brand,true)}${field('name','Название',c.name,true)}${field('category','Категория',c.category)}${field('intended','Разрешённые поверхности через запятую',safeArray(c.intended_surfaces).join(', '))}${field('prohibited','Запрещённые/нежелательные поверхности',safeArray(c.prohibited_surfaces).join(', '))}${field('dilution','Разведение / готово к применению',c.dilution)}${field('dwell','Выдержка',c.dwell_time)}${field('purchase','Закупочная цена NOK',c.purchase_price??'','number')}${field('shop','Ссылка на магазин',c.shop_url,'url')}${field('source','Официальный источник / инструкция',c.source_note,'url')}
      <div class="field"><label>Статус технологии</label><select name="verification"><option value="draft" ${c.verification_status==='draft'?'selected':''}>Черновик</option><option value="source_reviewed" ${c.verification_status==='source_reviewed'?'selected':''}>Источник проверен</option><option value="manufacturer_verified" ${c.verification_status==='manufacturer_verified'?'selected':''}>Проверено по инструкции производителя</option></select></div>
      <div class="field"><label>HMS / SDS статус</label><select name="hse_status"><option value="unverified" ${(c.hse_status||'unverified')==='unverified'?'selected':''}>Не проверено — STOP для автоподбора</option><option value="source_reviewed" ${c.hse_status==='source_reviewed'?'selected':''}>Источник проверен</option><option value="verified" ${c.hse_status==='verified'?'selected':''}>Проверено</option><option value="stop" ${c.hse_status==='stop'?'selected':''}>STOP — применение запрещено</option></select></div>
      <div class="field"><label>Риск</label><select name="risk_level"><option value="low" ${c.risk_level==='low'?'selected':''}>Низкий риск</option><option value="caution" ${(c.risk_level||'caution')==='caution'?'selected':''}>Осторожно</option><option value="high_risk" ${c.risk_level==='high_risk'?'selected':''}>Высокий риск</option><option value="stop" ${c.risk_level==='stop'?'selected':''}>STOP</option></select></div>
      <div class="field"><label>Требует подтверждения</label><select name="approval_required"><option value="false" ${!c.approval_required?'selected':''}>Нет</option><option value="true" ${c.approval_required?'selected':''}>Да</option></select></div>
      ${field('sds_url','SDS / HMS URL',c.sds_url||'',false,'url')}${field('sds_language','Язык SDS',c.sds_language||'no')}${field('sds_revision','Версия / дата SDS',c.sds_revision||'')}${field('hse_verified_at','Дата проверки HMS',c.hse_verified_at||'',false,'date')}
      <div class="field"><label>Активно</label><select name="active"><option value="true" ${c.active!==false?'selected':''}>Да</option><option value="false" ${c.active===false?'selected':''}>Нет / архив</option></select></div></div>
      ${area('application','Как применять',c.application_method)}${area('follow','Что делать после',c.follow_up)}${area('warnings','Предупреждения / STOP',c.warnings)}
      ${area('hse_hazards','HMS: опасности / hazard summary',c.hse_hazards||'')}${area('hse_ppe','HMS: СИЗ / PPE',c.hse_ppe||'')}${area('hse_first_aid','HMS: первая помощь',c.hse_first_aid||'')}${area('hse_storage','HMS: хранение / обращение',c.hse_storage||'')}
      ${canEdit()?'<button class="btn primary" type="submit">Сохранить</button>':''}</form>`;
    edit.querySelector('#closeEditor').addEventListener('click',()=>{edit.innerHTML='';});
    if(!canEdit())edit.querySelectorAll('input,textarea,select').forEach(x=>x.disabled=true);
    edit.querySelector('#chemicalForm').addEventListener('submit',async e=>{
      e.preventDefault();if(!canEdit())return;const f=new FormData(e.target),verification=String(f.get('verification'));
      const source=String(f.get('source')||'').trim(),dilution=String(f.get('dilution')||'').trim(),application=String(f.get('application')||'').trim();
      const hseStatus=String(f.get('hse_status')||'unverified'),sdsUrl=String(f.get('sds_url')||'').trim(),sdsLanguage=String(f.get('sds_language')||'').trim().toLowerCase();
      const hseDate=String(f.get('hse_verified_at')||'').trim(),hseHazards=String(f.get('hse_hazards')||'').trim(),hsePpe=String(f.get('hse_ppe')||'').trim(),hseFirst=String(f.get('hse_first_aid')||'').trim(),hseStorage=String(f.get('hse_storage')||'').trim();
      let riskLevel=String(f.get('risk_level')||'caution'),approvalRequired=String(f.get('approval_required'))==='true';
      const active=String(f.get('active'))==='true';
      if(verification==='manufacturer_verified'&&(!/^https:\/\//i.test(source)||!dilution||!application)){alert('Для manufacturer_verified нужны официальный HTTPS-источник, разведение и способ применения.');return;}
      if(active&&verification==='manufacturer_verified'&&hseStatus==='unverified'){alert('Активное manufacturer_verified средство не может иметь HMS=unverified. Сначала проверьте SDS/HMS либо установите STOP.');return;}
      if(['source_reviewed','verified'].includes(hseStatus)&&(!/^https:\/\//i.test(sdsUrl)||!hseDate)){alert('Для HMS=source_reviewed/verified обязательны HTTPS SDS/HMS-источник и дата проверки.');return;}
      if(hseStatus==='verified'&&(!sdsLanguage||!hseHazards||!hsePpe||!hseFirst||!hseStorage)){alert('Для HMS=verified дополнительно обязательны язык SDS, опасности, СИЗ, первая помощь и хранение.');return;}
      if(hseStatus==='stop'){riskLevel='stop';approvalRequired=true;}
      if(riskLevel==='high_risk'||riskLevel==='stop')approvalRequired=true;
      const row={brand:String(f.get('brand')).trim(),name:String(f.get('name')).trim(),category:String(f.get('category')||'').trim(),intended_surfaces:arr(f.get('intended')),prohibited_surfaces:arr(f.get('prohibited')),dilution,application_method:application,dwell_time:String(f.get('dwell')||'').trim(),follow_up:String(f.get('follow')||'').trim(),warnings:String(f.get('warnings')||'').trim(),purchase_price:numOrNull(f.get('purchase')),shop_url:String(f.get('shop')||'').trim()||null,verification_status:verification,source_note:source||null,active,risk_level:riskLevel,approval_required:approvalRequired,hse_status:hseStatus,sds_url:sdsUrl||null,sds_language:sdsLanguage||null,sds_revision:String(f.get('sds_revision')||'').trim()||null,hse_verified_at:hseDate||null,hse_hazards:hseHazards||null,hse_ppe:hsePpe||null,hse_first_aid:hseFirst||null,hse_storage:hseStorage||null};
      const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
      try{
        const q=c.id?sb.from('chemicals').update(row).eq('id',c.id):sb.from('chemicals').insert(row);
        const {error}=await q;if(error)throw error;
        if(await load())render();
      }catch(error){
        window.SIR_ADMIN_RUNTIME?.record(error,'guide_editor.chemical_save');
        alert('Не удалось сохранить карточку химии. Изменения не применены.');
        button.disabled=false;
      }
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
      ${area('pass_plan','Количество/логика проходов',p.pass_plan)}${area('drying_rule','Нужно ли ждать высыхания между проходами',p.drying_rule)}${area('mechanical','Механическое воздействие / инструмент',p.mechanical_method)}${area('chemical_rule','Правило выбора химии',p.chemical_rule)}${area('steps','Шаги — по одному на строку',safeArray(p.steps).join('\n'))}${area('stops','STOP — по одному условию на строку',safeArray(p.stop_conditions).join('\n'))}
      ${canEdit()?'<button class="btn primary" type="submit">Сохранить</button>':''}</form>`;
    edit.querySelector('#closeEditor').addEventListener('click',()=>{edit.innerHTML='';});
    if(!canEdit())edit.querySelectorAll('input,textarea,select').forEach(x=>x.disabled=true);
    edit.querySelector('#procedureForm').addEventListener('submit',async e=>{
      e.preventDefault();if(!canEdit())return;const f=new FormData(e.target),code=String(f.get('code')).trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
      if(!code){alert('Укажите код процедуры.');return;}
      const row={name:String(f.get('name')).trim(),code,surface_type:String(f.get('surface')).trim(),contamination:String(f.get('condition')),risk_level:String(f.get('risk')),steps:lines(f.get('steps')),stop_conditions:lines(f.get('stops')),pass_plan:String(f.get('pass_plan')||'').trim(),drying_rule:String(f.get('drying_rule')||'').trim(),mechanical_method:String(f.get('mechanical')||'').trim(),chemical_rule:String(f.get('chemical_rule')||'').trim(),source_note:String(f.get('source')||'').trim()||null,verified:String(f.get('verified'))==='true'};
      if(row.verified&&(!row.steps.length||!row.stop_conditions.length||!row.pass_plan||!row.drying_rule||!row.chemical_rule)){alert('Проверенная процедура должна содержать шаги, STOP-условия, проходы, сушку и правило выбора химии.');return;}
      const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
      try{
        const q=p.id?sb.from('procedures').update(row).eq('id',p.id):sb.from('procedures').insert({...row,version:1});
        const {error}=await q;if(error)throw error;
        if(await load())render();
      }catch(error){
        window.SIR_ADMIN_RUNTIME?.record(error,'guide_editor.procedure_save');
        alert('Не удалось сохранить процедуру. Изменения не применены.');
        button.disabled=false;
      }
    });
    edit.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function field(name,label,value='',required=false,type='text'){return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''}></div>`;}
  function area(name,label,value=''){return `<div class="field"><label>${label}</label><textarea name="${name}">${esc(value)}</textarea></div>`;}
  function numOrNull(v){const s=String(v??'').trim();return s===''?null:Number(s);}
})();
