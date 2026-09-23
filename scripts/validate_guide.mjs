import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const ctx={window:{}};
vm.createContext(ctx);
for(const p of [
  'guide-app/photos-v13.js',
  'guide-app/inventory-v13-1.js',
  'guide-app/inventory-v13-2.js',
  'guide-app/inventory-v13-3.js',
  'guide-app/inventory-v13-4.js',
  'guide-app/hse-v13.js'
]) vm.runInContext(read(p),ctx,{filename:p});

const items=ctx.window.SIR_ITEMS||[];
const photos=ctx.window.SIR_PHOTOS||{};
const hse=ctx.window.SIR_HSE||{};
const meta=ctx.window.SIR_HSE_META||{};
const errors=[];

const norm=v=>String(v||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const canonical=v=>norm(v)
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:л|l|мл|ml|кг|kg)\b/g,' ')
  .replace(/\b(carpro)\s+\1\b/g,'$1')
  .replace(/\s+/g,' ').trim();

const core=items.filter(x=>(x.c!=='Оборудование'&&!['Расходники','Ароматы'].includes(x.c))||String(x.n).includes('FoamStop'));
if(core.length!==20)errors.push(`Expected exactly 20 working/service chemical cards, got ${core.length}`);

const seen=new Map();
for(const x of core){
  const k=canonical(x.n);
  if(seen.has(k))errors.push(`Duplicate chemical: ${x.n} / ${seen.get(k)}`);
  else seen.set(k,x.n);

  for(const field of ['n','f','d','u','a','w','am','src','photo']){
    if(!String(x[field]||'').trim())errors.push(`${x.n}: missing ${field}`);
  }
  if(x.src&&!/^https:\/\//i.test(x.src))errors.push(`${x.n}: source must be HTTPS`);
  if(x.photo&&!photos[x.photo])errors.push(`${x.n}: photo key ${x.photo} is not mapped`);
}

const hseCanon=new Map(Object.entries(hse).map(([name,row])=>[canonical(name),row]));
for(const x of core){
  const row=hse[x.n]||hseCanon.get(canonical(x.n));
  if(!row){errors.push(`${x.n}: missing HSE record`);continue;}
  for(const field of ['status','label','level','hazards','ppe','first','storage','sds','verified']){
    if(!String(row[field]||'').trim())errors.push(`${x.n}: HSE missing ${field}`);
  }
  if(row.sds&&!/^https:\/\//i.test(row.sds))errors.push(`${x.n}: HSE source must be HTTPS`);
  if(!/^(LOW|CAUTION|HIGH RISK|STOP)$/.test(String(row.level)))errors.push(`${x.n}: invalid HSE level ${row.level}`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(row.verified)))errors.push(`${x.n}: invalid HSE verified date`);
}

const w4=core.find(x=>x.n==='Gtechniq W4 Citrus Foam');
const w4h=w4&&(hse[w4.n]||hseCanon.get(canonical(w4.n)));
if(!w4||w4h?.level!=='STOP')errors.push('Legacy Gtechniq W4 must stay STOP until exact matching SDS is verified');

if(core.some(x=>/Ecolab Carpet B/i.test(x.n)))errors.push('Obsolete Ecolab Carpet B returned to working inventory');

const inv2=read('guide-app/inventory-v13-2.js');
const inv3=read('guide-app/inventory-v13-3.js');
const wiz=read('guide-app/guide-wizard.js');
const app=read('guide-app/app-v13.js');
const index=read('guide-app/index-v13.html');
const sw=read('guide-app/sw.js');

for(const [label,text,patterns] of [
  ['TASKI',inv2,[/TASKI[\s\S]*?НЕРАЗБАВЛЕНН/iu,/TASKI[\s\S]*?15 минут/iu]],
  ['Autoglym',inv3,[/125 мл Polar Wash/iu,/250 мл Polar Wash\s*\+\s*250/iu,/100 мл Polar Blast\s*\+\s*500/iu]],
  ['Wizard',wiz,[/125 мл Polar Wash/iu,/100 мл Polar Blast\s*\+\s*500/iu,/TASKI[\s\S]{0,1500}15 минут/iu]]
]){
  for(const p of patterns)if(p.test(text))errors.push(`${label}: stale/ambiguous instruction matched ${p}`);
}

if(!meta.version)errors.push('HSE metadata version missing');
if(!app.includes('SIR_GUIDE_HEALTH'))errors.push('Runtime guide health gate missing');
if(!app.includes("verification_status==='manufacturer_verified'"))errors.push('DB technology verification gate missing');
if(!app.includes("['verified','source_reviewed'].includes(c?.hse_status)"))errors.push('DB HSE ingestion gate missing');
if(!wiz.includes('function combinedRisk'))errors.push('Wizard combined HSE risk gate missing');
if(wiz.includes("return step('Бесконтактная предмойка','Gtechniq W4 Citrus Foam'"))errors.push('Legacy W4 returned to automatic wizard plan');
if(!sw.includes('ignoreSearch:true'))errors.push('Service worker query-safe offline fallback missing');
if(!sw.includes('networkWithTimeout'))errors.push('Service worker network timeout missing');

const order=['photos-v13.js','inventory-v13-1.js','inventory-v13-2.js','inventory-v13-3.js','inventory-v13-4.js','hse-v13.js','guide-wizard.js','app-v13.js'];
const positions=order.map(x=>index.indexOf(x));
if(positions.some(x=>x<0)||positions.some((x,i)=>i>0&&x<=positions[i-1]))errors.push('Guide scripts are missing or loaded in unsafe order');

if(errors.length){
  console.error('SIR Guide professional validation FAILED');
  for(const e of errors)console.error('-',e);
  process.exit(1);
}
console.log(`SIR Guide professional validation OK: ${core.length} working/service chemistry cards, ${Object.keys(hse).length} HSE records`);
