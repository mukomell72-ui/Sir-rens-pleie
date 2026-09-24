import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};

async function openCase({abortPattern=null,viewport={width:390,height:844}}={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});
  const page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('sir_admin_lang','ru'));
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  if(abortPattern)await page.route(abortPattern,route=>route.abort());
  await page.goto('http://127.0.0.1:4173/guide-app/index-v13.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#guideHealth',{timeout:15000});
  return {context,page,pageErrors};
}

try{
  {
    const {context,page,pageErrors}=await openCase();
    await page.evaluate(()=>{
      window.postMessage({
        type:'sir-guide-chemicals',
        items:[{
          id:'malformed-live-row',
          active:true,
          verification_status:'manufacturer_verified',
          hse_status:'verified',
          brand:'Broken',
          name:'Malformed Verified',
          intended_surfaces:{not:'an array'},
          prohibited_surfaces:'also wrong',
          dilution:'1:10',
          application_method:'spray',
          source_note:'not-a-url',
          sds_url:'javascript:alert(1)',
          hse_hazards:'x',
          hse_ppe:'x',
          hse_first_aid:'x',
          hse_storage:'x',
          hse_verified_at:new Date().toISOString()
        }]
      },location.origin);
    });
    await page.waitForTimeout(100);
    const rejected=await page.evaluate(()=>window.SIR_DB_REJECTIONS||[]);
    assert(rejected.length===1,'Malformed live DB row must be rejected');
    assert(await page.locator('text=Malformed Verified').count()===0,'Rejected DB row leaked into UI');
    const health=await page.locator('#guideHealth').innerText();
    assert(health.includes('Контроль справочника: OK'),'Malformed DB payload must not corrupt static guide: '+health);
    assert(pageErrors.length===0,'Malformed DB payload caused page error: '+pageErrors.join(' | '));
    await context.close();
  }

  {
    const {context,page,pageErrors}=await openCase({abortPattern:'**/hse-v13.js*'});
    const health=await page.locator('#guideHealth').innerText();
    assert(health.includes('STOP:'),'Missing HSE layer must force STOP');
    assert(await page.locator('#sirRuntimeAlert').count()===1,'Missing critical HSE script must show runtime STOP alert');
    assert(pageErrors.length===0,'Missing HSE layer caused page error: '+pageErrors.join(' | '));
    await context.close();
  }

  {
    const {context,page,pageErrors}=await openCase({abortPattern:'**/inventory-v13-3.js*'});
    const health=await page.locator('#guideHealth').innerText();
    assert(health.includes('STOP:'),'Missing inventory chunk must force STOP');
    assert(/Неполный инвентарь|Системные ошибки/.test(health),'Missing inventory reason must be visible: '+health);
    assert(pageErrors.length===0,'Missing inventory chunk caused page error: '+pageErrors.join(' | '));
    await context.close();
  }

  {
    const {context,page,pageErrors}=await openCase({viewport:{width:1280,height:900}});
    assert(await page.locator('.pro-sidebar').isVisible(),'Desktop sidebar must be visible');
    assert(!(await page.locator('.pro-mobile-nav').isVisible()),'Mobile nav must be hidden on desktop');
    assert(await page.locator('#dashboard').isVisible(),'Professional dashboard must be visible');
    assert(pageErrors.length===0,'Desktop professional UI caused page error: '+pageErrors.join(' | '));
    await context.close();
  }

  console.log('SIR Guide resilience/error-protection regression OK');
}finally{
  await browser.close();
}
