import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
await page.addInitScript(()=>{localStorage.setItem('sir_language_policy_no_20260924_v2','1');localStorage.setItem('sir_admin_lang','ru');});
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};

try{
  await page.goto('http://127.0.0.1:4173/guide-app/index-v13.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#guideHealth',{timeout:15000});
  assert(await page.locator('#dashboard').isVisible(),'Professional dashboard must be visible on mobile');
  assert(await page.locator('.pro-mobile-nav').isVisible(),'Mobile bottom navigation must be visible');
  assert(!(await page.locator('.pro-sidebar').isVisible()),'Desktop sidebar must be hidden on mobile');
  assert(await page.locator('.pro-action').count()===3,'Dashboard must expose exactly 3 primary quick actions');

  const health=await page.locator('#guideHealth').innerText();
  assert(health.includes('Контроль справочника: OK'),'Guide health failed: '+health);
  assert(health.includes('следующая обязательная перепроверка'),'Guide must display HMS re-verification deadline');

  const width=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  assert(width.sw<=width.cw+1,'Horizontal overflow: '+JSON.stringify(width));

  await page.locator('#q').fill('Green Star');
  const greenCard=page.locator('.card').filter({has:page.locator('.name',{hasText:'Green Star'})}).first();
  await greenCard.locator('.name').click();
  assert(await greenCard.evaluate(el=>el.classList.contains('open')),'Green Star card did not open');
  const greenBody=greenCard.locator('.body');
  assert(await greenBody.isVisible(),'Green Star body is not visible after open');
  const green=await greenBody.textContent();
  for(const marker of ['HMS / опасности','СИЗ','Первая помощь','Проверка HMS','SDS / HMS-источник']){
    assert(green.includes(marker),'Green Star missing '+marker);
  }
  const greenCalc=greenBody.locator('[data-dilution-calc]');
  assert(await greenCalc.count()===1,'Verified Green Star must expose one dilution calculator');
  await greenCalc.locator('[data-role="ratio"]').fill('20');
  await greenCalc.locator('[data-role="total"]').fill('500');
  const greenCalcResult=await greenCalc.locator('[data-role="result"]').innerText();
  assert(greenCalcResult.includes('23.81 мл средства')&&greenCalcResult.includes('476.19 мл воды'),'Dilution calculator arithmetic failed: '+greenCalcResult);
  await greenCalc.locator('[data-role="ratio"]').fill('2');
  const rejectedRatio=await greenCalc.locator('[data-role="result"]').innerText();
  assert(rejectedRatio.includes('STOP'),'Out-of-range dilution must be blocked: '+rejectedRatio);

  await page.locator('#q').fill('Gtechniq W4');
  const w4Card=page.locator('.card').filter({has:page.locator('.name',{hasText:'Gtechniq W4'})}).first();
  await w4Card.locator('.name').click();
  assert(await w4Card.evaluate(el=>el.classList.contains('open')),'Gtechniq W4 card did not open');
  const w4Body=w4Card.locator('.body');
  assert(await w4Body.isVisible(),'Gtechniq W4 body is not visible after open');
  const w4=await w4Body.textContent();
  assert(/STOP/i.test(w4),'Legacy W4 must visibly show STOP');
  assert(await w4Body.locator('[data-dilution-calc]').count()===0,'STOP chemical must never expose dilution calculator');

  await page.locator('#q').fill('');
  await page.locator('#wizZone').selectOption('body');
  await page.locator('#wizLevel').selectOption('heavy');
  await page.locator('#wizDirt').selectOption('road');
  await page.locator('#wizBuild').click();
  const plan=await page.locator('#wizResult').innerText();
  assert(plan.includes('Autoglym Polar Blast'),'Heavy body plan must use Polar Blast');
  assert(!plan.includes('Gtechniq W4'),'Legacy W4 must not be auto-selected');
  assert(plan.includes('HMS / SDS'),'Wizard must surface HMS/SDS');

  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#guideHealth');
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForSelector('#guideHealth',{timeout:10000});
  const offline=await page.locator('#guideHealth').innerText();
  assert(offline.includes('Контроль справочника: OK'),'Offline Guide failed: '+offline);
  await context.setOffline(false);

  assert(errors.length===0,errors.join('\n'));
  console.log('SIR Guide browser/HMS/offline regression OK');
}finally{
  await browser.close();
}
