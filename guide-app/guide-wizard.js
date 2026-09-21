(()=>{
  const items=window.SIR_ITEMS||[];
  const zoneEl=document.getElementById('wizZone');
  const levelEl=document.getElementById('wizLevel');
  const dirtEl=document.getElementById('wizDirt');
  const result=document.getElementById('wizResult');
  const buildBtn=document.getElementById('wizBuild');
  if(!zoneEl||!levelEl||!dirtEl||!result||!buildBtn)return;

  const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const find=name=>items.find(x=>String(x.n||'').toLowerCase().includes(name.toLowerCase()));
  const product=name=>{
    const x=find(name);
    return x||{n:name,d:'Проверьте карточку средства в справочнике.',u:'Следуйте инструкции производителя.',a:'Полностью удалить остатки и высушить поверхность.',w:'Сначала тест на незаметном участке.',t:''};
  };
  const ratio=(r,total=500)=>{
    const chem=Math.round(total/(r+1));
    const water=total-chem;
    return `1:${r} = 1 часть средства + ${r} частей воды. Для ~${total} мл: ${chem} мл средства + ${water} мл воды.`;
  };
  const polStarMix=level=>{
    if(level==='light')return ratio(20);
    if(level==='medium')return ratio(15);
    return ratio(10);
  };
  const zones={
    body:'Кузов / ЛКП',
    wheel:'Колесо целиком',
    rim:'Диски',
    tire:'Шины',
    glass:'Стекло',
    exteriorPlastic:'Наружный пластик',
    interiorPlastic:'Пластик салона',
    textile:'Сиденья / ткань',
    leather:'Кожа',
    carpet:'Ковролин / коврики',
    headliner:'Потолок'
  };
  const dirtOptions={
    body:[
      ['road','Обычная дорожная грязь'],
      ['iron','Металлические вкрапления / ржавый налёт'],
      ['tar','Битум / смола / клей']
    ],
    wheel:[
      ['road','Обычная грязь + тормозная пыль'],
      ['iron','Сильная металлическая пыль'],
      ['unknown','Неизвестное / деликатное покрытие']
    ],
    rim:[
      ['road','Обычная грязь / тормозная пыль'],
      ['iron','Металлические вкрапления'],
      ['unknown','Неизвестное / деликатное покрытие']
    ],
    tire:[
      ['road','Обычная грязь'],
      ['brown','Коричневый налёт / старый чернитель']
    ],
    glass:[
      ['road','Пыль / жир / дорожная плёнка'],
      ['insects','Насекомые / стойкие следы']
    ],
    exteriorPlastic:[
      ['road','Обычная грязь'],
      ['grease','Жирная / стойкая грязь'],
      ['faded','Тусклый / пересушенный пластик']
    ],
    interiorPlastic:[
      ['dust','Пыль / лёгкая грязь'],
      ['grease','Жир / стойкая грязь'],
      ['residue','Белёсые следы / остатки прошлой химии']
    ],
    textile:[
      ['road','Обычная грязь'],
      ['stain','Локальное жирное пятно'],
      ['hair','Шерсть / волосы'],
      ['odor','Запах после загрязнения']
    ],
    leather:[
      ['road','Обычная грязь'],
      ['grease','Жир / сильное загрязнение']
    ],
    carpet:[
      ['road','Песок / обычная грязь'],
      ['stain','Локальное жирное пятно'],
      ['hair','Шерсть / волосы'],
      ['odor','Запах после загрязнения']
    ],
    headliner:[
      ['road','Пыль / лёгкое загрязнение'],
      ['spot','Локальное пятно']
    ]
  };

  function fillDirt(){
    const opts=dirtOptions[zoneEl.value]||dirtOptions.body;
    dirtEl.innerHTML=opts.map(([v,l])=>`<option value="${h(v)}">${h(l)}</option>`).join('');
  }

  function step(title,name,action,opts={}){
    const x=product(name);
    return {
      title,
      product:x.n,
      dilution:opts.dilution||x.d||'—',
      tool:opts.tool||x.t||'',
      action:action||x.u||'',
      after:opts.after||x.a||'',
      warning:opts.warning||x.w||'',
      risk:opts.risk||'LOW'
    };
  }
  function manual(title,action,opts={}){
    return {title,product:opts.product||'Без химии',dilution:opts.dilution||'—',tool:opts.tool||'',action,after:opts.after||'',warning:opts.warning||'',risk:opts.risk||'LOW'};
  }

  function baseRinse(){
    return manual('Предварительный смыв','Сбейте песок и рыхлую грязь водой сверху вниз.',{
      product:'AVA P55 Go',
      tool:'Мойка высокого давления. Держите безопасную дистанцию.',
      warning:'Не подносить сопло вплотную к повреждённому ЛКП, эмблемам, уплотнителям и электроразъёмам.',
      risk:'LOW'
    });
  }
  function shampoo(){
    return step('Контактная мойка','NanoMagicShampoo','Вымойте кузов мягкой рукавицей сверху вниз, не давая раствору высохнуть. Затем тщательно смойте.',{
      dilution:'50 мл на 10 л воды (примерно 1:200). Для 5 л воды — 25 мл средства.',
      tool:'Ведро + мягкая рукавица/губка.',
      after:'Тщательно смыть и безопасно высушить чистой микрофиброй.',
      risk:'LOW'
    });
  }
  function polStar(level,areaAction){
    return step('Основная очистка','Pol Star',areaAction,{
      dilution:`${polStarMix(level)} Подтверждённый диапазон Pol Star: 1:5–1:20; начинаем с более слабого раствора.`,
      risk:level==='heavy'?'CAUTION':'LOW'
    });
  }

  function makePlan(zone,level,dirt){
    const steps=[];
    let risk='LOW';
    let note='Работайте на холодной поверхности. Сначала тест на незаметном участке. Не допускайте высыхания химии там, где требуется смыв.';

    if(zone==='body'){
      steps.push(baseRinse());
      if(dirt==='iron'){
        steps.push(step('Удаление металлических вкраплений','Reactive Rust Remover','Нанесите на холодную очищенную поверхность. Дождитесь визуальной реакции, не допускайте высыхания и тщательно смойте.',{risk:'CAUTION'}));
        risk='CAUTION';
      }else if(dirt==='tar'){
        steps.push(step('Локально: битум / смола / клей','Eulex','Нанесите средство сначала на отдельную салфетку, локально обработайте пятно, коротко выждите и снимите остатки. Затем вымойте обработанную зону.',{risk:'HIGH RISK'}));
        risk='HIGH RISK';
      }else if(level==='heavy'){
        steps.push(step('Предмойка стойкой грязи','Green Star','Нанесите рабочий раствор на холодную стойкую поверхность, коротко проработайте и полностью смойте. Не давайте высохнуть.',{
          dilution:`${ratio(30)} Это безопасный старт внутри подтверждённого наружного диапазона 1:5–1:30. Если после теста недостаточно — не усиливайте резко: повторите обработку или переходите к 1:20.`,
          risk:'CAUTION'
        }));
        risk='CAUTION';
      }
      steps.push(shampoo());
    }

    if(zone==='rim'){
      if(dirt==='unknown'){
        risk='STOP';
        steps.push(manual('Сначала определить покрытие','Не начинайте химическую очистку автоматически. Определите, лакированный ли диск, матовый, полированный, хромированный или с повреждённым покрытием.',{
          warning:'Неизвестное или повреждённое покрытие — сначала тест. При сомнении STOP.',
          risk:'STOP'
        }));
      }else{
        steps.push(baseRinse());
        steps.push(step('Очистка диска','Reactive Rust Remover','Нанесите на холодный очищенный диск, мягко проработайте кистью при необходимости, дождитесь реакции без высыхания и тщательно смойте.',{risk:level==='heavy'||dirt==='iron'?'CAUTION':'LOW'}));
        if(level==='heavy')steps.push(manual('Повторная обработка','Если после полного смыва осталась загрязнённость, лучше повторить контролируемый цикл, чем оставлять средство дольше или давать ему высохнуть.',{risk:'CAUTION'}));
      }
    }

    if(zone==='tire'){
      steps.push(step('Глубокая очистка шины','CARPRO ReTyre','Нанесите на боковину шины, проработайте жёсткой щёткой и смойте. При сильной/коричневой грязи повторяйте после смыва, пока пена и сток не станут заметно чище.',{risk:'LOW'}));
      steps.push(manual('Полная сушка','Полностью высушите боковину перед защитой.',{tool:'Чистая микрофибра + естественная сушка.'}));
      steps.push(step('Защита и чернение','CARPRO DarkSide','Нанесите 2–3 порции на отдельный аппликатор и тонко распределите только по боковине.',{
        after:'Дать высохнуть 1–2 часа без контакта с водой. При необходимости позже нанести второй тонкий слой.',
        warning:'Не наносить на протектор.',
        risk:'LOW'
      }));
    }

    if(zone==='wheel'){
      if(dirt==='unknown'){
        risk='STOP';
        steps.push(manual('Сначала определить покрытие диска','Не используйте сильную химию на неизвестном/повреждённом покрытии. Сначала тест и определение материала.',{risk:'STOP',warning:'Если покрытие неизвестно — STOP.'}));
      }else{
        steps.push(baseRinse());
        steps.push(step('Диски','Reactive Rust Remover','Обработайте холодные диски, при необходимости проработайте мягкой кистью и полностью смойте до высыхания средства.',{risk:dirt==='iron'||level==='heavy'?'CAUTION':'LOW'}));
        steps.push(step('Шины','CARPRO ReTyre','Нанесите на боковины, проработайте щёткой и смойте. При сильной грязи повторите цикл.',{risk:'LOW'}));
        steps.push(manual('Сушка колеса','Высушите диски и особенно боковины шин перед защитой.'));
        steps.push(step('Финиш шин','CARPRO DarkSide','2–3 порции на аппликатор, тонко распределить по боковине.',{after:'Не мочить 1–2 часа.',warning:'Не наносить на протектор.'}));
      }
    }

    if(zone==='glass'){
      steps.push(step('Очистка стекла','Glass Cleaner',dirt==='insects'
        ?'Сначала размочите стойкие следы средством на микрофибре, снимите загрязнение без сильного сухого трения, затем повторно очистите стекло и сразу отполируйте второй сухой салфеткой.'
        :'Умеренно нанесите на стекло или микрофибру, протрите и сразу дополируйте второй сухой салфеткой.',{
          tool:'Две чистые безворсовые микрофибры: первая для очистки, вторая сухая для финиша.',
          risk:'LOW'
        }));
    }

    if(zone==='exteriorPlastic'){
      if(dirt!=='faded'){
        steps.push(step('Очистка наружного пластика','Green Star','Нанесите слабый рабочий раствор на холодный стойкий пластик, коротко проработайте мягкой кистью/микрофиброй и полностью удалите остатки.',{
          dilution:`${ratio(30)} Начинайте с 1:30 внутри подтверждённого наружного диапазона 1:5–1:30.`,
          warning:'Сначала тест. Не давать высохнуть. На чувствительном или повреждённом пластике не усиливать концентрацию автоматически.',
          risk:'CAUTION'
        }));
        risk='CAUTION';
      }
      steps.push(manual('Сушка','Полностью высушите пластик перед защитным составом.'));
      steps.push(step('Восстановление и защита','Plast Star siliconölfrei','Нанесите тонким слоем аппликатором на чистую сухую поверхность, равномерно распределите и уберите излишки микрофиброй.',{risk:'LOW'}));
    }

    if(zone==='interiorPlastic'){
      steps.push(polStar(level,'Нанесите рабочий раствор на микрофибру или мягкую кисть, а не заливайте панель. Коротко проработайте поверхность и полностью снимите остатки влажной чистой микрофиброй.'));
      steps.push(manual('Контроль остатков','Пройдите поверхность чистой слегка влажной микрофиброй и затем высушите. Если раньше были белёсые следы от сильной химии — не усиливайте щёлочь.',{
        warning:'Green Star для этого сценария не используется: на чувствительном салонном пластике высокая концентрация/высыхание могут дать белёсые следы.',
        risk:'CAUTION'
      }));
      steps.push(step('Финиш и UV-защита','Top Star','Нанесите небольшое количество на аппликатор, тонко распределите и уберите излишки сухой микрофиброй.',{risk:'LOW'}));
      if(level==='heavy'||dirt==='residue')risk='CAUTION';
    }

    if(zone==='textile'){
      steps.push(manual('Сухая подготовка','Сначала тщательно пропылесосьте материал. Шерсть/волосы удалите механически до влажной химии.',{product:'Bosch Serie 4 — сухой пылесос'}));
      if(dirt==='stain'){
        steps.push(step('Локальное жирное пятно','Ecolab Carpet B','Нанесите локально, аккуратно промокните/проработайте от края пятна к центру и снимите растворённую грязь чистой белой салфеткой.',{risk:'CAUTION'}));
        risk='CAUTION';
      }
      steps.push(polStar(level,'Нанесите умеренно, мягко проработайте щёткой по направлению волокон и снимите пену/грязь влажной микрофиброй или подходящим wet/dry-экстрактором. Не переувлажняйте наполнитель.'));
      if(dirt==='odor'){
        steps.push(step('После очистки: нейтрализация запаха','Fresh Up','Сначала полностью устраните источник запаха и очистите материал. Затем легко распылите на текстиль, не переувлажняя.',{after:'Полностью высушить и проветрить салон.'}));
      }
      steps.push(manual('Сушка','Оставьте материал до полного высыхания; обеспечьте вентиляцию. Не закрывайте влажный салон надолго.',{risk:level==='heavy'?'CAUTION':'LOW'}));
    }

    if(zone==='leather'){
      steps.push(manual('Сухая подготовка','Удалите песок и пыль пылесосом и мягкой сухой щёткой.'));
      steps.push(polStar(level==='heavy'?'medium':level,'Работайте небольшими участками. Наносите раствор на щётку из конского волоса/микрофибру, мягко очищайте и сразу снимайте загрязнение чистой влажной микрофиброй.'));
      steps.push(manual('Полная сушка','Убедитесь, что кожа чистая и сухая перед уходом.'));
      steps.push(step('Уход за кожей','Leather Star','Тонко нанесите на аппликатор, равномерно распределите, не переливайте. Уберите излишки чистой микрофиброй.',{risk:'LOW'}));
      if(level==='heavy')risk='CAUTION';
    }

    if(zone==='carpet'){
      steps.push(manual('Сухая уборка','Тщательно пропылесосьте песок, крошки и волосы до любой влаги.',{product:'Bosch Serie 4 — сухой пылесос'}));
      if(dirt==='stain'){
        steps.push(step('Локальное жирное пятно','Ecolab Carpet B','Работайте локально от края пятна к центру и промокайте растворённое загрязнение чистой салфеткой.',{risk:'CAUTION'}));
        risk='CAUTION';
      }
      steps.push(polStar(level,'Равномерно нанесите рабочий раствор, проработайте мягкой/средней щёткой, затем полностью соберите грязь влажной микрофиброй или экстрактором. Не оставляйте пену в материале.'));
      if(dirt==='odor'){
        steps.push(step('После чистки: запах','Fresh Up','После удаления источника запаха и основной чистки слегка нанесите на сухеющий текстиль/ковролин без переувлажнения.',{after:'Полностью высушить и проветрить.'}));
      }
      steps.push(manual('Сушка','Сделайте дополнительные проходы на всасывание при использовании экстрактора и полностью просушите ковролин.'));
    }

    if(zone==='headliner'){
      risk=level==='heavy'?'HIGH RISK':'CAUTION';
      steps.push(step('Деликатная очистка потолка','Pol Star','Наносите раствор только на микрофибру/мягкую щётку, а не прямо в потолок. Работайте небольшими участками без давления и без промачивания основы.',{
        dilution:`${ratio(20)} Для потолка используем слабый старт 1:20 и не усиливаем автоматически.`,
        warning:'Потолок нельзя переувлажнять: возможна отслойка ткани. При провисании, старом клее или неизвестном материале — STOP.',
        risk
      }));
      steps.push(manual('Сушка','Промокните сухой микрофиброй и оставьте естественно высыхать с вентиляцией. Не грейте точечно горячим воздухом.',{risk:'CAUTION'}));
    }

    return {steps,risk,note};
  }

  function riskClass(risk){
    if(risk==='STOP'||risk==='HIGH RISK')return 'risk-high';
    if(risk==='CAUTION')return 'risk-caution';
    return 'risk-low';
  }
  function render(){
    const zone=zoneEl.value, level=levelEl.value, dirt=dirtEl.value;
    const plan=makePlan(zone,level,dirt);
    const levelLabel=levelEl.options[levelEl.selectedIndex]?.text||'';
    const dirtLabel=dirtEl.options[dirtEl.selectedIndex]?.text||'';
    result.innerHTML=`
      <div class="wiz-summary">
        <div><b>${h(zones[zone])}</b><span>${h(levelLabel)} · ${h(dirtLabel)}</span></div>
        <span class="wiz-risk ${riskClass(plan.risk)}">${h(plan.risk)}</span>
      </div>
      <div class="wiz-note">${h(plan.note)}</div>
      <div class="wiz-steps">
        ${plan.steps.map((s,i)=>`<article class="wiz-step">
          <div class="wiz-step-num">${i+1}</div>
          <div class="wiz-step-main">
            <h3>${h(s.title)}</h3>
            <div class="wiz-product">${h(s.product)}</div>
            <div class="wiz-row"><b>Разведение</b><span>${h(s.dilution)}</span></div>
            ${s.tool?`<div class="wiz-row"><b>Чем работать</b><span>${h(s.tool)}</span></div>`:''}
            <div class="wiz-row"><b>Что делать</b><span>${h(s.action)}</span></div>
            ${s.after?`<div class="wiz-row"><b>После</b><span>${h(s.after)}</span></div>`:''}
            ${s.warning?`<div class="wiz-row wiz-warning"><b>Важно</b><span>${h(s.warning)}</span></div>`:''}
          </div>
        </article>`).join('')}
      </div>`;
    result.scrollIntoView({behavior:'smooth',block:'start'});
  }

  zoneEl.innerHTML=Object.entries(zones).map(([v,l])=>`<option value="${h(v)}">${h(l)}</option>`).join('');
  zoneEl.value='body';
  fillDirt();
  zoneEl.addEventListener('change',fillDirt);
  buildBtn.addEventListener('click',render);
})();