(() => {
  const mobile=()=>matchMedia('(max-width:820px)').matches;
  const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollBehavior=()=>reduceMotion()?'auto':'smooth';
  let lastSignature='';
  function activeStep(){return document.querySelector('.service-card.open .service-body #step');}
  function signature(step){
    if(!step)return'';
    const title=step.querySelector('.step-title')?.textContent?.trim()||'';
    const card=step.closest('.service-card')?.dataset.service||'';
    return `${card}|${title}`;
  }
  function moveToStep(){
    if(!mobile())return;
    const step=activeStep();if(!step)return;
    const sig=signature(step);if(!sig||sig===lastSignature)return;
    lastSignature=sig;
    requestAnimationFrame(()=>setTimeout(()=>{
      const target=step.querySelector('.step-title')||step;
      const header=document.querySelector('.topbar');
      const offset=(header?.getBoundingClientRect().height||60)+12;
      const top=target.getBoundingClientRect().top+scrollY-offset;
      scrollTo({top:Math.max(0,top),behavior:scrollBehavior()});
      const first=step.querySelector('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]),select,textarea');
      if(first&&first.matches(':invalid')===false&&first.type!=='file')first.setAttribute('data-sir-next-field','');
    },60));
  }
  addEventListener('DOMContentLoaded',()=>{
    const obs=new MutationObserver(()=>moveToStep());
    obs.observe(document.body,{subtree:true,childList:true});
    addEventListener('resize',()=>{if(!mobile())lastSignature='';},{passive:true});
    document.addEventListener('focusin',e=>{
      if(!mobile()||!e.target.closest('.service-card.open'))return;
      setTimeout(()=>e.target.scrollIntoView({block:'center',behavior:scrollBehavior()}),250);
    });
  });
})();