(() => {
  const C=window.SIR_CONFIG,root=document.getElementById('backupApp');
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey);
  const tables=['profiles','customers','orders','order_items','appointments','order_events','audit_events','app_settings','price_rules','referrals','chemicals','procedures','order_technology_cards','order_photos'];
  let session,profile;
  init();

  async function init(){
    const {data:{session:s}}=await sb.auth.getSession();session=s;
    if(!session){root.innerHTML='<div class="notice">Сначала войдите в <a href="./">SIR Admin</a>.</div>';return;}
    const {data:p}=await sb.from('profiles').select('role,active,display_name').eq('id',session.user.id).single();profile=p;
    if(!profile?.active||!['owner','admin'].includes(profile.role)){root.innerHTML='<div class="notice">Экспорт доступен только OWNER и ADMIN.</div>';return;}
    render();
  }
  function render(){
    root.innerHTML=`<div class="section-title"><div><h1>Резервная копия SIR</h1><p>Переносимый экспорт бизнес-данных без привязки к одному хостингу.</p></div><a class="btn" href="./">← Admin</a></div>
      <div class="notice safe"><b>Что входит:</b> заказы, клиенты, календарь, цены, настройки, рекомендации, справочник, технологические карты, журнал и метаданные фотографий.</div>
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
  async function exportAll(){
    const btn=document.getElementById('exportBtn'),status=document.getElementById('status');btn.disabled=true;
    try{
      const payload={format:'sir-rens-pleie-backup',format_version:1,exported_at:new Date().toISOString(),source_project:'SIR',tables:{},notes:['Auth passwords are never exported.','order_photos contains metadata/storage paths only; media bytes require a separate storage migration.']};
      for(let i=0;i<tables.length;i++){
        status.textContent=`Читаю ${tables[i]} (${i+1}/${tables.length})…`;
        payload.tables[tables[i]]=await readAll(tables[i]);
      }
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sir-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      status.textContent='Экспорт готов. Храните копию в безопасном месте.';
    }catch(e){status.textContent=`Ошибка: ${e.message}`;}
    finally{btn.disabled=false;}
  }
})();
