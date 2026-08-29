(()=>{
  const broadGroup=x=>{
    if(x.c==='Оборудование') return 'Оборудование';
    if((x.n||'').toLowerCase().includes('foamstop')) return 'Химия';
    if(x.c==='Расходники'||x.c==='Ароматы') return 'Расходники';
    return 'Химия';
  };

  const brandOf=x=>{
    const n=(x.n||'').toLowerCase();
    if(n.includes('koch')) return 'Koch-Chemie';
    if(n.includes('carpro')) return 'CarPro';
    if(n.includes('kärcher')||n.includes('karcher')) return 'Kärcher';
    if(n.includes('eikosha')) return 'Eikosha';
    if(n.includes('taski')) return 'TASKI';
    if(n.includes('autoglym')) return 'Autoglym';
    if(n.includes('turtle wax')) return 'Turtle Wax';
    if(n.includes('bosch')) return 'Bosch';
    if(n.includes('marolex')) return 'Marolex';
    if(n.includes('ava')) return 'AVA';
    return 'Другое';
  };

  const broadCats=['Все','Химия','Расходники','Оборудование'];
  const categoryRank={'Химия':0,'Расходники':1,'Оборудование':2};
  const brandRank={
    'Koch-Chemie':0,
    'CarPro':1,
    'Kärcher':2,
    'TASKI':3,
    'Autoglym':4,
    'Turtle Wax':5,
    'Eikosha':6,
    'Bosch':7,
    'Marolex':8,
    'AVA':9,
    'Другое':99
  };
  let broadActive='Все';

  const style=document.createElement('style');
  style.textContent=`
    .group-title{margin:22px 2px 8px;font-size:15px;font-weight:900;letter-spacing:.08em;color:#7ee4c8;text-transform:uppercase}
    .group-title:first-child{margin-top:12px}
    .brand-title{margin:14px 2px 6px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#9aa7b3;text-transform:uppercase}
  `;
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
    const filtered=items.filter(x=>(broadActive==='Все'||broadGroup(x)===broadActive)&&(!s||[x.n,x.c,broadGroup(x),brandOf(x),x.m,x.f,x.d,x.u,x.a,x.w,x.p,...x.tags].join(' ').toLowerCase().includes(s))));
    const ordered=[...filtered].sort((a,b)=>
      categoryRank[broadGroup(a)]-categoryRank[broadGroup(b)] ||
      (brandRank[brandOf(a)]??99)-(brandRank[brandOf(b)]??99) ||
      brandOf(a).localeCompare(brandOf(b),'ru') ||
      items.indexOf(a)-items.indexOf(b)
    );

    count.textContent=`Найдено ${ordered.length} из ${items.length}`;
    let html='';

    ['Химия','Расходники','Оборудование'].forEach(category=>{
      const categoryItems=ordered.filter(x=>broadGroup(x)===category);
      if(!categoryItems.length) return;
      html+=`<div class="group-title">${category}</div>`;

      const brands=[...new Set(categoryItems.map(brandOf))];
      brands.forEach(brand=>{
        const brandItems=categoryItems.filter(x=>brandOf(x)===brand);
        html+=`<div class="brand-title">${brand}</div>`+brandItems.map(card).join('');
      });
    });

    list.innerHTML=html;
    list.querySelectorAll('.card').forEach(c=>c.querySelector('.head').onclick=()=>c.classList.toggle('open'));
  }

  q.oninput=renderBroad;
  renderBroadChips();
  renderBroad();
})();
