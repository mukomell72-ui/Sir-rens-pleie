(()=>{
  const search=(q)=>'https://bilpleiekongen.no/?s='+encodeURIComponent(q)+'&post_type=product';
  const ali=(q)=>'https://www.aliexpress.com/wholesale?SearchText='+encodeURIComponent(q);
  const links={
    'Koch-Chemie Eulex, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Eulex')},
    'Koch-Chemie Fleckenwasser, 1 л':{shop:'Koch-Chemie — страница товара/дилеры',url:'https://www.koch-chemie.com/no/produkter/fleckenwasser'},
    'Koch-Chemie Fresh Up, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Fresh Up')},
    'Koch-Chemie Glass Cleaner':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-glass-cleaner/'},
    'Koch-Chemie Green Star, 1 л':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-green-star-2/'},
    'Koch-Chemie Leather Star, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Leather Star')},
    'Koch-Chemie NanoMagicShampoo':{shop:'Bilpleiekongen',url:search('Koch Chemie NanoMagic Shampoo')},
    'Koch-Chemie Pol Star, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Pol Star')},
    'Koch-Chemie Plast Star siliconölfrei, 1 л':{shop:'Bilpleiekongen',url:search('Koch Chemie Plast Star siliconolfrei')},
    'Koch-Chemie Reactive Rust Remover, 500 мл':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-reactive-rustremover/'},
    'Koch-Chemie Top Star, 1 л':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/koch-chemie-top-star/'},
    'CARPRO ReTyre':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/carpro-retyre/'},
    'CARPRO DarkSide':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/carpro-darkside/'},
    'CARPRO Essence Plus':{shop:'Bilpleiekongen',url:'https://bilpleiekongen.no/produkt/carpro-essence-plus/'},
    'Ecolab Carpet B, 500 мл':{shop:'Norengros — поиск',url:'https://www.norengros.no/search?query=Ecolab%20Carpet%20B'},
    'Dasty Classic Degreaser Lemon':{shop:'Dasty — официальный сайт/дилеры',url:'https://dasty.com/'},
    'Kärcher FoamStop neutral':{shop:'Kärcher Norge',url:'https://www.karcher.com/no/home-garden-rengjoeringsutstyr/rengjoeringsmidler-for-hjem-og-hage/home-garden/stoevsuger-med-vannfilter-dampsuger/skumstopp/foamstop-neutral-62958730.html'},
    'TASKI Tapi Extract C1b, 5 л':{shop:'Norengros — поиск',url:'https://www.norengros.no/search?query=TASKI%20Tapi%20Extract%20C1b'},
    'Autoglym Polar Wash, 2,5 л':{shop:'Bilpleiekongen — поиск',url:search('Autoglym Polar Wash')},
    'Turtle Wax Scratch Repair & Renew, 207 мл':{shop:'Turtle Wax Norge',url:'https://turtlewax.no/bilpleie-eksterior/turtle-wax-scratch-repair-renew/'},
    'Kärcher Puzzi 8/1':{shop:'Kärcher Norge',url:'https://www.karcher.com/no/professional-rengjoeringloesninger/tepperensere/moebel-og-tepperensere/puzzi-8-1-11002400.html'},
    'AVA P55 Go':{shop:'AVA of Norway',url:'https://avaofnorway.com/'},
    'Eikosha Air Spencer Squash A9':{shop:'Bilpleiekongen — поиск',url:search('Eikosha Air Spencer Squash A9')},
    'Eikosha Air Spencer After Shower A22':{shop:'Bilpleiekongen — поиск',url:search('Eikosha Air Spencer After Shower A22')},
    'Eikosha Air Spencer Pink Shower A42':{shop:'Bilpleiekongen — поиск',url:search('Eikosha Air Spencer Pink Shower A42')},
    'Bosch Serie 4 — сухой пылесос':{shop:'Bosch Norge',url:'https://www.bosch-home.no/produktliste/stovsugere'},
    'Marolex Axel Foamer 2000':{shop:'Bilpleiekongen — поиск',url:search('Marolex Axel Foamer 2000')},
    'Шуруповёрт':{shop:'Biltema — шуруповёрты',url:'https://www.biltema.no/verktoy/el-verktoy/batteridrevne-skrudrillere/'},
    'Круглые синие аппликаторы, 10 шт.':{shop:'AliExpress — поиск',url:ali('car detailing foam applicator pads blue')},
    'Светло-голубые безворсовые микрофибры, 20 шт.':{shop:'AliExpress — поиск',url:ali('lint free microfiber car detailing cloth blue')},
    'Щётки из конского волоса, 2 шт.':{shop:'AliExpress — поиск',url:ali('horse hair detailing brush')},
    'Длинная щётка SEAMETAL':{shop:'AliExpress — поиск',url:ali('SEAMETAL car detailing brush')},
    'Набор детейлинг-кистей, 6 шт.':{shop:'AliExpress — поиск',url:ali('car detailing brush set 6pcs')},
    'Серые толстые микрофибры, 5 шт.':{shop:'AliExpress — поиск',url:ali('thick microfiber car detailing towel grey')},
    'Щётки на шуруповёрт, 4 шт.':{shop:'AliExpress — поиск',url:ali('drill brush set car detailing')}
  };

  items.forEach(x=>{ if(links[x.n]) x.buy=links[x.n]; });

  card=function(x){
    const toolsBlock=x.t?`<div class="sec"><b>Чем чистить / чем наносить</b><p>${x.t}</p></div>`:'';
    const buyBlock=x.buy?`<div class="sec"><b>Где купить</b><p><a href="${x.buy.url}" target="_blank" rel="noopener noreferrer" style="color:#7ee4c8;font-weight:800">${x.buy.shop} ↗</a></p></div>`:'';
    return `<article class="card"><div class="head"><div class="label" style="background:${x.col};color:${x.tc||'#111'}">${x.m}</div><div><div class="name">${x.n}</div><div class="mini">${x.f}</div></div><div class="arr">⌄</div></div><div class="body"><div class="sec"><b>Что чистить / назначение</b><p>${x.f}</p></div>${toolsBlock}<div class="sec"><b>Разведение</b><p>${x.d}</p></div><div class="sec"><b>Как чистить / применять</b><p>${x.u}</p></div><div class="sec"><b>Что делать после</b><p>${x.a}</p></div><div class="sec"><b>Риски и ограничения</b><p class="warn">${x.w}</p></div>${buyBlock}<div class="sec"><b>Наличие</b><p class="price">${x.p}</p></div><div class="tags">${(x.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></article>`;
  };
})();
