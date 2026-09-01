(() => {
  let lang=localStorage.getItem('sir_lang')||'no';
  const valid=new Set(['no','en','ru']);if(!valid.has(lang))lang='no';
  const numberFor=(v,target)=>target==='en'?String(v).replace(',','.'):String(v).replace('.',',');
  const tr=text=>{
    const s=text.trim();let m;
    if((m=s.match(/^(\d+)\s+(?:места|seter|seats)$/)))return lang==='ru'?`${m[1]} места`:lang==='no'?`${m[1]} seter`:`${m[1]} seats`;
    if((m=s.match(/^(.+)\s\/\s(?:шт\.|stk\.|item)$/)))return lang==='ru'?`${m[1]} / шт.`:lang==='no'?`${m[1]} / stk.`:`${m[1]} / item`;
    if((m=s.match(/^([\d.,]+)–([\d.,]+)\s(?:ч|t|h)$/))){const a=numberFor(m[1],lang),b=numberFor(m[2],lang);return lang==='ru'?`${a}–${b} ч`:lang==='no'?`${a}–${b} t`:`${a}–${b} h`;}

    const composite=s.match(/^(?:Выбранные элементы|Valgte områder|Selected areas): (.+?) · (?:Полный салон дешевле на|Komplett interiør er) (.+?)(?: billigere)?$/);
    if(composite){const [,price,diff]=composite;return lang==='ru'?`Выбранные элементы: ${price} · Полный салон дешевле на ${diff}`:lang==='no'?`Valgte områder: ${price} · Komplett interiør er ${diff} billigere`:`Selected areas: ${price} · Full interior is ${diff} cheaper`;}
    const compositeMore=s.match(/^(?:Выбранные элементы|Valgte områder|Selected areas): (.+?) · (?:Полный салон всего на|Komplett interiør koster bare|Full interior is only) (.+?) (?:дороже|mer|more)$/);
    if(compositeMore){const [,price,diff]=compositeMore;return lang==='ru'?`Выбранные элементы: ${price} · Полный салон всего на ${diff} дороже`:lang==='no'?`Valgte områder: ${price} · Komplett interiør koster bare ${diff} mer`:`Selected areas: ${price} · Full interior is only ${diff} more`;}

    if((m=s.match(/^(?:он дешевле выбранных элементов на|det er|it is) (.+?)(?: billigere enn de valgte områdene| cheaper than the selected areas)?\. (?:Полный пакет включает все основные зоны|Komplett pakke inkluderer alle hovedområdene|The full package includes all main areas)\.$/))){const diff=m[1];return lang==='ru'?`он дешевле выбранных элементов на ${diff}. Полный пакет включает все основные зоны.`:lang==='no'?`det er ${diff} billigere enn de valgte områdene. Komplett pakke inkluderer alle hovedområdene.`:`it is ${diff} cheaper than the selected areas. The full package includes all main areas.`;}
    if((m=s.match(/^(?:доплата только|tillegget er bare|the extra cost is only) (.+?)\. (?:Полный пакет включает все основные зоны|Komplett pakke inkluderer alle hovedområdene|The full package includes all main areas)\.$/))){const diff=m[1];return lang==='ru'?`доплата только ${diff}. Полный пакет включает все основные зоны.`:lang==='no'?`tillegget er bare ${diff}. Komplett pakke inkluderer alle hovedområdene.`:`the extra cost is only ${diff}. The full package includes all main areas.`;}

    if((m=s.match(/^(?:Фото прикреплено|Bilder lastet opp|Photos uploaded): (\d+)(?:\. (?:Не загрузилось|Kunne ikke laste opp|Failed to upload): (\d+))?\.$/))){const ok=m[1],fail=m[2];if(lang==='ru')return `Фото прикреплено: ${ok}${fail?`. Не загрузилось: ${fail}`:''}.`;if(lang==='no')return `Bilder lastet opp: ${ok}${fail?`. Kunne ikke laste opp: ${fail}`:''}.`;return `Photos uploaded: ${ok}${fail?`. Failed to upload: ${fail}`:''}.`;}
    const photoFail={
      ru:'Фото не прикрепились — их можно отправить менеджеру сообщением.',
      no:'Bildene ble ikke lastet opp — de kan sendes til SIR i en melding.',
      en:'The photos were not uploaded — they can be sent to SIR in a message.'
    };
    if(Object.values(photoFail).includes(s))return photoFail[lang];
    return null;
  };
  function apply(root=document.body){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){if(!n.parentElement||['SCRIPT','STYLE'].includes(n.parentElement.tagName))continue;const before=n.nodeValue,after=tr(before);if(after&&after!==before.trim()){const lead=before.match(/^\s*/)?.[0]||'',tail=before.match(/\s*$/)?.[0]||'';n.nodeValue=lead+after+tail;}}}
  addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{lang=b.dataset.lang;if(valid.has(lang))setTimeout(()=>apply(),0);}));
    apply();
    const obs=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType===1)apply(n);else if(n.nodeType===3)apply(n.parentElement||document.body);}});obs.observe(document.body,{subtree:true,childList:true,characterData:false});
  });
})();
