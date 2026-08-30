(() => {
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:(input?.url||'');
    const response=await nativeFetch(input,init);
    if(url.includes('/rest/v1/rpc/public_submit_order_v2')&&response.ok){
      try{
        const data=await response.clone().json();
        if(data?.order_no&&data?.status_token){
          sessionStorage.setItem('sir_last_order_status',JSON.stringify({order_no:data.order_no,token:data.status_token}));
          setTimeout(()=>appendStatusLink(data.order_no,data.status_token),60);
        }
      }catch(_e){}
    }
    return response;
  };
  function appendStatusLink(orderNo,token){
    const body=document.querySelector('.service-card.open .service-body');if(!body)return;
    const lang=localStorage.getItem('sir_lang')||'no';
    const label=lang==='ru'?'Следить за статусом заказа':lang==='en'?'Track order status':'Følg ordrestatus';
    const note=lang==='ru'?'Сохраните эту ссылку: она открывает только статус вашего заказа.':lang==='en'?'Save this link: it only opens the status of your order.':'Lagre denne lenken: den viser bare status for din ordre.';
    const u=new URL('status/',new URL('./',location.href));u.searchParams.set('o',orderNo);u.searchParams.set('t',token);
    let box=body.querySelector('.status-link-box');if(!box){box=document.createElement('div');box.className='notice safe status-link-box';body.appendChild(box);}
    box.innerHTML=`<b>${note}</b><br><a class="btn" style="margin-top:8px" href="${u.href}">${label}</a>`;
  }
})();
