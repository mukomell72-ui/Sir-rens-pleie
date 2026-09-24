import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});

try{
  // Norwegian is the default for a fresh app profile.
  {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'nb-NO'});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4173/admin/',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.sir-lang-switch');
    assert.equal(await page.evaluate(()=>document.documentElement.lang),'nb');
    assert.equal(await page.evaluate(()=>localStorage.getItem('sir_admin_lang')),null);
    assert.match(await page.locator('#login h1').innerText(),/Logg inn i administrasjonspanelet/);
    assert.equal(await page.locator('#login [data-sir-lang="no"].active').count(),1);

    await Promise.all([
      page.waitForNavigation({waitUntil:'domcontentloaded'}),
      page.locator('#login [data-sir-lang="ru"]').click()
    ]);
    await page.waitForSelector('.sir-lang-switch');
    assert.equal(await page.evaluate(()=>document.documentElement.lang),'ru');
    assert.equal(await page.evaluate(()=>localStorage.getItem('sir_admin_lang')),'ru');
    assert.match(await page.locator('#login h1').innerText(),/Вход в админ-панель/);

    await page.goto('http://127.0.0.1:4173/admin/calendar.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.sir-lang-switch');
    assert.equal(await page.evaluate(()=>document.documentElement.lang),'ru');
    assert.match(await page.locator('.admin-top').innerText(),/КАЛЕНДАРЬ/);
    assert.doesNotMatch(await page.locator('.admin-top').innerText(),/←\s*Admin\b/);
    await context.close();
  }

  // Guide uses the same NO/RU preference and switch.
  {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'nb-NO'});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:4173/guide-app/index-v13.html',{waitUntil:'domcontentloaded'});
    await page.waitForSelector('.sir-lang-switch');
    assert.equal(await page.evaluate(()=>document.documentElement.lang),'nb');
    assert.equal(await page.locator('[data-sir-lang="no"].active').count(),1);
    await page.locator('[data-sir-lang="ru"]').click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('.sir-lang-switch');
    assert.equal(await page.evaluate(()=>document.documentElement.lang),'ru');
    const visible=await page.locator('body').innerText();
    for(const foreign of ['Stoffkartotek','CAUTION','HIGH RISK','manufacturer_verified','source_reviewed']){
      assert.ok(!visible.includes(foreign),`Russian mode leaked foreign UI token: ${foreign}`);
    }
    await context.close();
  }
}finally{
  await browser.close();
}

console.log('ADMIN/GUIDE I18N PASS');
