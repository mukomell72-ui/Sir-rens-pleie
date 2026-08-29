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
    if(n.includes('carpro')) return 'CARPRO';
    if(n.includes('kärcher')||n.includes('karcher')) return 'Kärcher';
    if(n.includes('taski')) return 'TASKI';
    if(n.includes('autoglym')) return 'Autoglym';
    if(n.includes('turtle wax')) return 'Turtle Wax';
    if(n.includes('ecolab')) return 'Ecolab';
    if(n.includes('dasty')) return 'Dasty';
    if(n.includes('eikosha')) return 'Eikosha';
    if(n.includes('bosch')) return 'Bosch';
    if(n.includes('marolex')) return 'Marolex';
    if(n.includes('ava')) return 'AVA';
    return 'Другое';
  };

  const search=q=>'https://bilpleiekongen.no/?s='+encodeURIComponent(q)+'&post_type=product';
  const ali=q=>'https://www.aliexpress.com/wholesale?SearchText='+encodeURIComponent(q);
  const buyLinks={
    'Koch-Chemie Eulex, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Eulex')},
    'Koch-Chemie Fleckenwasser, 1 л':{shop:'Koch-Chemie',url:'https://www.koch-chemie.com/no/produkter/fleckenwasser'},
    'Koch-Chemie Fresh Up, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Fresh Up')},
    'Koch-Chemie Glass Cleaner':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-glass-cleaner/'},
    'Koch-Chemie Glass Cleaner, 5 л':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-glass-cleaner/'},
    'Koch-Chemie Green Star, 1 л':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-green-star-2/'},
    'Koch-Chemie Leather Star, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Leather Star')},
    'Koch-Chemie NanoMagicShampoo':{shop:'Bilpleiekongen',url:search('Koch Chemie NanoMagic Shampoo')},
    'Koch-Chemie NanoMagicShampoo, 5 л':{shop:'Bilpleiekongen',url:search('Koch Chemie NanoMagic Shampoo')},
    'Koch-Chemie Pol Star, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Pol Star')},
    'Koch-Chemie Plast Star siliconölfrei, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Plast Star siliconolfrei')},
    'Koch-Chemie Reactive Rust Remover, 500 мл':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-reactive-rustremover/'},
    'Koch-Chemie Top Star, 1 л':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-top-star/'},
    'CARPRO ReTyre':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/carpro-retyre/'},
    'CARPRO DarkSide':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/carpro-darkside/'},
    'CARPRO Essence Plus':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/carpro-essence-plus/'},
    'Ecolab Carpet B, 500 мл':{shop:'Norengros',url:'https://www.norengros.no/search?query=Ecolab%20Carpet%20B'},
    'Dasty Classic Degreaser Lemon':{shop:'Dasty',url:'https://dasty.com/'},
    'Kärcher FoamStop neutral':{shop:'Kärcher Norge',url:'https://www.karcher.com/no/home-garden-rengjoeringsutstyr/rengjoeringsmidler-for-hjem-og-hage/home-garden/stoevsuger-med-vannfilter-dampsuger/skumstopp/foamstop-neutral-62958730.html'},
    'TASKI Tapi Extract C1b, 5 л':{shop:'Norengros',url:'https://www.norengros.no/search?query=TASKI%20Tapi%20Extract%20C1b'},
    'Autoglym Polar Wash, 2,5 л':{shop:'Bilpleiekongen',url:search('Autoglym Polar Wash')},
    'Turtle Wax Scratch Repair & Renew, 207 мл':{shop:'Turtle Wax Norge',url:'https://turtlewax.no/bilpleie-eksterior/turtle-wax-scratch-repair-renew/'},
    'Kärcher Puzzi 8/1':{shop:'Kärcher Norge',url:'https://www.karcher.com/no/professional-rengjoeringloesninger/tepperensere/moebel-og-tepperensere/puzzi-8-1-11002400.html'},
    'Kärcher Professional Puzzi 8/1':{shop:'Kärcher Norge',url:'https://www.karcher.com/no/professional-rengjoeringloesninger/tepperensere/moebel-og-tepperensere/puzzi-8-1-11002400.html'},
    'AVA P55 Go':{shop:'AVA of Norway',url:'https://avaofnorway.com/'},
    'Eikosha Air Spencer Squash A9':{shop:'Bilpleiekongen',url:search('Eikosha Air Spencer Squash A9')},
    'Eikosha Air Spencer After Shower A22':{shop:'Bilpleiekongen',url:search('Eikosha Air Spencer After Shower A22')},
    'Eikosha Air Spencer Pink Shower A42':{shop:'Bilpleiekongen',url:search('Eikosha Air Spencer Pink Shower A42')},
    'Bosch Serie 4 — сухой пылесос':{shop:'Bosch Norge',url:'https://www.bosch-home.no/produktliste/stovsugere'},
    'Marolex Axel Foamer 2000':{shop:'Bilpleiekongen',url:search('Marolex Axel Foamer 2000')},
    'Шуруповёрт':{shop:'Biltema',url:'https://www.biltema.no/verktoy/el-verktoy/batteridrevne-skrudrillere/'},
    'Круглые синие аппликаторы, 10 шт.':{shop:'AliExpress',url:ali('car detailing foam applicator pads blue')},
    'Светло-голубые безворсовые микрофибры, 20 шт.':{shop:'AliExpress',url:ali('lint free microfiber car detailing cloth blue')},
    'Щётки из конского волоса, 2 шт.':{shop:'AliExpress',url:ali('horse hair detailing brush')},
    'Длинная щётка SEAMETAL':{shop:'AliExpress',url:ali('SEAMETAL car detailing brush')},
    'Набор детейлинг-кистей, 6 шт.':{shop:'AliExpress',url:ali('car detailing brush set 6pcs')},
    'Серые толстые микрофибры, 5 шт.':{shop:'AliExpress',url:ali('thick microfiber car detailing towel grey')},
    'Щётки на шуруповёрт, 4 шт.':{shop:'AliExpress',url:ali('drill brush set car detailing')}
  };
  items.forEach(x=>{ if(buyLinks[x.n]) x.buy=buyLinks[x.n]; });

  const broadCats=['Все','Химия','Расходники','Оборудование'];
  const categoryRank={'Химия':0,'Расходники':1,'Оборудование':2};
  const brandRank={'Koch-Chemie':0,'CARPRO':1,'Kärcher':2,'TASKI':3,'Autoglym':4,'Turtle Wax':5,'Ecolab':6,'Dasty':7,'Eikosha':8,'Bosch':9,'Marolex':10,'AVA':11,'Другое':99};
  let broadActive='Все';

  const style=document.createElement('style');
  style.textContent=`
    .group-title{margin:22px 2px 8px;font-size:15px;font-weight:900;letter-spacing:.08em;color:#7ee4c8;text-transform:uppercase}
    .group-title:first-child{margin-top:12px}
    .brand-title{margin:14px 2px 6px;font-size:12px;font-weight:800;letter-spacing:.06em;color:#9aa7b3;text-transform:uppercase}
    .buy-btn{display:inline-block;margin-top:4px;padding:11px 15px;border-radius:12px;background:#38d3ae;color:#07120f!important;text-decoration:none;font-weight:900}
  `;
  document.head.appendChild(style);

  card=function(x){
    const toolsBlock=x.t?`<div class="sec"><b>Чем чистить / чем наносить</b><p>${x.t}</p></div>`:'';
    const buyBlock=x.buy?`<div class="sec"><b>Где купить</b><p><a class="buy-btn" href="${x.buy.url}" target="_blank" rel="noopener noreferrer">Купить — ${x.buy.shop} ↗</a></p></div>`:`<div class="sec"><b>Где купить</b><p class="warn">Ссылка пока не добавлена</p></div>`;
    return `<article class="card"><div class="head"><div class="label" style="background:${x.col};color:${x.tc||'#111'}">${x.m}</div><div><div class="name">${x.n}</div><div class="mini">${x.f}</div></div><div class="arr">⌄</div></div><div class="body"><div class="sec"><b>Что чистить / назначение</b><p>${x.f}</p></div>${toolsBlock}<div class="sec"><b>Разведение</b><p>${x.d}</p></div><div class="sec"><b>Как чистить / применять</b><p>${x.u}</p></div><div class="sec"><b>Что делать после</b><p>${x.a}</p></div><div class="sec"><b>Риски и ограничения</b><p class="warn">${x.w}</p></div>${buyBlock}<div class="sec"><b>Наличие</b><p class="price">${x.p}</p></div><div class="tags">${(x.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></article>`;
  };

  function renderBroadChips(){
    chips.innerHTML=broadCats.map(c=>`<button class="chip ${c===broadActive?'active':''}" data-c="${c}">${c}</button>`).join('');
    chips.querySelectorAll('button').forEach(b=>b.onclick=()=>{broadActive=b.dataset.c;renderBroadChips();renderBroad();});
  }

  function renderBroad(){
    const s=q.value.toLowerCase().trim();
    const filtered=items.filter(x=>(broadActive==='Все'||broadGroup(x)===broadActive)&&(!s||[x.n,x.c,broadGroup(x),brandOf(x),x.m,x.f,x.t||'',x.d,x.u,x.a,x.w,x.p,x.buy?.shop||'',...(x.tags||[])].join(' ').toLowerCase().includes(s))));
    const ordered=[...filtered].sort((a,b)=>categoryRank[broadGroup(a)]-categoryRank[broadGroup(b)]||(brandRank[brandOf(a)]??99)-(brandRank[brandOf(b)]??99)||brandOf(a).localeCompare(brandOf(b),'ru')||items.indexOf(a)-items.indexOf(b));
    count.textContent=`Найдено ${ordered.length} из ${items.length}`;
    let html='';
    ['Химия','Расходники','Оборудование'].forEach(category=>{
      const categoryItems=ordered.filter(x=>broadGroup(x)===category);
      if(!categoryItems.length) return;
      html+=`<div class="group-title">${category}</div>`;
      [...new Set(categoryItems.map(brandOf))].forEach(brand=>{
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
