(()=>{
  const D={
    pro:{no:'PROFESJONELL',en:'PROFESSIONAL',ru:'ПРОФЕССИОНАЛЬНО'},
    heroTitle:{no:'RENS & PLEIE',en:'CLEANING & CARE',ru:'ЧИСТКА И УХОД'},
    heroTag:{no:'RENT · FRISKT · TRYGT',en:'CLEAN · FRESH · SAFE',ru:'ЧИСТО · СВЕЖО · БЕЗОПАСНО'},
    b1:{no:'Dyp rens som fjerner smuss og bakterier',en:'Deep cleaning that removes dirt and bacteria',ru:'Глубокая чистка от грязи и бактерий'},
    b2:{no:'Fjerner flekker, lukt og allergener',en:'Removes stains, odours and allergens',ru:'Удаляем пятна, запахи и аллергены'},
    b3:{no:'Skånsomme produkter – trygt for deg og miljøet',en:'Gentle products – safe for you and the environment',ru:'Щадящие средства — безопасно для вас и материалов'},
    b4:{no:'Forlenger levetiden på møbler og interiør',en:'Extends the life of furniture and interiors',ru:'Продлеваем срок службы мебели и салона'},
    call:{no:'RING ELLER SEND SMS',en:'CALL OR SEND SMS',ru:'ПОЗВОНИТЬ ИЛИ НАПИСАТЬ SMS'},
    area:{no:'Kongsberg og omegn',en:'Kongsberg and nearby',ru:'Конгсберг и окрестности'},
    radius:{no:'Opptil 40 km',en:'Up to 40 km',ru:'До 40 км'},
    carSub:{no:'Grundig rens av bilinteriør',en:'Deep cleaning of car interiors',ru:'Глубокая чистка салона автомобиля'},
    sofaSub:{no:'Dyp rens som fjerner flekker og lukt',en:'Deep cleaning for stains and odours',ru:'Глубокая чистка от пятен и запахов'},
    chairSub:{no:'Skånsom rens for langvarig resultat',en:'Gentle cleaning for lasting results',ru:'Бережная чистка с длительным результатом'},
    mattressSub:{no:'Fjern støvmidd, flekker og dårlig lukt',en:'Remove dust mites, stains and odours',ru:'Удаление пылевых клещей, пятен и запахов'},
    proof1:{no:'Trygge produkter for barn og dyr',en:'Safe products for children and pets',ru:'Безопасно для детей и животных'},
    proof2:{no:'Miljøvennlig rengjøring',en:'Environmentally friendly cleaning',ru:'Экологичная чистка'},
    proof3:{no:'Fokus på fornøyd kunde',en:'Focused on customer satisfaction',ru:'Ориентация на довольного клиента'},
    proof4:{no:'Fleksible tider som passer deg',en:'Flexible times that suit you',ru:'Удобное время под ваш график'},
    needsTitle:{no:'HVA ØNSKER DU Å RENSE?',en:'WHAT DO YOU WANT CLEANED?',ru:'ЧТО ВЫ ХОТИТЕ ПОЧИСТИТЬ?'},
    chip1:{no:'Flekker',en:'Stains',ru:'Пятна'},chip2:{no:'Lukt',en:'Odours',ru:'Запах'},chip3:{no:'Støv & allergener',en:'Dust & allergens',ru:'Пыль и аллергены'},chip4:{no:'Dyr & hår',en:'Pets & hair',ru:'Животные и шерсть'},chip5:{no:'Søl & skitt',en:'Spills & dirt',ru:'Пролитое и грязь'},
    unsure:{no:'Usikker på hva du trenger?',en:'Not sure what you need?',ru:'Не уверены, что именно нужно?'},
    unsureSub:{no:'Vi hjelper deg med å velge riktig tjeneste for ditt behov.',en:'We help you choose the right service for your needs.',ru:'Поможем выбрать подходящую услугу под вашу ситуацию.'},
    advice:{no:'TA KONTAKT FOR RÅD',en:'CONTACT US FOR ADVICE',ru:'ПОЛУЧИТЬ КОНСУЛЬТАЦИЮ'},
    contact:{no:'KONTAKT OSS',en:'CONTACT US',ru:'КОНТАКТЫ'},
    why:{no:'HVORFOR VELGE SIR RENS & PLEIE?',en:'WHY CHOOSE SIR RENS & PLEIE?',ru:'ПОЧЕМУ SIR RENS & PLEIE?'},
    w1:{no:'Erfaring og profesjonalitet',en:'Experience and professionalism',ru:'Опыт и профессиональный подход'},
    w2:{no:'Moderne utstyr og effektive metoder',en:'Modern equipment and effective methods',ru:'Современное оборудование и эффективные методы'},
    w3:{no:'Kvalitet i hver detalj',en:'Quality in every detail',ru:'Качество в каждой детали'},
    w4:{no:'Konkurransedyktige priser',en:'Competitive prices',ru:'Конкурентные цены'},
    sms:{no:'Send SMS eller melding via nettstedet',en:'Send SMS or a message through the website',ru:'Отправьте SMS или сообщение через сайт'},
    slogan:{no:'Vi tar vare på det som betyr noe for deg',en:'We take care of what matters to you',ru:'Мы бережём то, что важно для вас'},
    love:{no:'Vi tar vare på dine ting, som om det var våre egne!',en:'We care for your belongings as if they were our own!',ru:'Мы заботимся о ваших вещах, как о своих!'}
  };
  const lang=()=>document.querySelector('[data-lang].active')?.dataset.lang||'no';
  function ensureAnimations(){if(document.querySelector('link[data-sir-icon-animations]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='assets/icon-animations.css';l.dataset.sirIconAnimations='1';document.head.appendChild(l);}
  function apply(){const l=lang();document.querySelectorAll('[data-ad-key]').forEach(el=>{const row=D[el.dataset.adKey];if(!row)return;const v=row[l]||row.no;if(el.textContent!==v)el.textContent=v;});}
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-lang]'))setTimeout(apply,0)},true);
  const obs=new MutationObserver(()=>apply());
  addEventListener('DOMContentLoaded',()=>{ensureAnimations();apply();obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})});
})();
