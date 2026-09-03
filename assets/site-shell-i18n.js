(()=>{
  const rows=[
    ['Gå til bestilling','Go to booking','Перейти к заказу'],
    ['SIR Rens & Pleie hovedmeny','SIR Rens & Pleie main menu','Главное меню SIR Rens & Pleie'],
    ['Navigasjon','Navigation','Навигация'],
    ['Åpne hele nettstedet','Open full website','Открыть весь сайт'],
    ['Ring Slava på +47 93 95 35 81','Call Slava at +47 93 95 35 81','Позвонить Славе: +47 93 95 35 81'],
    ['Kongsberg og område opptil 40 kilometer','Kongsberg and area up to 40 kilometres','Конгсберг и зона до 40 км'],
    ['Bestill rens av bilinteriør','Book car interior cleaning','Заказать чистку салона автомобиля'],
    ['Bestill rens av sofa','Book sofa cleaning','Заказать чистку дивана'],
    ['Bestill rens av lenestol','Book armchair cleaning','Заказать чистку кресла'],
    ['Bestill rens av madrass','Book mattress cleaning','Заказать чистку матраса'],
    ['Trygge produkter for barn og dyr','Safe products for children and pets','Безопасные средства для детей и животных'],
    ['Miljøvennlig rengjøring','Environmentally friendly cleaning','Экологичная чистка'],
    ['Kvalitet og fornøyd kunde','Quality and customer satisfaction','Качество и довольный клиент'],
    ['Fleksible tider','Flexible times','Гибкое время'],
    ['Jeg trenger hjelp med flekker','I need help with stains','Мне нужна помощь с пятнами'],
    ['Jeg trenger hjelp med lukt','I need help with odour','Мне нужна помощь с запахом'],
    ['Jeg trenger hjelp med støv og allergener','I need help with dust and allergens','Мне нужна помощь с пылью и аллергенами'],
    ['Jeg trenger hjelp med dyrehår','I need help with pet hair','Мне нужна помощь с шерстью животных'],
    ['Jeg trenger hjelp med søl og skitt','I need help with spills and dirt','Мне нужна помощь с пролитым и грязью'],
    ['Send SMS for råd','Send SMS for advice','Отправить SMS для консультации'],
    ['Ring Slava','Call Slava','Позвонить Славе'],
    ['Ring Ivan','Call Ivan','Позвонить Ивану'],
    ['Trykk på en tjeneste','Tap a service','Нажмите на услугу'],
    ['Kongsberg · opptil 40 km','Kongsberg · up to 40 km','Конгсберг · до 40 км'],
    ['Tjenester','Services','Услуги'],
    ['Bestilling','Booking','Заказ'],
    ['Hva skal renses?','What needs cleaning?','Что нужно почистить?'],
    ['Trykk på hele bildet eller kortet — bestillingen åpnes direkte her.','Tap the image or card — the booking opens directly here.','Нажмите на изображение или карточку — заказ откроется прямо здесь.'],
    ['Bilinteriør','Car interior','Салон автомобиля'],
    ['Sofa','Sofa','Диван'],
    ['Lenestol','Armchair','Кресло'],
    ['Madrass','Mattress','Матрас'],
    ['Tepper','Rugs','Ковры'],
    ['Les mer','Read more','Подробнее'],
    ['Rens av løse tepper etter materiale og størrelse','Cleaning of loose rugs based on material and size','Чистка съёмных ковров с учётом материала и размера'],
    ['SIR SIGNATUR','SIR SIGNATURE','SIR ПРОФИЛЬ'],
    ['Slik jobber vi','How we work','Как мы работаем'],
    ['Prisen forklares av arbeidet','The work explains the price','Цена объясняется объёмом работы'],
    ['1. Vi vurderer','1. We assess','1. Оцениваем'],
    ['Størrelse, materiale, smuss, flekker, dyrehår, lukt og bilder.','Size, material, dirt, stains, pet hair, odour and photos.','Размер, материал, загрязнение, пятна, шерсть, запах и фотографии.'],
    ['2. Vi planlegger trygt','2. We plan safely','2. Планируем безопасно'],
    ['Antall trinn, tidsbruk og risiko. Usikre materialer må kontrolleres.','Number of steps, time and risk. Uncertain materials must be checked.','Количество этапов, время и риск. Сомнительные материалы обязательно проверяем.'],
    ['3. Vi avtaler','3. We agree','3. Согласовываем'],
    ['Vi bekrefter pris og tid. Prisen økes aldri uten kundens godkjenning.','We confirm the price and time. The price never increases without customer approval.','Подтверждаем цену и время. Цена не повышается без согласия клиента.'],
    ['SIR-anbefaling','SIR referral','Рекомендация SIR'],
    ['Anbefal en kunde — få 200 NOK','Refer a customer — get 200 NOK','Приведите клиента — получите 200 NOK'],
    ['Etter at den anbefalte bestillingen er fullført og betalt. Ny kunde får 100 NOK rabatt på første kvalifiserte bestilling.','After the referred order is completed and paid. The new customer gets 100 NOK off the first eligible order.','После выполненного и оплаченного заказа по вашей рекомендации. Новый клиент получает скидку 100 NOK на первый подходящий заказ.'],
    ['Min. bestilling 750 NOK','Min. order 750 NOK','Мин. заказ 750 NOK'],
    ['Kongsberg · utrykning opptil 40 km','Kongsberg · travel up to 40 km','Конгсберг · выезд до 40 км'],
    ['Personvern','Privacy','Конфиденциальность'],
    ['Vilkår','Terms','Условия'],
    ['Prisene er veiledende. Endelig pris avtales før arbeidet starter.','Prices are indicative. The final price is agreed before work starts.','Цены ориентировочные. Окончательная цена согласовывается до начала работы.'],
    ['Ring','Call','Позвонить'],
    ['Bestill','Book','Заказать'],
    ['Lukk','Close','Закрыть'],
    ['Meny','Menu','Меню'],
    ['Kontakt oss','Contact us','Контакты'],
    ['SIR meny','SIR menu','Меню SIR'],
    ['SIR Renhetsprofil','SIR Clean Profile','Профиль чистоты SIR'],
    ['Kongsberg og omegn · opptil 40 km','Kongsberg and nearby · up to 40 km','Конгсберг и окрестности · до 40 км'],
    ['Send SMS','Send SMS','Отправить SMS'],
    ['Vi tilpasser kjemi og metode til materiale, barn og dyr.','We adapt products and methods to the material, children and pets.','Подбираем химию и метод с учётом материала, детей и животных.'],
    ['Vi doserer riktig og bruker målrettede metoder med minst mulig belastning.','We dose correctly and use targeted methods with minimal impact.','Точно дозируем средства и применяем щадящие целевые методы.'],
    ['Vi dokumenterer behovet og avtaler pris før arbeidet starter.','We document the need and agree the price before work starts.','Фиксируем объём работ и согласовываем цену до начала.'],
    ['Velg ønsket tidspunkt i bestillingen — vi bekrefter hva som er ledig.','Choose your preferred time in the booking — we confirm availability.','Выберите желаемое время в заказе — мы подтвердим свободный вариант.'],
    ['Norsk er valgt.','Norwegian selected.','Выбран норвежский язык.'],
    ['English selected.','English selected.','Выбран английский язык.'],
    ['Выбран русский язык.','Russian selected.','Выбран русский язык.']
  ];

  const titles={
    no:{title:'SIR Rens & Pleie — Kongsberg',description:'Profesjonell rens av bilinteriør, sofa, lenestol og madrass i Kongsberg og opptil 40 km rundt byen.'},
    en:{title:'SIR Rens & Pleie — Kongsberg',description:'Professional cleaning of car interiors, sofas, armchairs and mattresses in Kongsberg and up to 40 km around the city.'},
    ru:{title:'SIR Rens & Pleie — Конгсберг',description:'Профессиональная химчистка салонов автомобилей, диванов, кресел и матрасов в Конгсберге и в радиусе до 40 км.'}
  };

  const valid=new Set(['no','en','ru']);
  const reverse=new Map();
  for(const row of rows){reverse.set(row[0],row);reverse.set(row[1],row);reverse.set(row[2],row);}
  let lang=localStorage.getItem('sir_lang')||'no';if(!valid.has(lang))lang='no';
  const index=()=>lang==='no'?0:lang==='en'?1:2;

  function translate(value){
    if(value==null)return value;
    const raw=String(value),trimmed=raw.trim(),row=reverse.get(trimmed);if(!row)return raw;
    const lead=raw.match(/^\s*/)?.[0]||'',tail=raw.match(/\s*$/)?.[0]||'';
    return lead+row[index()]+tail;
  }

  function apply(root=document.body){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const n of nodes){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const after=translate(n.nodeValue);if(after!==n.nodeValue)n.nodeValue=after;}
    const base=root.nodeType===1?root:document.body;
    const elements=[base,...(base.querySelectorAll?.('[placeholder],[title],[aria-label]')||[])];
    for(const el of elements){for(const attr of ['placeholder','title','aria-label']){if(!el?.hasAttribute?.(attr))continue;const before=el.getAttribute(attr),after=translate(before);if(after!==before)el.setAttribute(attr,after);}}
    document.documentElement.lang=lang==='no'?'nb':lang;
    document.title=titles[lang].title;
    const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=titles[lang].description;
  }

  function select(next){if(!valid.has(next))return;lang=next;localStorage.setItem('sir_lang',lang);document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));queueMicrotask(()=>apply());}

  addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{select(b.dataset.lang);setTimeout(()=>apply(),0)},true));
    select(lang);apply();
    const obs=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType===1)apply(n);else if(n.nodeType===3)apply(n.parentElement||document.body);}});
    obs.observe(document.body,{subtree:true,childList:true});
  });
})();
