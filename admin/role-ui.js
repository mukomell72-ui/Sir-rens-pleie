(() => {
  function apply(){
    const badge=document.getElementById('roleBadge');
    if(!badge)return;
    const actor=(badge.textContent||'').trim().toUpperCase();
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
  addEventListener('DOMContentLoaded',()=>{
    const observer=new MutationObserver(apply);observer.observe(document.body,{subtree:true,childList:true});apply();
  });
})();
