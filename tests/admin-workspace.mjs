import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ru-RU'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));

await page.goto('http://127.0.0.1:4173/admin/',{waitUntil:'commit'});
await page.waitForSelector('#recoveryButton',{timeout:45000});
await page.locator('#recoveryButton').click();
assert.match(await page.locator('#loginStatus').innerText(),/Сначала введите email/);
await page.locator('#previewBtn').click();
await page.waitForSelector('#app:not(.hidden)');
assert.equal((await page.locator('#main h1').first().textContent()).trim(),'Сегодня');
assert.equal(await page.getByText('Только то, что требует решения или действия').count(),1);
assert.equal(await page.locator('[data-view="orders"]').count(),1);
assert.equal(await page.locator('[data-view="guide"]').count(),1);
const siteLink=await page.evaluate(()=>{const el=document.querySelector('.admin-site-link');return el&&{text:el.textContent.trim(),href:el.getAttribute('href'),target:el.target,rel:el.rel,visible:el.getClientRects().length>0}});
assert.deepEqual(siteLink,{text:'Открыть сайт',href:'../',target:'_blank',rel:'noopener noreferrer',visible:true});

await page.locator('[data-view="orders"]').click();
await page.waitForSelector('#orderSearch');
assert.equal(await page.locator('#orderStatus').count(),1);

await page.locator('[data-view="guide"]').click();
await page.waitForSelector('.guide-rules');
assert.equal(await page.locator('.guide-frame').count(),1);
assert.match(await page.locator('.guide-rules').innerText(),/spot-test либо STOP/);

const layout=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth,top:document.querySelector('.admin-top').getBoundingClientRect(),main:document.querySelector('.main').getBoundingClientRect()}));
assert.ok(layout.doc<=layout.viewport+1,`Admin overflows mobile viewport: ${JSON.stringify(layout)}`);
assert.ok(layout.main.width<=layout.viewport+1);
assert.deepEqual(errors,[]);

await context.close();await browser.close();
console.log('ADMIN MOBILE WORKSPACE PASS');
