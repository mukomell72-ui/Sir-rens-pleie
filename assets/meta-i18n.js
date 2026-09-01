(() => {
  const content={
    no:{title:'SIR Rens & Pleie — Kongsberg',description:'Profesjonell rens av bilinteriør, sofa, lenestol og madrass i Kongsberg og opptil 40 km rundt byen.',footer:'Kongsberg · utrykning opptil 40 km',privacy:'Personvern'},
    en:{title:'SIR Rens & Pleie — Kongsberg',description:'Professional cleaning of car interiors, sofas, armchairs and mattresses in Kongsberg and within 40 km.',footer:'Kongsberg · mobile service within 40 km',privacy:'Privacy'},
    ru:{title:'SIR Rens & Pleie — Kongsberg',description:'Профессиональная химчистка салона автомобиля, диванов, кресел и матрасов в Kongsberg и радиусе до 40 км.',footer:'Kongsberg · выезд до 40 км',privacy:'Конфиденциальность'}
  };
  function apply(){
    const lang=localStorage.getItem('sir_lang')||'no',t=content[lang]||content.no;
    document.title=t.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content',t.description);
    const footer=document.querySelector('.footer .footer-grid>div:first-child');
    if(footer){
      for(const n of footer.childNodes){if(n.nodeType===Node.TEXT_NODE&&n.nodeValue.includes('Kongsberg'))n.nodeValue=`${t.footer}\n`;}
      const a=footer.querySelector('a[href="privacy.html"]');if(a)a.textContent=t.privacy;
    }
  }
  addEventListener('DOMContentLoaded',()=>{apply();document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setTimeout(apply,0)));});
})();
