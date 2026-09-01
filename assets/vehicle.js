(() => {
  const C=window.SIR_CONFIG;
  const endpoint=()=>String(C.vehicleLookupUrl||'').trim()||null;
  const saved={brand:'',model:'',year:'',body:'',material:''};
  const clearSaved=()=>{for(const key of Object.keys(saved))saved[key]='';};

  const VEHICLE_CATALOG={
    'ALFA ROMEO':['147','156','159','Giulia','Giulietta','Stelvio','Tonale'],
    'AUDI':['A1','A2','A3','A4','A5','A6','A7','A8','e-tron','e-tron GT','Q2','Q3','Q4 e-tron','Q5','Q6 e-tron','Q7','Q8','Q8 e-tron','R8','TT'],
    'BMW':['1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','8 Series','i3','i4','i5','i7','i8','iX','iX1','iX2','iX3','X1','X2','X3','X4','X5','X6','X7','Z4'],
    'BYD':['Atto 2','Atto 3','Dolphin','Han','Seal','Seal U','Sealion 7','Tang'],
    'CHEVROLET':['Aveo','Camaro','Captiva','Corvette','Cruze','Orlando','Spark','Tahoe','Trax'],
    'CHRYSLER':['300C','Grand Voyager','Pacifica','PT Cruiser','Voyager'],
    'CITROËN':['Berlingo','C1','C2','C3','C3 Aircross','C4','C4 Cactus','C4 X','C5','C5 Aircross','C5 X','C-Zero','Jumpy','Nemo','Saxo','SpaceTourer','Xsara'],
    'CUPRA':['Ateca','Born','Formentor','Leon','Tavascan','Terramar'],
    'DACIA':['Duster','Jogger','Lodgy','Logan','Sandero','Spring'],
    'DODGE':['Caliber','Challenger','Charger','Durango','Journey','Nitro','RAM'],
    'DS':['DS 3','DS 4','DS 5','DS 7','DS 9'],
    'FIAT':['500','500e','500L','500X','Bravo','Doblo','Ducato','Grande Punto','Panda','Punto','Scudo','Tipo'],
    'FORD':['B-Max','Bronco','C-Max','Capri','EcoSport','Edge','Explorer','Fiesta','Focus','Galaxy','Kuga','Mondeo','Mustang','Mustang Mach-E','Puma','Ranger','S-Max','Tourneo Connect','Tourneo Custom','Transit','Transit Connect','Transit Custom'],
    'HONDA':['Accord','Civic','CR-V','e','e:Ny1','FR-V','HR-V','Insight','Jazz','Prelude'],
    'HONGQI':['E-HS9','EH7','EHS7','H5','H9'],
    'HYUNDAI':['Bayon','Getz','i10','i20','i30','i40','IONIQ','IONIQ 5','IONIQ 6','IONIQ 9','Kona','Nexo','Santa Fe','Tucson','Veloster'],
    'ISUZU':['D-Max'],
    'JAGUAR':['E-Pace','F-Pace','F-Type','I-Pace','S-Type','XE','XF','XJ','X-Type'],
    'JEEP':['Avenger','Cherokee','Compass','Grand Cherokee','Patriot','Renegade','Wrangler'],
    'KIA':['Carens','Carnival','Ceed','e-Niro','EV3','EV6','EV9','Niro','Optima','Picanto','ProCeed','Rio','Sorento','Soul','Sportage','Stinger','Stonic','XCeed'],
    'LAND ROVER':['Defender','Discovery','Discovery Sport','Freelander','Range Rover','Range Rover Evoque','Range Rover Sport','Range Rover Velar'],
    'LEXUS':['CT','ES','GS','IS','LBX','LS','NX','RC','RX','RZ','UX'],
    'MAZDA':['2','3','5','6','CX-3','CX-30','CX-5','CX-60','CX-80','MX-30','MX-5'],
    'MAXUS':['e-Deliver 3','e-Deliver 7','e-Deliver 9','Euniq 5','Euniq 6','MIFA 9','T90 EV'],
    'MERCEDES-BENZ':['A-Class','B-Class','C-Class','CLA','CLE','CLK','CLS','E-Class','EQA','EQB','EQC','EQE','EQS','EQV','G-Class','GLA','GLB','GLC','GLE','GLK','GLS','M-Class','S-Class','SL','Sprinter','V-Class','Vaneo','Vito'],
    'MG':['4','5','Cyberster','HS','Marvel R','MG3','MG4','MG5','ZS','ZS EV'],
    'MINI':['Clubman','Cooper','Cooper Electric','Countryman','Paceman'],
    'MITSUBISHI':['ASX','Carisma','Colt','Eclipse Cross','Grandis','i-MiEV','L200','Lancer','Outlander','Pajero','Space Star'],
    'NIO':['EL6','EL7','EL8','ET5','ET5 Touring','ET7'],
    'NISSAN':['350Z','370Z','Ariya','e-NV200','Juke','Leaf','Micra','Murano','Navara','Note','NV200','Pathfinder','Primera','Pulsar','Qashqai','X-Trail'],
    'OPEL':['Adam','Ampera','Astra','Combo','Corsa','Crossland','Frontera','Grandland','Insignia','Meriva','Mokka','Omega','Signum','Vectra','Vivaro','Zafira'],
    'PEUGEOT':['107','108','2008','206','207','208','3008','307','308','4007','407','5008','508','Bipper','e-208','e-2008','Expert','Partner','RCZ','Rifter','Traveller'],
    'POLESTAR':['1','2','3','4'],
    'PORSCHE':['718 Boxster','718 Cayman','911','Cayenne','Macan','Panamera','Taycan'],
    'RENAULT':['5 E-Tech','Austral','Captur','Clio','Espace','Fluence','Kadjar','Kangoo','Laguna','Master','Megane','Megane E-Tech','Modus','Rafale','Scenic','Scenic E-Tech','Trafic','Twingo','Zoe'],
    'SAAB':['9-3','9-5'],
    'SEAT':['Alhambra','Altea','Arona','Ateca','Cordoba','Ibiza','Leon','Mii','Tarraco','Toledo'],
    'SERES':['3','5'],
    'ŠKODA':['Citigo','Elroq','Enyaq','Fabia','Kamiq','Karoq','Kodiaq','Octavia','Rapid','Roomster','Scala','Superb','Yeti'],
    'SMART':['#1','#3','Forfour','Fortwo'],
    'SUBARU':['BRZ','Crosstrek','Forester','Impreza','Legacy','Levorg','Outback','Solterra','Tribeca','XV'],
    'SUZUKI':['Across','Baleno','Grand Vitara','Ignis','Jimny','S-Cross','Swift','SX4','Vitara'],
    'TESLA':['Model 3','Model S','Model X','Model Y'],
    'TOYOTA':['Auris','Avensis','Aygo','bZ4X','C-HR','Camry','Corolla','Corolla Cross','GT86','Hilux','Land Cruiser','Prius','Proace','Proace City','RAV4','Supra','Urban Cruiser','Verso','Yaris','Yaris Cross'],
    'VOLKSWAGEN':['Amarok','Arteon','Beetle','Bora','Caddy','Caravelle','Crafter','Golf','ID.3','ID.4','ID.5','ID.7','ID. Buzz','Jetta','Multivan','Passat','Polo','Sharan','T-Cross','T-Roc','Taigo','Tiguan','Touareg','Touran','Transporter','Up!'],
    'VOLVO':['C30','C40','EC40','EX30','EX40','EX60','EX90','S40','S60','S80','S90','V40','V50','V60','V70','V90','XC40','XC60','XC70','XC90'],
    'VOYAH':['Courage','Dream','Free'],
    'XPENG':['G6','G9','P7']
  };
  const BRAND_ALIASES={
    'VW':'VOLKSWAGEN','VOLKSWAGEN AG':'VOLKSWAGEN','MERCEDES':'MERCEDES-BENZ','MERCEDES BENZ':'MERCEDES-BENZ',
    'MERCEDES-BENZ AG':'MERCEDES-BENZ','SKODA':'ŠKODA','SKODA AUTO':'ŠKODA','CITROEN':'CITROËN','LANDROVER':'LAND ROVER'
  };

  const labels=()=>{
    const lang=localStorage.getItem('sir_lang')||'no';
    if(lang==='ru')return{find:'Найти автомобиль',ready:'При поиске регистрационный номер передаётся Statens vegvesen через SIR для получения технических данных автомобиля.',off:'Автопоиск сейчас недоступен. Заполните данные автомобиля вручную.',empty:'Введите регистрационный номер.',loading:'Ищем автомобиль…',brand:'Марка',model:'Модель',year:'Год',body:'Кузов',material:'Материал салона',brandPlaceholder:'Начните вводить марку',modelPlaceholder:'Начните вводить модель',check:'Автомобиль найден. Проверьте данные — их можно исправить.',notFound:'Автомобиль с таким номером не найден. Проверьте номер или заполните данные вручную.',limited:'Слишком много запросов. Заполните данные вручную или попробуйте позже.',service:'Поиск автомобиля временно недоступен. Заполните данные вручную.',fail:'Не удалось получить данные. Заполните их вручную.'};
    if(lang==='en')return{find:'Find vehicle',ready:'When you search, the registration number is sent to Statens vegvesen through SIR to retrieve technical vehicle details.',off:'Automatic lookup is unavailable. Enter the vehicle details manually.',empty:'Enter a registration number.',loading:'Looking up vehicle…',brand:'Make',model:'Model',year:'Year',body:'Body',material:'Interior material',brandPlaceholder:'Start typing a make',modelPlaceholder:'Start typing a model',check:'Vehicle found. Check the details — they can be corrected.',notFound:'No vehicle was found for that registration number. Check it or enter the details manually.',limited:'Too many lookups. Enter the details manually or try again later.',service:'Vehicle lookup is temporarily unavailable. Enter the details manually.',fail:'Could not retrieve vehicle details. Enter them manually.'};
    return{find:'Finn kjøretøy',ready:'Når du søker, sendes registreringsnummeret via SIR til Statens vegvesen for å hente tekniske kjøretøyopplysninger.',off:'Automatisk oppslag er ikke tilgjengelig. Fyll inn kjøretøyopplysningene manuelt.',empty:'Skriv inn registreringsnummer.',loading:'Søker etter kjøretøy…',brand:'Merke',model:'Modell',year:'År',body:'Karosseri',material:'Interiørmateriale',brandPlaceholder:'Begynn å skrive merke',modelPlaceholder:'Begynn å skrive modell',check:'Kjøretøy funnet. Kontroller opplysningene — de kan korrigeres.',notFound:'Fant ikke kjøretøy med dette registreringsnummeret. Kontroller nummeret eller fyll inn manuelt.',limited:'For mange oppslag. Fyll inn manuelt eller prøv igjen senere.',service:'Kjøretøyoppslag er midlertidig utilgjengelig. Fyll inn opplysningene manuelt.',fail:'Kunne ikke hente kjøretøydata. Fyll inn opplysningene manuelt.'};
  };

  function normalizedBrand(value){
    const raw=String(value||'').trim().replace(/\s+/g,' ').toUpperCase();
    if(BRAND_ALIASES[raw])return BRAND_ALIASES[raw];
    if(VEHICLE_CATALOG[raw])return raw;
    const ascii=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const found=Object.keys(VEHICLE_CATALOG).find(key=>key.normalize('NFD').replace(/[\u0300-\u036f]/g,'')===ascii);
    return found||raw;
  }

  function updateModelSuggestions(box){
    const brand=box.querySelector('input[name="vehicle_brand"]');
    const list=box.querySelector('#sir-vehicle-models');
    if(!brand||!list)return;
    const models=VEHICLE_CATALOG[normalizedBrand(brand.value)]||[];
    list.replaceChildren(...models.map(value=>{const option=document.createElement('option');option.value=value;return option;}));
  }

  function attachAutocomplete(box,text){
    const brand=box.querySelector('input[name="vehicle_brand"]');
    const model=box.querySelector('input[name="vehicle_model"]');
    if(!brand||!model)return;

    let brandList=box.querySelector('#sir-vehicle-brands');
    if(!brandList){
      brandList=document.createElement('datalist');
      brandList.id='sir-vehicle-brands';
      brandList.replaceChildren(...Object.keys(VEHICLE_CATALOG).map(value=>{const option=document.createElement('option');option.value=value;return option;}));
      box.appendChild(brandList);
    }
    let modelList=box.querySelector('#sir-vehicle-models');
    if(!modelList){modelList=document.createElement('datalist');modelList.id='sir-vehicle-models';box.appendChild(modelList);}

    brand.setAttribute('list','sir-vehicle-brands');
    model.setAttribute('list','sir-vehicle-models');
    brand.setAttribute('placeholder',text.brandPlaceholder);
    model.setAttribute('placeholder',text.modelPlaceholder);
    brand.setAttribute('autocomplete','off');
    model.setAttribute('autocomplete','off');
    brand.addEventListener('input',()=>updateModelSuggestions(box));
    brand.addEventListener('change',()=>updateModelSuggestions(box));
    updateModelSuggestions(box);
  }

  function detailsBox(wrap,text){
    let box=wrap.querySelector('.vehicle-details');
    if(box){attachAutocomplete(box,text);return box;}
    box=document.createElement('div');
    box.className='summary vehicle-details';
    box.style.marginTop='10px';
    box.innerHTML=[
      ['brand',text.brand,'text'],['model',text.model,'text'],['year',text.year,'number'],['body',text.body,'text'],['material',text.material,'text']
    ].map(([key,label,type])=>`<div class="summary-row"><span data-vehicle-label="${key}">${label}</span><input name="vehicle_${key}" type="${type}" value="${esc(saved[key])}" aria-label="${label}" ${key==='year'?'min="1900" max="2100" inputmode="numeric"':''}></div>`).join('');
    box.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{saved[input.name.replace('vehicle_','')]=input.value;}));
    wrap.append(box);
    attachAutocomplete(box,text);
    return box;
  }

  function setDetails(box,data){
    const values={brand:data.brand||'',model:data.model||'',year:data.year||'',body:data.body||''};
    for(const [key,value] of Object.entries(values)){
      saved[key]=String(value);
      const input=box.querySelector(`[name="vehicle_${key}"]`);if(input)input.value=saved[key];
    }
    updateModelSuggestions(box);
  }

  function enhance(){
    const plate=document.querySelector('.service-card.open input[name="plate"]');
    if(!plate||plate.dataset.enhanced)return;
    plate.dataset.enhanced='1';
    const wrap=plate.parentElement,l=labels(),ep=endpoint();
    const button=document.createElement('button');button.type='button';button.className='btn vehicle-lookup-btn';button.textContent=l.find;button.style.marginTop='8px';button.disabled=!ep;
    const info=document.createElement('div');info.className='status-line vehicle-lookup-info';info.textContent=ep?l.ready:l.off;
    wrap.append(button,info);
    const box=detailsBox(wrap,l);

    button.addEventListener('click',async()=>{
      const currentEndpoint=endpoint(),text=labels(),value=plate.value.replace(/\s+/g,'').toUpperCase();
      if(!value){info.textContent=text.empty;plate.focus();return;}
      if(!currentEndpoint){info.textContent=text.off;return;}
      button.disabled=true;info.textContent=text.loading;
      try{
        const r=await fetch(currentEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registrationNumber:value})});
        let d={};try{d=await r.json();}catch(_e){}
        if(!r.ok){
          if(r.status===404||d.error==='not_found')info.textContent=text.notFound;
          else if(r.status===429||d.error==='rate_limited')info.textContent=text.limited;
          else if(r.status===503||d.error==='rate_limit_unavailable'||d.error==='server_not_configured')info.textContent=text.service;
          else info.textContent=text.fail;
          return;
        }
        setDetails(box,d);info.textContent=text.check;
      }catch(_e){info.textContent=text.fail;}finally{button.disabled=false;}
    });
  }

  function refreshLanguage(){
    const button=document.querySelector('.service-card.open .vehicle-lookup-btn'),info=document.querySelector('.service-card.open .vehicle-lookup-info');if(!button||!info)return;
    const l=labels(),ep=endpoint();button.textContent=l.find;button.disabled=!ep;if(!ep)info.textContent=l.off;
    const box=document.querySelector('.service-card.open .vehicle-details');
    if(box){
      for(const key of ['brand','model','year','body','material']){
        const span=box.querySelector(`[data-vehicle-label="${key}"]`),input=box.querySelector(`[name="vehicle_${key}"]`);if(span)span.textContent=l[key];if(input)input.setAttribute('aria-label',l[key]);
      }
      attachAutocomplete(box,l);
    }
  }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  const obs=new MutationObserver(enhance);obs.observe(document.body,{subtree:true,childList:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('.service-card[data-service="car"] .service-head'))clearSaved();
    if(e.target.closest('[data-lang]'))setTimeout(refreshLanguage,0);
    setTimeout(enhance,0);
  },true);
})();
