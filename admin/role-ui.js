(() => {
  function actorRole(){
    const badge=document.getElementById('roleBadge');
    const raw=document.documentElement.dataset.adminRole||badge?.dataset.role||badge?.textContent||'';
    return String(raw).trim().toUpperCase();
  }
  function apply(){
    const badge=document.getElementById('roleBadge');
    if(!badge)return;
    const actor=actorRole();
    document.querySelectorAll('[data-owner-admin-only]').forEach(el=>{el.hidden=!['OWNER','ADMIN'].includes(actor);});
    document.querySelectorAll('[data-manager-plus]').forEach(el=>{el.hidden=!['OWNER','ADMIN','MANAGER'].includes(actor);});
    if(actor!=='ADMIN')return;
    document.querySelectorAll('[data-profile]').forEach(row=>{
      const select=row.querySelector('.role');
      const active=row.querySelector('.active');
      const save=row.querySelector('.save-profile');
      if(!select)return;
      const current=select.value;
      if(['owner','admin'].includes(current)){
        select.disabled=true;if(active)active.disabled=true;if(save)save.hidden=true;
        if(!row.querySelector('.owner-lock-note')){
          const td=row.lastElementChild||row;
          const note=document.createElement('div');note.className='mini owner-lock-note';note.textContent='Изменяет только OWNER';td.appendChild(note);
        }
      }else{
        [...select.options].forEach(o=>{if(['owner','admin'].includes(o.value))o.remove();});
      }
    });
  }
  function init(){
    const observer=new MutationObserver(apply);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-role']});
    apply();
  }
  window.SIR_ROLE_UI={apply,actorRole};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
