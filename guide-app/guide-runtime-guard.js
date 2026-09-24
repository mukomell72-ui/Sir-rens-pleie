(()=>{
  const errors=[];
  const MAX_ERRORS=20;
  function safeText(v){return String(v||'').slice(0,500)}
  function ensureAlert(){
    let el=document.getElementById('sirRuntimeAlert');
    if(el)return el;
    el=document.createElement('div');
    el.id='sirRuntimeAlert';
    el.className='sir-runtime-alert';
    el.setAttribute('role','alert');
    el.innerHTML='<b>STOP: системная ошибка справочника</b><span>Часть данных или функций не загрузилась. Не используйте автоматические рекомендации до перезагрузки и повторной проверки HMS.</span>';
    (document.body||document.documentElement).prepend(el);
    return el;
  }
  function record(type,detail){
    const row={type:safeText(type),detail:safeText(detail),at:new Date().toISOString()};
    errors.push(row);
    if(errors.length>MAX_ERRORS)errors.splice(0,errors.length-MAX_ERRORS);
    window.SIR_RUNTIME_ERRORS=errors;
    try{ensureAlert()}catch{}
  }
  window.SIR_RUNTIME_ERRORS=errors;
  window.SIR_RUNTIME_GUARD={record,showStop:ensureAlert};
  window.addEventListener('error',event=>{
    const target=event.target;
    if(target&&target!==window&&target.tagName==='SCRIPT'){
      record('script-load',target.src||'unknown script');
      return;
    }
    if(event.error||event.message)record('javascript',event.error?.message||event.message);
  },true);
  window.addEventListener('unhandledrejection',event=>{
    record('promise',event.reason?.message||event.reason||'Unhandled promise rejection');
  });
})();
