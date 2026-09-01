(()=>{
  const MATERIALS=[
    ['unknown','Не знаю / не уверен','Not sure','Vet ikke / usikker'],
    ['fabric','Ткань','Fabric','Stoff'],
    ['velour','Велюр','Velour','Velur'],
    ['alcantara','Алькантара','Alcantara','Alcantara'],
    ['leather','Натуральная кожа','Genuine leather','Ekte skinn'],
    ['eco_leather','Искусственная кожа / экокожа','Synthetic / eco leather','Kunstskinn / eco-skinn'],
    ['vinyl','Винил','Vinyl','Vinyl'],
    ['suede','Замша','Suede','Semsket skinn'],
    ['combined','Комбинированный салон','Mixed materials','Kombinert interiør'],
    ['other','Другой материал','Other material','Annet materiale']
  ];
  const lang=()=>document.querySelector('[data-lang].active')?.dataset.lang||localStorage.getItem('sir_lang')||'no';
  const text=(row)=>lang()==='ru'?row[1]:lang()==='en'?row[2]:row[3];
  const placeholder=()=>lang()==='ru'?'Выберите материал салона':lang()==='en'?'Choose interior material':'Velg interiørmateriale';
  const label=()=>lang()==='ru'?'Материал салона':lang()==='en'?'Interior material':'Interiørmateriale';
  const canonical=(value)=>{
    const v=String(value||'').trim().toLowerCase();
    if(!v)return'';
    const aliases={
      'ткань':'fabric','stoff':'fabric','fabric':'fabric',
      'велюр':'velour','velur':'velour','velour':'velour',
      'алькантара':'alcantara','alcantara':'alcantara',
      'натуральная кожа':'leather','кожа':'leather','ekte skinn':'leather','genuine leather':'leather','leather':'leather',
      'экокожа':'eco_leather','искусственная кожа':'eco_leather','kunstskinn':'eco_leather','eco-skinn':'eco_leather','synthetic leather':'eco_leather','eco leather':'eco_leather',
      'винил':'vinyl','vinyl':'vinyl','замша':'suede','suede':'suede','semsket skinn':'suede',
      'комбинированный салон':'combined','kombinert interiør':'combined','mixed materials':'combined',
      'не знаю / не уверен':'unknown','vet ikke / usikker':'unknown','not sure':'unknown'
    };
    return aliases[v]||MATERIALS.find(r=>r[0]===v)?.[0]||'';
  };
  function refresh(select,current){
    const wanted=canonical(current)||select.value||'';
    const first=document.createElement('option');first.value='';first.textContent=placeholder();
    select.replaceChildren(first,...MATERIALS.map(row=>{const o=document.createElement('option');o.value=row[0];o.textContent=text(row);return o;}));
    if(wanted&&MATERIALS.some(r=>r[0]===wanted))select.value=wanted;
    select.setAttribute('aria-label',label());
    select.dataset.materialSignature=`${lang()}|${select.value||''}`;
  }
  function enhance(){
    const card=document.querySelector('.service-card.open');if(!card)return;
    const input=card.querySelector('input[name="vehicle_material"]');if(!input)return;
    const row=input.closest('.summary-row');if(!row)return;
    const labelEl=row.querySelector('[data-vehicle-label="material"]');if(labelEl&&labelEl.textContent!==label())labelEl.textContent=label();
    input.type='hidden';input.setAttribute('aria-hidden','true');
    let select=row.querySelector('select[data-vehicle-material]');
    if(!select){
      select=document.createElement('select');select.dataset.vehicleMaterial='1';
      refresh(select,input.value);
      row.append(select);
      select.addEventListener('change',()=>{
        input.value=select.value;
        select.dataset.materialSignature=`${lang()}|${select.value||''}`;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
      });
    }else{
      const current=select.value||input.value;
      const signature=`${lang()}|${current}`;
      if(select.dataset.materialSignature!==signature)refresh(select,current);
    }
  }
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-lang]'))setTimeout(enhance,20);setTimeout(enhance,0)},true);
  const obs=new MutationObserver(()=>enhance());obs.observe(document.body,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',enhance);
})();