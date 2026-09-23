import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};

try{
  await page.goto('http://127.0.0.1:4173/guide-app/index-v13.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#guideHealth',{timeout:15000});
  const health=await page.locator('#guideHealth').innerText();
  assert(health.includes('Контроль справочника: OK'),'Guide health failed: '+health);

  const width=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  assert(width.sw<=width.cw+1,'Horizontal overflow: '+JSON.stringify(width));

  await page.locator('#q').fill('Green Star');
  await page.locator('.card .head').first().click();
  const green=await page.locator('.card.open').first().innerText();
  for(const marker of ['HMS / опасности','СИЗ','Первая помощь','Проверка HMS','SDS / HMS-источник']){
    assert(green.includes(marker),'Green Star missing '+marker);
  }

  await page.locator('#q').fill('Gtechniq W4');
  await page.locator('.card .head').first().click();
  const w4=await page.locator('.card.open').first().innerText();
  assert(/STOP/i.test(w4),'Legacy W4 must visibly show STOP');

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
