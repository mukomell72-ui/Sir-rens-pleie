(()=>{
  const broadGroup=x=>{
    if(x.c==='Оборудование') return 'Оборудование';
    if((x.n||'').toLowerCase().includes('foamstop')) return 'Химия';
    if(x.c==='Расходники'||x.c==='Ароматы') return 'Расходники';
    return 'Химия';
  };
  const broadCats=['Все','Химия','Расходники','Оборудование'];
  const rank={'Химия':0,'Расходники':1,'Оборудование':2};
  let broadActive='Все';

  const style=document.createElement('style');
  style.textContent='.group-title{margin:20px 2px 8px;font-size:15px;font-weight:900;letter-spacing:.08em;color:#7ee4c8;text-transform:uppercase}.group-title:first-child{margin-top:12px}';
  document.head.appendChild(style);

  function renderBroadChips(){
    chips.innerHTML=broadCats.map(c=>`<button class="chip ${c===broadActive?'active':''}" data-c="${c}">${c}</button>`).join('');
    chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      broadActive=b.dataset.c;
      renderBroadChips();
      renderBroad();
    });
  }

  function renderBroad(){
    const s=q.value.toLowerCase().trim();
    const filtered=items.filter(x=>(broadActive==='Все'||broadGroup(x)===broadActive)&&(!s||[x.n,x.c,broadGroup(x),x.m,x.f,x.d,x.u,x.a,x.w,x.p,...x.tags].join(' ').toLowerCase().includes(s))));
    const ordered=[...filtered].sort((a,b)=>rank[broadGroup(a)]-rank[broadGroup(b)]||items.indexOf(a)-items.indexOf(b));
    count.textContent=`Найдено ${ordered.length} из ${items.length}`;
    let html='';
    ['Химия','Расходники','Оборудование'].forEach(g=>{
      const groupItems=ordered.filter(x=>broadGroup(x)===g);
      if(groupItems.length) html+=`<div class="group-title">${g}</div>`+groupItems.map(card).join('');
    });
    list.innerHTML=html;
    list.querySelectorAll('.card').forEach(c=>c.querySelector('.head').onclick=()=>c.classList.toggle('open'));
  }

  q.oninput=renderBroad;
  renderBroadChips();
  renderBroad();
})();
