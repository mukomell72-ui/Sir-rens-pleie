import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU'});
const page=await context.newPage();
const errors=[];
let calls=0;
page.on('pageerror',e=>errors.push(e.message));

await page.route('**/rest/v1/rpc/public_get_order_status',async route=>{
  calls++;
  const status=calls===1?'under_review':'in_progress';
  await route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({
      order_no:'SIR-TEST-0001',
      created_at:'2026-09-24T08:00:00Z',
      service_type:'car',
      status,
      estimated_minutes:180,
      preliminary_price:1900,
      final_price:2100,
      appointment_start:'2026-09-24T10:00:00Z',
      payment_status:'unpaid'
    })
  });
});

await page.goto('http://127.0.0.1:4173/status/?o=SIR-TEST-0001&t=test-token',{waitUntil:'domcontentloaded'});
await page.getByText('На рассмотрении',{exact:true}).waitFor();
assert.match(await page.locator('.status-sync').innerText(),/Обновляется автоматически/);
assert.equal(calls,1);

await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
await page.getByText('В работе',{exact:true}).waitFor();
assert.ok(calls>=2,'Status page did not re-fetch shared order state');
assert.equal(await page.locator('.status-card.changed').count(),1);
assert.deepEqual(errors,[]);

await context.close();
await browser.close();
console.log('PUBLIC ORDER LIVE STATUS PASS');
