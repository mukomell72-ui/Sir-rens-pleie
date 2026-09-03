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
  await json(r, {brand:'VOLKSWAGEN',model:'TRANSPORTER',year:2010,body:'Flerbruksbil (AF)',seats:8});
});
await page.route(/\/functions\/v1\/postal-distance/, async r => {
  if (await maybePreflight(r)) return;
  assert.deepEqual(r.request().postDataJSON(), {postalCode:'3616'});
  await json(r, {postalCode:'3616',city:'KONGSBERG',municipality:'KONGSBERG',distanceKm:2,method:'road',approximate:true});
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
  await page.evaluate(() => document.querySelector('[data-poster-lang="ru"]')?.click());
  await page.waitForFunction(() => document.querySelector('[data-lang="ru"]')?.classList.contains('active'));
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
  await page.evaluate(name => document.querySelector(`[data-poster-service="${name}"]`)?.click(), service);
  await waitTitle(expected);
};
const contactToSummary = async () => {
  await page.locator('input[name="customer_name"]').fill('Тест SIR');
  await page.locator('input[name="phone"]').fill('99999999');
  await page.locator('input[name="postal_code"]').fill('3616');
  await page.waitForFunction(()=>document.querySelector('input[name="city"]')?.value==='KONGSBERG');
  assert.equal(await page.locator('input[name="distance_km"]').inputValue(),'2');
  assert.match(await page.locator('[data-postal-status]').textContent(),/KONGSBERG.*2 км/);
  await page.waitForSelector('#sirPrivacyConsent');
  await page.waitForSelector('#sirTermsAcknowledgement');
  await page.waitForTimeout(100);
  await page.locator('.service-card.open #next').click();
  assert.equal(await title(), 'Контакт и выезд');
  await page.waitForSelector('.privacy-consent-error:not([hidden])');
  assert.equal(await page.locator('#sirPrivacyConsent').isChecked(), false);
  await page.locator('#sirPrivacyConsent').check();
  await page.locator('#sirTermsAcknowledgement').check();
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
assert.equal(await brandInput.getAttribute('list'), null);
assert.equal(await modelInput.getAttribute('list'), null);

const typeSelect=page.locator('select[data-vehicle-type]');
await typeSelect.waitFor();
assert.equal(await page.locator('[data-vehicle-label="body"]').textContent(), 'Тип автомобиля');
const typeLabels=await typeSelect.locator('option').allTextContents();
assert.ok(typeLabels.includes('Седан'));
assert.ok(typeLabels.includes('Кроссовер'));
assert.ok(typeLabels.includes('SUV / внедорожник'));
assert.ok(typeLabels.includes('Минивэн / MPV'));
assert.ok(typeLabels.includes('Микроавтобус / пассажирский фургон'));
assert.ok(typeLabels.includes('Фургон / коммерческий'));
assert.ok(typeLabels.includes('Пикап'));

await brandInput.fill('vol');
await page.waitForSelector('.sir-vehicle-dropdown:not([hidden]) .sir-vehicle-option');
let visibleOptions=await page.locator('input[name="vehicle_brand"] + .sir-vehicle-dropdown .sir-vehicle-option').allTextContents();
assert.deepEqual(visibleOptions.sort(), ['VOLKSWAGEN','VOLVO'].sort());
await page.locator('input[name="vehicle_brand"] + .sir-vehicle-dropdown .sir-vehicle-option', {hasText:'VOLKSWAGEN'}).click();
assert.equal(await brandInput.inputValue(), 'VOLKSWAGEN');

await modelInput.fill('tra');
await page.waitForSelector('input[name="vehicle_model"] + .sir-vehicle-dropdown:not([hidden]) .sir-vehicle-option');
visibleOptions=await page.locator('input[name="vehicle_model"] + .sir-vehicle-dropdown .sir-vehicle-option').allTextContents();
assert.ok(visibleOptions.every(v=>v.toLowerCase().startsWith('tra')));
assert.ok(visibleOptions.includes('Transporter'));
await page.locator('input[name="vehicle_model"] + .sir-vehicle-dropdown .sir-vehicle-option', {hasText:'Transporter'}).click();
assert.equal(await modelInput.inputValue(), 'Transporter');
await brandInput.fill('');
await modelInput.fill('');

await page.locator('input[name="plate"]').fill('BR92992');
await page.waitForSelector('.vehicle-lookup-btn');
await page.locator('.vehicle-lookup-btn').click();
await page.waitForFunction(() => document.querySelector('input[name="vehicle_brand"]')?.value === 'VOLKSWAGEN', null, {timeout:8000});
assert.equal(await brandInput.inputValue(), 'VOLKSWAGEN');
assert.equal(await modelInput.inputValue(), 'TRANSPORTER');
assert.equal(await page.locator('input[name="vehicle_year"]').inputValue(), '2010');
assert.equal(await page.locator('input[name="seats"][value="8"]').isChecked(), true);
await page.waitForFunction(()=>document.querySelector('select[data-vehicle-type]')?.value==='mpv',null,{timeout:8000});
assert.equal(await typeSelect.inputValue(), 'mpv');
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
assert.equal(submissions[0]?.p_payload?.terms_acknowledged, true);
assert.ok(submissions[0]?.p_payload?.terms_version);
assert.equal(submissions[0]?.p_payload?.request_not_contract, true);

await loadRu();
await openService('car', 'Ваш автомобиль');
await domNext('Что чистим?');
await page.locator('input[name="package"][value="elements"]').check();
await page.waitForSelector('.inline-elements-panel.open');
await page.locator('label[for="inline-el_seat"]').click();
await page.locator('[data-inline-qty="seat"] [data-inline-plus="seat"]').click();
await page.locator('[data-inline-qty="seat"] [data-inline-plus="seat"]').click();
assert.equal(await page.locator('.inline-elements-panel input[name="seat_qty"]').inputValue(),'3');
await page.locator('label[for="inline-el_ceiling"]').click();
assert.equal(await page.locator('.inline-elements-panel input[name="el_seat"]').isChecked(),true);
assert.equal(await page.locator('.inline-elements-panel input[name="el_ceiling"]').isChecked(),true);
await domNext('Степень загрязнения');
await domNext('Что ещё заметно?');

for (const [service, first] of [['sofa','Размер дивана'],['chair','Тип кресла'],['mattress','Матрас']]) {
  await loadRu();
  await openService(service, first);
  await domNext(service==='mattress'?'Материал матраса':'Материал обивки');
  await page.locator('input[name="material"]').first().check();
  await domNext('Степень загрязнения');
  await domNext('Что ещё заметно?');
  await domNext('Контакт и выезд');
  await contactToSummary();
}

await loadRu();
await page.locator('[data-poster-menu]').click();
await page.locator('[data-menu-service="rug"]').click();
await waitTitle('Размер ковра');
await domNext('Материал ковра');
await page.locator('input[name="material"][value="wool"]').check();
await domNext('Степень загрязнения');

await page.goto('http://127.0.0.1:4173/index.html', {waitUntil:'domcontentloaded'});
for (const lang of ['no','en','ru']) {
  await page.locator(`[data-poster-lang="${lang}"]`).click();
  assert.ok((await page.locator(`[data-lang="${lang}"]`).getAttribute('class'))?.includes('active'));
}
assert.equal(await page.locator('.service-card[data-service="sofa"] .service-title').evaluate(e=>getComputedStyle(e).display),'block');
assert.equal(await page.locator('.service-card[data-service="sofa"] .service-sub').evaluate(e=>getComputedStyle(e).display),'block');
assert.deepEqual(dialogs, []);
assert.deepEqual(errors, []);

await context.close();
await browser.close();
console.log('FINAL MOBILE E2E PASS');
