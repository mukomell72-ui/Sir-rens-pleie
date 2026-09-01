(() => {
  const FIELD_NAMES=['vehicle_brand','vehicle_model'];
  const MODEL_PREFIX_ALIASES={
    volkswagen:[
      'T4 — Transporter','T5 — Transporter','T6 — Transporter','T6.1 — Transporter','T7 — Transporter',
      'T4 — Caravelle','T5 — Caravelle','T6 — Caravelle','T6.1 — Caravelle',
      'T4 — Multivan','T5 — Multivan','T6 — Multivan','T6.1 — Multivan','T7 — Multivan'
    ]
  };

  function norm(value){
    return String(value||'').trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[-_.\s]+/g,' ');
  }

  function compact(value){return norm(value).replace(/\s+/g,'');}

  function text(){
    const lang=localStorage.getItem('sir_lang')||'no';
    if(lang==='ru')return{empty:'Нет подходящих вариантов',chooseBrand:'Сначала выберите марку'};
    if(lang==='en')return{empty:'No matching options',chooseBrand:'Choose a make first'};
    return{empty:'Ingen passende valg',chooseBrand:'Velg merke først'};
  }

  function ensureStyle(){
    if(document.getElementById('sir-vehicle-autocomplete-style'))return;
    const style=document.createElement('style');
    style.id='sir-vehicle-autocomplete-style';
    style.textContent=`
      .sir-autocomplete-wrap{position:relative;flex:1;min-width:0}
      .sir-autocomplete-wrap>input{width:100%}
      .sir-vehicle-dropdown{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:80;max-height:248px;overflow:auto;background:#0b1216;border:1px solid var(--line);border-radius:14px;box-shadow:0 16px 34px #0009;padding:5px}
      .sir-vehicle-dropdown[hidden]{display:none!important}
      .sir-vehicle-option{display:block;width:100%;min-height:44px;border:0;border-bottom:1px solid #ffffff0d;border-radius:9px;background:transparent;color:var(--text);font:inherit;font-size:16px;font-weight:800;text-align:left;padding:10px 12px;cursor:pointer}
      .sir-vehicle-option:last-child{border-bottom:0}
      .sir-vehicle-option:active,.sir-vehicle-option:focus-visible{background:#18302f;outline:2px solid var(--accent);outline-offset:-2px}
      .sir-vehicle-empty{padding:11px 12px;color:var(--muted);font-size:14px}
      @media(max-width:560px){.sir-vehicle-dropdown{max-height:220px}.sir-vehicle-option{min-height:48px}}
    `;
    document.head.append(style);
  }

  function sourceValues(input){
    const listId=input.name==='vehicle_brand'?'sir-vehicle-brands':'sir-vehicle-models';
    const list=document.getElementById(listId);
    const values=list?[...list.querySelectorAll('option')].map(o=>o.value).filter(Boolean):[];
    if(input.name==='vehicle_model'){
      const brand=document.querySelector('.service-card.open input[name="vehicle_brand"]');
      const aliases=MODEL_PREFIX_ALIASES[compact(brand?.value)]||[];
      return [...new Set([...aliases,...values])];
    }
    return values;
  }

  function filteredValues(input){
    const needle=compact(input.value);
    if(!needle)return[];
    return sourceValues(input).filter(v=>compact(v).startsWith(needle)).slice(0,10);
  }

  function close(menu){menu.hidden=true;menu.replaceChildren();}

  function choose(input,value,menu){
    input.value=value;
    if(input.name==='vehicle_brand'){
      const model=document.querySelector('.service-card.open input[name="vehicle_model"]');
      if(model&&model.value){model.value='';model.dispatchEvent(new Event('input',{bubbles:true}));model.dispatchEvent(new Event('change',{bubbles:true}));}
    }
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    close(menu);
    input.focus({preventScroll:true});
  }

  function render(input,menu){
    input.removeAttribute('list');
    const labels=text();
    const needle=compact(input.value);
    if(!needle){close(menu);return;}

    const values=filteredValues(input);
    menu.replaceChildren();
    if(!values.length){
      const empty=document.createElement('div');
      empty.className='sir-vehicle-empty';
      empty.textContent=input.name==='vehicle_model' && sourceValues(input).length===0?labels.chooseBrand:labels.empty;
      menu.append(empty);
      menu.hidden=false;
      return;
    }

    for(const value of values){
      const option=document.createElement('button');
      option.type='button';
      option.className='sir-vehicle-option';
      option.textContent=value;
      option.dataset.value=value;
      option.addEventListener('pointerdown',e=>e.preventDefault());
      option.addEventListener('click',()=>choose(input,value,menu));
      menu.append(option);
    }
    menu.hidden=false;
  }

  function attach(input){
    input.removeAttribute('list');
    input.setAttribute('autocomplete','off');
    if(input.dataset.sirDropdown==='1')return;
    input.dataset.sirDropdown='1';

    const parent=input.parentElement;
    const wrap=document.createElement('div');
    wrap.className='sir-autocomplete-wrap';
    parent.insertBefore(wrap,input);
    wrap.append(input);

    const menu=document.createElement('div');
    menu.className='sir-vehicle-dropdown';
    menu.hidden=true;
    menu.setAttribute('role','listbox');
    wrap.append(menu);

    input.addEventListener('input',()=>render(input,menu));
    input.addEventListener('focus',()=>render(input,menu));
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){close(menu);return;}
      if(e.key==='ArrowDown'&&!menu.hidden){e.preventDefault();menu.querySelector('.sir-vehicle-option')?.focus();}
    });
    menu.addEventListener('keydown',e=>{
      const options=[...menu.querySelectorAll('.sir-vehicle-option')];
      const i=options.indexOf(document.activeElement);
      if(e.key==='ArrowDown'&&i>=0){e.preventDefault();options[Math.min(i+1,options.length-1)]?.focus();}
      else if(e.key==='ArrowUp'&&i>=0){e.preventDefault();if(i===0)input.focus();else options[i-1]?.focus();}
      else if(e.key==='Escape'){e.preventDefault();close(menu);input.focus();}
    });
  }

  function attachAll(){
    ensureStyle();
    for(const name of FIELD_NAMES){
      document.querySelectorAll(`input[name="${name}"]`).forEach(attach);
    }
  }

  document.addEventListener('pointerdown',e=>{
    document.querySelectorAll('.sir-vehicle-dropdown:not([hidden])').forEach(menu=>{
      if(!menu.parentElement?.contains(e.target))close(menu);
    });
  });
  document.addEventListener('focusin',e=>{
    if(FIELD_NAMES.includes(e.target?.name))e.target.removeAttribute('list');
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-lang]'))setTimeout(attachAll,30);
  });

  const observer=new MutationObserver(()=>attachAll());
  observer.observe(document.body,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',attachAll);
})();
