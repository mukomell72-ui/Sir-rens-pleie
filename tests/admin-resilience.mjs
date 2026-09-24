import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const adminSource=await readFile(new URL('../admin/admin.js',import.meta.url),'utf8');
assert.match(adminSource,/\['CHANNEL_ERROR','TIMED_OUT','CLOSED'\]/);
assert.match(adminSource,/scheduleRealtimeReconnect/);
assert.match(adminSource,/realtimeBackoffMs=Math\.min\(realtimeBackoffMs\*2,30000\)/);
assert.match(adminSource,/sb\.rpc\('save_order_decision',\{p_order_id:id,p_patch:\{status:next\},p_appointment:null\}\)/);
assert.match(adminSource,/sb\.rpc\('save_order_decision',\{p_order_id:id,p_patch:\{payment_status:'paid'\},p_appointment:null\}\)/);
assert.match(adminSource,/if\(!ensureWritable\(\)\)return/);

const calendarSource=await readFile(new URL('../admin/calendar.js',import.meta.url),'utf8');
const paymentsSource=await readFile(new URL('../admin/payments.js',import.meta.url),'utf8');
assert.match(adminSource,/sb\.rpc\('create_manual_order'/);
assert.match(adminSource,/sb\.rpc\('save_admin_settings_bundle'/);
assert.match(calendarSource,/sb\.rpc\('save_calendar_booking'/);
assert.doesNotMatch(calendarSource,/\.from\('appointments'\)\.insert/);
assert.match(paymentsSource,/sb\.rpc\('save_order_decision',\{p_order_id:id,p_patch:\{payment_status:status\}/);

const browser=await chromium.launch({headless:true});

// Critical dependency failure must be visible and fail closed.
{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ru-RU'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1',route=>route.abort('failed'));
  await page.goto('http://127.0.0.1:4173/admin/',{waitUntil:'domcontentloaded'});
  await page.locator('#sirRuntimeBanner.fatal').waitFor({timeout:15000});
  assert.match(await page.locator('#sirRuntimeBanner').innerText(),/Критический модуль не загрузился|Ошибка SIR Admin/);
  assert.ok(await page.evaluate(()=>!!window.SIR_ADMIN_RUNTIME));
  assert.equal(await page.evaluate(()=>window.SIR_ADMIN_RUNTIME.client),null);
  await context.close();
}

// Normal boot must use one shared client; offline state must be explicit.
{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ru-RU'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto('http://127.0.0.1:4173/admin/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#recoveryButton',{timeout:45000});
  assert.ok(await page.evaluate(()=>!!window.SIR_ADMIN_SB));
  assert.ok(await page.evaluate(()=>window.SIR_ADMIN_RUNTIME?.client===window.SIR_ADMIN_SB));

  await context.setOffline(true);
  await page.locator('#sirRuntimeBanner.offline').waitFor();
  assert.match(await page.locator('#sirRuntimeBanner').innerText(),/Нет сети/);

  await context.setOffline(false);
  await page.waitForFunction(()=>!document.querySelector('#sirRuntimeBanner')?.classList.contains('offline'));
  assert.deepEqual(pageErrors,[]);
  await context.close();
}

await browser.close();
console.log('ADMIN RESILIENCE PASS');
