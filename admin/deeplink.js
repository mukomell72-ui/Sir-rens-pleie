(() => {
  const orderId=new URLSearchParams(location.search).get('order');
  if(!orderId)return;
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    const app=document.getElementById('app');
    if(!app||app.classList.contains('hidden')){if(attempts>120)clearInterval(timer);return;}
    const ordersBtn=document.querySelector('#nav [data-view="orders"]');
    if(ordersBtn&&!ordersBtn.classList.contains('active')){ordersBtn.click();return;}
    const row=document.querySelector(`.order-row[data-id="${CSS.escape(orderId)}"]`);
    if(row){clearInterval(timer);row.click();history.replaceState({},'',location.pathname);}
    else if(attempts>120)clearInterval(timer);
  },150);
})();
