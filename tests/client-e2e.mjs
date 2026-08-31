import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4173/index.html';
const browser = await chromium.launch({ headless: true });
let failures = [];

async function setup() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'nb-NO',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(10000);
  const dialogs = [];
  const pageErrors = [];
  const submitted = [];

  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // Stable browser tests: the UI is real, network dependencies are mocked.
  await page.route(/fxdgeizhlhgvybclvmyo\.supabase\.co/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(/\/rest\/v1\/price_rules/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(/\/rest\/v1\/app_settings/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(/\/functions\/v1\/vehicle-lookup/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ brand: 'VOLKSWAGEN', model: 'TRANSPORTER', year: 2010, body: 'Flerbruksbil (AF)' }),
    });
  });
  await page.route(/\/rest\/v1\/rpc\/public_submit_order_v2/, async (route) => {
    const body = route.request().postDataJSON();
    submitted.push(body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ order_no: 'SIR-E2E', upload_token: 'e2e-token', preliminary_price: 1690 }),
    });
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-lang="ru"]').click();
  return { context, page, dialogs, pageErrors, submitted };
}

async function title(page) {
  return (await page.locator('.service-card.open .step-title').textContent())?.trim() || '';
}

async function next(page, expectedTitle) {
  const before = await title(page);
  console.log(`STEP ${before} -> ${expectedTitle}`);
  await page.locator('.service-card.open #next').click();
  await page.waitForFunction((expected) => {
    const el = document.querySelector('.service-card.open .step-title');
    return el && el.textContent.trim() === expected;
  }, expectedTitle);
  assert.equal(await title(page), expectedTitle);
}

async function open(page, service, expectedTitle) {
  console.log(`OPEN ${service}`);
  await page.locator(`.service-card[data-service="${service}"] .service-head`).click();
  await page.waitForSelector('.service-card.open #next');
  assert.equal(await title(page), expectedTitle);
}

async function fillContactAndConsent(page) {
  console.log('CONTACT consent guard');
  await page.locator('input[name="customer_name"]').fill('Тест SIR');
  await page.locator('input[name="phone"]').fill('99999999');
  await page.locator('input[name="distance_km"]').fill('5');
  await page.waitForSelector('#sirPrivacyConsent');

  // Consent may only block the contact step, never an earlier step.
  await page.locator('.service-card.open #next').click();
  assert.equal(await title(page), 'Контакт и выезд');
  await page.waitForSelector('.privacy-consent-error:not([hidden])');
  await page.locator('#sirPrivacyConsent').check();
  await next(page, 'План и предварительный расчёт');
}

async function assertClean(run) {
  assert.deepEqual(run.dialogs, [], `Unexpected browser dialogs: ${run.dialogs.join(' | ')}`);
  assert.deepEqual(run.pageErrors, [], `Page errors: ${run.pageErrors.join(' | ')}`);
}

async function testCarFull() {
  const run = await setup();
  const { page, context, submitted } = run;
  try {
    await open(page, 'car', 'Ваш автомобиль');
    await page.locator('input[name="plate"]').fill('BR92992');
    await page.waitForSelector('.vehicle-lookup-btn');
    await page.locator('.vehicle-lookup-btn').click();
    await page.waitForSelector('input[name="vehicle_brand"]');
    assert.equal(await page.locator('input[name="vehicle_brand"]').inputValue(), 'VOLKSWAGEN');
    assert.equal(await page.locator('input[name="vehicle_model"]').inputValue(), 'TRANSPORTER');
    assert.equal(await page.locator('input[name="vehicle_year"]').inputValue(), '2010');

    await next(page, 'Что чистим?');
    await next(page, 'Степень загрязнения');
    await next(page, 'Что ещё заметно?');
    await next(page, 'Контакт и выезд');
    await fillContactAndConsent(page);

    console.log('SUBMIT order');
    await page.locator('.service-card.open #next').click();
    await page.waitForFunction(() => document.querySelector('.service-card.open .step-title')?.textContent.includes('Заявка получена'));
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0]?.p_payload?.privacy_accepted, true);
    assert.ok(submitted[0]?.p_payload?.privacy_version);
    await assertClean(run);
  } finally {
    await context.close();
  }
}

async function testCarElementsValidation() {
  const run = await setup();
  const { page, context } = run;
  try {
    await open(page, 'car', 'Ваш автомобиль');
    await next(page, 'Что чистим?');
    await page.locator('input[name="package"][value="elements"]').check();
    await next(page, 'Степень загрязнения');
    await next(page, 'Выберите элементы');
    await page.locator('input[name="el_seat"]').check();
    await next(page, 'Что ещё заметно?');
    await assertClean(run);
  } finally {
    await context.close();
  }
}

async function testSimpleService(service, firstTitle) {
  const run = await setup();
  const { page, context } = run;
  try {
    await open(page, service, firstTitle);
    await next(page, 'Степень загрязнения');
    await next(page, 'Что ещё заметно?');
    await next(page, 'Контакт и выезд');
    await fillContactAndConsent(page);
    await assertClean(run);
  } finally {
    await context.close();
  }
}

async function testLanguageAndMobileLayout() {
  const run = await setup();
  const { page, context } = run;
  try {
    console.log('LANG NO -> EN -> RU');
    await page.locator('[data-lang="no"]').click();
    assert.equal(await page.locator('[data-lang="no"]').getAttribute('class').then(v => v?.includes('active')), true);
    await page.locator('[data-lang="en"]').click();
    assert.equal(await page.locator('[data-lang="en"]').getAttribute('class').then(v => v?.includes('active')), true);
    await page.locator('[data-lang="ru"]').click();
    assert.equal(await page.locator('[data-lang="ru"]').getAttribute('class').then(v => v?.includes('active')), true);

    const sofaTitleDisplay = await page.locator('.service-card[data-service="sofa"] .service-title').evaluate(el => getComputedStyle(el).display);
    const sofaSubDisplay = await page.locator('.service-card[data-service="sofa"] .service-sub').evaluate(el => getComputedStyle(el).display);
    assert.equal(sofaTitleDisplay, 'block');
    assert.equal(sofaSubDisplay, 'block');

    const fixed = await page.locator('.fixed-actions').boundingBox();
    assert.ok(fixed && fixed.height > 0, 'Mobile fixed actions must be visible');
    await assertClean(run);
  } finally {
    await context.close();
  }
}

const tests = [
  ['car full flow + vehicle + submit', testCarFull],
  ['car elements branch', testCarElementsValidation],
  ['sofa flow', () => testSimpleService('sofa', 'Размер дивана')],
  ['chair flow', () => testSimpleService('chair', 'Тип кресла')],
  ['mattress flow', () => testSimpleService('mattress', 'Матрас')],
  ['language + mobile layout', testLanguageAndMobileLayout],
];

for (const [name, fn] of tests) {
  try {
    console.log(`\nTEST ${name}`);
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.stack || error}`);
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

await browser.close();
if (failures.length) {
  console.error('\nBrowser regression failures:\n' + failures.join('\n\n'));
  process.exit(1);
}
console.log(`All ${tests.length} browser regression tests passed.`);
