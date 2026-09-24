(() => {
  if(!window.SIR_ADMIN_I18N&&!document.querySelector('script[data-sir-admin-i18n]')){const i18n=document.createElement('script');i18n.src='../assets/admin-i18n.js?v=20260924-i18n1';i18n.dataset.sirAdminI18n='1';document.head.appendChild(i18n);}
  const C=window.SIR_CONFIG||{};
  const state={errors:[],offline:!navigator.onLine,fatal:false};

  function ensureBanner(){
    let el=document.getElementById('sirRuntimeBanner');
    if(el)return el;
    el=document.createElement('div');
    el.id='sirRuntimeBanner';
    el.className='sir-runtime-banner hidden';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.innerHTML='<div><b id="sirRuntimeTitle">SIR Admin</b><span id="sirRuntimeText"></span></div><button type="button" id="sirRuntimeReload">Обновить</button>';
    (document.body||document.documentElement).appendChild(el);
    el.querySelector('#sirRuntimeReload')?.addEventListener('click',()=>location.reload());
    return el;
  }

  function paint(){
    const el=ensureBanner(),title=el.querySelector('#sirRuntimeTitle'),text=el.querySelector('#sirRuntimeText');
    if(state.fatal){
      title.textContent='Ошибка SIR Admin';
      text.textContent='Критический модуль не загрузился. Данные не изменялись. Обновите страницу.';
      el.classList.remove('hidden','offline');el.classList.add('fatal');return;
    }
    if(state.offline){
      title.textContent='Нет сети';
      text.textContent='Просмотр может быть неполным. Изменения не отправляйте до восстановления подключения.';
      el.classList.remove('hidden','fatal');el.classList.add('offline');return;
    }
    if(state.errors.length){
      title.textContent='SIR Admin восстановился после ошибки';
      text.textContent='Если раздел работает необычно, обновите страницу перед изменением данных.';
      el.classList.remove('hidden','offline','fatal');return;
    }
    el.classList.add('hidden');el.classList.remove('offline','fatal');
  }

  function record(error,context='runtime',fatal=false){
    const message=String(error?.message||error||'Unknown error').slice(0,300);
    state.errors.push({at:new Date().toISOString(),context,message});
    if(state.errors.length>20)state.errors.shift();
    if(fatal)state.fatal=true;
    console.error('[SIR Admin]',context,error);
    paint();
  }

  addEventListener('online',()=>{state.offline=false;paint();});
  addEventListener('offline',()=>{state.offline=true;paint();});
  addEventListener('error',event=>{
    const target=event.target;
    if(target&&target!==window&&(target.tagName==='SCRIPT'||target.tagName==='LINK')){
      record(new Error('Resource failed to load'),`resource:${target.src||target.href||target.tagName}`,true);
      return;
    }
    if(event.error||event.message)record(event.error||new Error(event.message),'window.error');
  },true);
  addEventListener('unhandledrejection',event=>record(event.reason||new Error('Unhandled promise rejection'),'unhandledrejection'));

  let sb=null;
  try{
    if(!C.supabaseUrl||!C.supabasePublishableKey)throw new Error('Supabase configuration missing');
    if(!window.supabase?.createClient)throw new Error('Supabase client library missing');
    sb=window.SIR_ADMIN_SB||window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    window.SIR_ADMIN_SB=sb;
  }catch(error){
    record(error,'bootstrap',true);
  }

  window.SIR_ADMIN_RUNTIME={
    state,
    client:sb,
    record,
    fatal:(error,context='fatal')=>record(error,context,true),
    refresh:paint
  };

  if(document.readyState==='loading')addEventListener('DOMContentLoaded',paint,{once:true});
  else paint();
})();