import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  locale: 'nb-NO',
  reducedMotion: 'reduce'
});
const page = await context.newPage();
page.setDefaultTimeout(8000);
const dialogs = [];
const errors = [];
const submissions = [];
page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
page.on('pageerror', e => errors.push(e.message));

const cors = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
const json = (r, body, status = 200) => r.fulfill({status, contentType:'application/json', headers:cors, body:JSON.stringify(body)});
const maybePreflight = async r => {
  if (r.request().method() === 'OPTIONS') {
    await r.fulfill({status:204, headers:cors, body:''});
    return true;
  }
  return false;
};

await page.route(/\/rest\/v1\/price_rules/, async r => { if (!(await maybePreflight(r))) await json(r, []); });
await page.route(/\/rest\/v1\/app_settings/, async r => { if (!(await maybePreflight(r))) await json(r, []); });
await page.route(/\/functions\/v1\/vehicle-lookup/, async r => {
  if (await maybePreflight(r)) return;
  await json(r, {brand:'VOLKSWAGEN',model:'TRANSPORTER',year:2010,body:'Flerbruksbil (AF)'});
});
await page.route(/\/rest\/v1\/rpc\/public_submit_order_v2/, async r => {
  if (await maybePreflight(r)) return;
  submissions.push(r.request().postDataJSON());
  await json(r, {order_no:'SIR-E2E',upload_token:'token',preliminary_price:1690});
});

const loadRu = async () => {
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil:'domcontentloaded' });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-lang="ru"]').click();
};
await loadRu();

const title = async () => (await page.locator('.service-card.open .step-title').textContent())?.trim();
const waitTitle = async expected => {
  await page.waitForFunction(e => document.querySelector('.service-card.open .step-title')?.textContent.trim() === e, expected, {timeout:8000});
  assert.equal(await title(), expected);
};
const domNext = async expected => {
  await page.waitForTimeout(100);
  const before = await page.evaluate(() => ({
    title: document.querySelector('.service-card.open .step-title')?.textContent.trim() || '',
    next: !!document.querySelector('.service-card.open #next'),
    consent: document.querySelector('#sirPrivacyConsent')?.checked ?? null,
    stored: sessionStorage.getItem('sir_privacy_consent')
  }));
  console.log('DOM_NEXT', JSON.stringify(before), '=>', expected);
  assert.equal(before.next, true, `Next button missing before transition from ${before.title}`);
  await page.evaluate(() => document.querySelector('.service-card.open #next').click());
  await waitTitle(expected);
};
const openService = async (service, expected) => {
  await page.locator(`.service-card[data-service="${service}"] .service-head`).click();
  await waitTitle(expected);
};
const contactToSummary = async () => {
  await page.locator('input[name="customer_name"]').fill('Тест SIR');
  await page.locator('input[name="phone"]').fill('99999999');
  await page.locator('input[name="distance_km"]').fill('5');
  await page.waitForSelector('#sirPrivacyConsent');
  await page.waitForTimeout(100);
  await page.locator('.service-card.open #next').click();
  assert.equal(await title(), 'Контакт и выезд');
  await page.waitForSelector('.privacy-consent-error:not([hidden])');
  assert.equal(await page.locator('#sirPrivacyConsent').isChecked(), false);
  await page.locator('#sirPrivacyConsent').check();
  assert.equal(await page.locator('#sirPrivacyConsent').isChecked(), true);
  await domNext('План и предварительный расчёт');
};

await openService('car', 'Ваш автомобиль');
await page.waitForSelector('input[name="vehicle_brand"]');
const brandInput=page.locator('input[name="vehicle_brand"]');
const modelInput=page.locator('input[name="vehicle_model"]');
assert.equal(await brandInput.inputValue(), '');
assert.equal(await modelInput.inputValue(), '');
assert.equal(await page.locator('input[name="vehicle_material"]').inputValue(), '');
assert.equal(await brandInput.getAttribute('list'), 'sir-vehicle-brands');
assert.equal(await modelInput.getAttribute('list'), 'sir-vehicle-models');
const brandOptions=await page.locator('#sir-vehicle-brands option').evaluateAll(options=>options.map(o=>o.value));
assert.ok(brandOptions.includes('VOLKSWAGEN'));
assert.ok(brandOptions.includes('VOLVO'));
await brandInput.fill('VOLKSWAGEN');
await page.waitForFunction(()=>[...document.querySelectorAll('#sir-vehicle-models option')].some(o=>o.value==='Transporter'));
const vwModels=await page.locator('#sir-vehicle-models option').evaluateAll(options=>options.map(o=>o.value));
assert.ok(vwModels.includes('Golf'));
assert.ok(vwModels.includes('Transporter'));
await brandInput.fill('');

await page.locator('input[name="plate"]').fill('BR92992');
await page.waitForSelector('.vehicle-lookup-btn');
await page.locator('.vehicle-lookup-btn').click();
await page.waitForFunction(() => document.querySelector('input[name="vehicle_brand"]')?.value === 'VOLKSWAGEN', null, {timeout:8000});
assert.equal(await brandInput.inputValue(), 'VOLKSWAGEN');
assert.equal(await modelInput.inputValue(), 'TRANSPORTER');
assert.equal(await page.locator('input[name="vehicle_year"]').inputValue(), '2010');
assert.equal(await page.locator('input[name="vehicle_body"]').inputValue(), 'Flerbruksbil (AF)');
await page.waitForFunction(()=>[...document.querySelectorAll('#sir-vehicle-models option')].some(o=>o.value==='Transporter'));
await page.waitForTimeout(100);
await page.locator('.service-card.open #next').click();
await waitTitle('Что чистим?');
await domNext('Степень загрязнения');
await domNext('Что ещё заметно?');
await domNext('Контакт и выезд');
await contactToSummary();
await page.evaluate(() => document.querySelector('.service-card.open #next').click());
await page.waitForFunction(() => document.querySelector('.service-card.open .step-title')?.textContent.includes('Заявка получена'), null, {timeout:8000});
assert.equal(submissions.length, 1);
assert.equal(submissions[0]?.p_payload?.privacy_accepted, true);
assert.ok(submissions[0]?.p_payload?.privacy_version);

await loadRu();
await openService('car', 'Ваш автомобиль');
await domNext('Что чистим?');
await page.locator('input[name="package"][value="elements"]').check();
await domNext('Степень загрязнения');
await domNext('Выберите элементы');
await page.locator('input[name="el_seat"]').check();
await domNext('Что ещё заметно?');

for (const [service, first] of [['sofa','Размер дивана'],['chair','Тип кресла'],['mattress','Матрас']]) {
  await loadRu();
  await openService(service, first);
  await domNext('Степень загрязнения');
  await domNext('Что ещё заметно?');
  await domNext('Контакт и выезд');
  await contactToSummary();
}

await page.goto('http://127.0.0.1:4173/index.html', {waitUntil:'domcontentloaded'});
for (const lang of ['no','en','ru']) {
  await page.locator(`[data-lang="${lang}"]`).click();
  assert.ok((await page.locator(`[data-lang="${lang}"]`).getAttribute('class'))?.includes('active'));
}
assert.equal(await page.locator('.service-card[data-service="sofa"] .service-title').evaluate(e=>getComputedStyle(e).display),'block');
assert.equal(await page.locator('.service-card[data-service="sofa"] .service-sub').evaluate(e=>getComputedStyle(e).display),'block');
assert.deepEqual(dialogs, []);
assert.deepEqual(errors, []);

await context.close();
await browser.close();
console.log('FINAL MOBILE E2E PASS');
