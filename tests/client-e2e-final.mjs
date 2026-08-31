import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'nb-NO' });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const dialogs = [];
const errors = [];
const submissions = [];
page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
page.on('pageerror', e => errors.push(e.message));

await page.route(/fxdgeizhlhgvybclvmyo\.supabase\.co/, r => r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(/\/rest\/v1\/price_rules/, r => r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(/\/rest\/v1\/app_settings/, r => r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route(/\/functions\/v1\/vehicle-lookup/, r => r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({brand:'VOLKSWAGEN',model:'TRANSPORTER',year:2010,body:'Flerbruksbil (AF)'})}));
await page.route(/\/rest\/v1\/rpc\/public_submit_order_v2/, async r => {
  submissions.push(r.request().postDataJSON());
  await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({order_no:'SIR-E2E',upload_token:'token',preliminary_price:1690})});
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
  await page.waitForFunction(e => document.querySelector('.service-card.open .step-title')?.textContent.trim() === e, expected);
  assert.equal(await title(), expected);
};
const domNext = async expected => {
  await page.waitForTimeout(250);
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
  await page.waitForTimeout(500);
  await page.locator('.service-card.open #next').click();
  assert.equal(await title(), 'Контакт и выезд');
  await page.waitForSelector('.privacy-consent-error:not([hidden])');
  assert.equal(await page.locator('#sirPrivacyConsent').isChecked(), false);
  await page.locator('#sirPrivacyConsent').check();
  assert.equal(await page.locator('#sirPrivacyConsent').isChecked(), true);
  await domNext('План и предварительный расчёт');
};

// Full car flow + lookup + submission.
await openService('car', 'Ваш автомобиль');
await page.locator('input[name="plate"]').fill('BR92992');
await page.waitForSelector('.vehicle-lookup-btn');
await page.locator('.vehicle-lookup-btn').click();
await page.waitForSelector('input[name="vehicle_brand"]');
assert.equal(await page.locator('input[name="vehicle_brand"]').inputValue(), 'VOLKSWAGEN');
assert.equal(await page.locator('input[name="vehicle_model"]').inputValue(), 'TRANSPORTER');
assert.equal(await page.locator('input[name="vehicle_year"]').inputValue(), '2010');
await page.waitForTimeout(500);
await page.locator('.service-card.open #next').click();
await waitTitle('Что чистим?');
await domNext('Степень загрязнения');
await domNext('Что ещё заметно?');
await domNext('Контакт и выезд');
await contactToSummary();
await page.evaluate(() => document.querySelector('.service-card.open #next').click());
await page.waitForFunction(() => document.querySelector('.service-card.open .step-title')?.textContent.includes('Заявка получена'));
assert.equal(submissions.length, 1);
assert.equal(submissions[0]?.p_payload?.privacy_accepted, true);
assert.ok(submissions[0]?.p_payload?.privacy_version);

// Separate-elements branch.
await loadRu();
await openService('car', 'Ваш автомобиль');
await domNext('Что чистим?');
await page.locator('input[name="package"][value="elements"]').check();
await domNext('Степень загрязнения');
await domNext('Выберите элементы');
await page.locator('input[name="el_seat"]').check();
await domNext('Что ещё заметно?');

// Furniture flows reach summary with fresh consent state.
for (const [service, first] of [['sofa','Размер дивана'],['chair','Тип кресла'],['mattress','Матрас']]) {
  await loadRu();
  await openService(service, first);
  await domNext('Степень загрязнения');
  await domNext('Что ещё заметно?');
  await domNext('Контакт и выезд');
  await contactToSummary();
}

// Language controls and mobile card spacing.
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
