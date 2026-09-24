(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('backupApp');
  const sb=window.SIR_ADMIN_SB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const tables=['profiles','customers','orders','order_items','appointments','order_events','order_assessments','audit_events','app_settings','price_rules','referrals','chemicals','procedures','order_technology_cards','order_photos','accounting_entries','accounting_mileage','accounting_assets','accounting_invoices'];
  const tableLabel={profiles:'профили',customers:'клиенты',orders:'заказы',order_items:'позиции заказов',appointments:'календарь',order_events:'события заказов',order_assessments:'осмотры',audit_events:'журнал действий',app_settings:'настройки',price_rules:'цены',referrals:'рекомендации',chemicals:'химия',procedures:'процедуры',order_technology_cards:'технологические карты',order_photos:'фотографии заказов',accounting_entries:'бухгалтерские записи',accounting_mileage:'поездки',accounting_assets:'оборудование',accounting_invoices:'счета'};
  let session,profile;
  init();

  async function init(){
    try{
      const {data:{session:s},error:sessionError}=await sb.auth.getSession();
      if(sessionError)throw sessionError;
      session=s;
      if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">админ-панель SIR</a>.</div>';return;}
      const {data:p,error:profileError}=await sb.from('profiles').select('role,active,display_name').eq('id',session.user.id).single();
      if(profileError)throw profileError;
      profile=p;
      if(!profile?.active||!['owner','admin'].includes(profile.role)){root.innerHTML='<div class="notice">Экспорт доступен только владельцу и администратору.</div>';return;}
      render();
    }catch(error){
      window.SIR_ADMIN_RUNTIME?.record(error,'backup.init');
      root.innerHTML='<div class="notice"><b>Модуль резервной копии не загружен.</b><br>Обновите страницу после восстановления связи.</div>';
    }
  }
  function render(){
    root.innerHTML=`<div class="section-title"><div><h1>Резервная копия SIR</h1><p>Переносимый экспорт бизнес-данных без привязки к одному хостингу.</p></div><a class="btn" href="./">← Админка</a></div>
      <div class="notice safe"><b>Что входит:</b> заказы, клиенты, календарь, повторные осмотры, цены, настройки, рекомендации, справочник, технологические карты, бухгалтерские записи, счета, поездки, оборудование, журнал и метаданные фотографий.</div>
      <div class="notice"><b>Что не входит в JSON:</b> пароли сотрудников и сами бинарные файлы фотографий. Пароли не экспортируются принципиально. Фотографии хранятся отдельно в приватном Storage и при полноценной миграции копируются отдельным этапом.</div>
      <div class="card"><h3>Создать экспорт</h3><p class="mini">Файл содержит номер версии схемы, дату выгрузки и данные таблиц. Его можно использовать как основу переноса в другой PostgreSQL/Supabase-проект.</p><button id="exportBtn" class="btn primary">Скачать резервную копию JSON</button><div id="status" class="mini" style="margin-top:10px"></div></div>`;
    document.getElementById('exportBtn').addEventListener('click',exportAll);
  }
  async function readAll(table){
    const all=[];const page=1000;let from=0;
    while(true){
      const {data,error}=await sb.from(table).select('*').range(from,from+page-1);
      if(error)throw new Error(`${table}: ${error.message}`);
      all.push(...(data||[]));
      if(!data||data.length<page)break;
      from+=page;
    }
    return all;
  }
  async function sha256(value){
    const bytes=new TextEncoder().encode(value);
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function exportAll(){
    const btn=document.getElementById('exportBtn'),status=document.getElementById('status');btn.disabled=true;
    try{
      const payload={format:'sir-rens-pleie-backup',format_version:2,exported_at:new Date().toISOString(),source_project:'SIR',tables:{},manifest:{},notes:['Пароли авторизации никогда не экспортируются.','В order_photos хранятся только метаданные и пути; файлы фотографий переносятся отдельно.']};
      for(let i=0;i<tables.length;i++){
        status.textContent=`Читаю: ${tableLabel[tables[i]]||tables[i]} (${i+1}/${tables.length})…`;
        const rows=await readAll(tables[i]);
        payload.tables[tables[i]]=rows;
        payload.manifest[tables[i]]={rows:rows.length,sha256:await sha256(JSON.stringify(rows))};
      }
      const manifestSource=JSON.stringify({format:payload.format,format_version:payload.format_version,exported_at:payload.exported_at,manifest:payload.manifest});
      payload.integrity={algorithm:'SHA-256',manifest_sha256:await sha256(manifestSource)};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sir-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      status.textContent='Экспорт готов. Храните копию в безопасном месте.';
    }catch(e){window.SIR_ADMIN_RUNTIME?.record(e,'backup.export');status.textContent='Экспорт остановлен: не удалось получить полную подтверждённую копию данных. Частичный файл не создан.';}
    finally{btn.disabled=false;}
  }
})();
