// Drives the dev server's page in headless Chromium: sample, chunk, dictionary, pin, drag, reload.
// usage: npm run dev -- --port 5198 & npm install --no-save playwright && npx playwright install chromium && node tools/ui_check.mjs <screenshot-dir> [http://localhost:5198]
import { chromium } from 'playwright';
const sc = process.argv[2] ?? '.';
const base = process.argv[3] ?? 'http://localhost:5198';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/grc/');                       // deep link straight into a language
await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('dictionary ready'));
console.log('deep link /grc/ ->', await page.textContent('nav.languages a[aria-current=page]'));
await page.goto(base + '/');
await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('dictionary ready'));
console.log('bar current:', await page.textContent('nav.languages a[aria-current=page]'));
// upload a text file through the picker
await page.setInputFiles('input[type=file]', { name: 'u.txt', mimeType: 'text/plain', buffer: Buffer.from('Arma virumque cano.\r\nTroiae qui primus ab oris.') });
await page.waitForSelector('.pill');
console.log('uploaded pills:', await page.$$eval('.pool .pill .surface', (els) => els.map((e) => e.textContent).join(' ')));
console.log(await page.textContent('.status'));
await page.click('button.sample:has-text("Caesar")');
await page.waitForSelector('.pill');
await page.waitForTimeout(500);
const pills = await page.$$eval('.pill', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ')));
console.log('pills:', pills.length, pills.slice(0, 12).join(' | '));
console.log('chunks:', await page.$$eval('.chunk', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))));
console.log('ambiguous:', await page.$$eval('.pill.ambiguous', (els) => els.length), 'dots:', await page.$$eval('.pill .dot', (els) => els.length), 'unknown:', await page.$$eval('.pill.unknown', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))));
await page.click('.pill:has-text("Gallia")');
await page.waitForSelector('.dictionary');
await page.waitForFunction(() => !document.querySelector('.dictionary .loading'), null, { timeout: 15000 });
console.log('dict:', (await page.textContent('.dictionary')).replace(/\s+/g, ' ').slice(0, 220));
await page.screenshot({ path: `${sc}/casus-1.png` });
console.log('ipa:', await page.$eval('.dictionary', (d) => d.querySelector('.ipa')?.textContent ?? '-'));
await page.waitForFunction(() => !/looking|procurando/.test(document.querySelector('button.speaker')?.title ?? 'looking'), null, { timeout: 60000 });
await page.click('button.speaker');
await page.waitForFunction(() => [...document.querySelectorAll('.activity .line')].some((l) => /spoken|falada/.test(l.textContent)), null, { timeout: 90000 });
console.log('speaker:', (await page.$$eval('.activity .line', (ls) => ls.map((l) => l.textContent))).filter((l) => /spoken|falada/.test(l)).pop());
await page.click('.dictionary button.pin >> nth=0');
await page.waitForTimeout(300);
await page.keyboard.press('Escape');                 // the dictionary is an overlay now; close it before dragging
await page.waitForTimeout(200);
console.log('dictionary closed by Escape:', (await page.$('.dictionary')) === null);
console.log('pinned:', await page.$$eval('.pill.pinned', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))));
async function dragTo(fromSel, toSel, { grabPadding = false } = {}) {
  const from = await (await page.$(fromSel)).boundingBox();
  const to = await (await page.$(toSel)).boundingBox();
  // grab 3 px inside the left edge (the pill's padding) or its centre
  const gx = grabPadding ? from.x + 3 : from.x + from.width / 2;
  await page.mouse.move(gx, from.y + from.height / 2); await page.mouse.down();
  for (let i = 1; i <= 15; i += 1) { await page.mouse.move(gx + (to.x + to.width - 2 - gx) * i / 15, from.y + (to.y - from.y) * i / 15); await page.waitForTimeout(30); }
  await page.mouse.up(); await page.waitForTimeout(400);
  return page.$$eval('.pool .pill .surface', (els) => els.map((e) => e.textContent));
}
// drag `omnis` to the front of the pool, grabbing its padding (not its text)
console.log('after drag (padding grab):', (await dragTo('.pill:has-text("omnis")', '.pool .item', { grabPadding: true })).slice(0, 4));
// drag the glued chunk `in partes` to the end of the pool: both halves must move
// grab the chunk by its first pill: its centre is the ⛓ button, which is not a handle
const after = await dragTo('.pool .item.chunk .pill >> nth=0', '.pool .item:last-child');
console.log('chunk to the end:', after.slice(-3), '| chunks:', await page.$$eval('.chunk', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))));
// a directory URL under /data must not kill the dev server
const dirStatus = await (await page.request.get(base + '/data/la/forms')).status();
console.log('GET /data/la/forms ->', dirStatus, '| server alive:', (await page.request.get(base + '/data/la/manifest.json')).ok());
await page.screenshot({ path: `${sc}/casus-2.png` });
await page.waitForTimeout(500);
await page.reload();
await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('dictionary ready'));
await page.click('button.sample:has-text("Caesar")');
await page.waitForSelector('.pill');
await page.waitForTimeout(500);
console.log('after reload pinned:', await page.$$eval('.pill.pinned', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))), 'order:', await page.$$eval('.pool .pill .surface', (els) => [...els.slice(0, 2), ...els.slice(-2)].map((e) => e.textContent)));
await page.click('.pill:has-text("Gallia")');
await page.waitForSelector('.dictionary');
await page.click('.overlay', { position: { x: 5, y: 5 } });   // backdrop click closes (feedback D15/D19)
await page.waitForTimeout(200);
console.log('dictionary closed by backdrop:', (await page.$('.dictionary')) === null);
await page.click('.sentence >> nth=1');
await page.waitForTimeout(300);
console.log('sentence 2 pills:', await page.$$eval('.pool .pill', (els) => els.length));
await page.click('button.help-button');
await page.waitForSelector('.help');
console.log('help lists Whitaker:', (await page.textContent('.help')).includes('Whitaker'));
await page.screenshot({ path: `${sc}/casus-3-help.png` });
await page.keyboard.press('Escape');
// the UI language flag: Portuguese chrome, Portuguese dictionary language, back to English
await page.click('button.ui-lang[data-lang=pt]');
await page.waitForTimeout(200);
console.log('pt heading:', await page.textContent('h2'), '| gloss select:', await page.inputValue('select.gloss'));
await page.click('.pill:has-text("lingua")');
await page.waitForSelector('.dictionary');
await page.waitForFunction(() => !document.querySelector('.dictionary .loading'), null, { timeout: 15000 });
console.log('pt dict for lingua:', (await page.textContent('.dictionary .gloss')).replace(/\s+/g, ' ').slice(0, 120));
await page.screenshot({ path: `${sc}/casus-6-pt.png` });
await page.keyboard.press('Escape');
await page.click('button.ui-lang[data-lang=en]');
await page.waitForTimeout(200);
// phone width: everything must stack and stay usable (feedback A2)
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
console.log('phone: horizontal overflow px:', await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
await page.screenshot({ path: `${sc}/casus-4-phone.png`, fullPage: true });
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${sc}/casus-5-wide.png` });
// ---- Ancient Greek (languages plan Task 14)
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(base + '/grc/');
await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('dictionary ready'));
await page.click('button.sample:has-text("John")'); await page.waitForSelector('.pill'); await page.waitForTimeout(600);
console.log('grc pills:', await page.$$eval('.pill', (e) => e.length), '| unknown:', await page.$$eval('.pill.unknown', (e) => e.length), '| chunks:', await page.$$eval('.chunk', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))));
await page.click('.pill:has-text("λόγος")'); await page.waitForSelector('.dictionary .ipa', { timeout: 20000 });
console.log('grc entry ipa:', await page.textContent('.dictionary .ipa'), '| source:', await page.textContent('button.dict-tab'));
await page.waitForFunction(() => !/looking|procurando/.test(document.querySelector('button.speaker')?.title ?? 'looking'), null, { timeout: 60000 });
await page.click('button.speaker');
await page.waitForFunction(() => [...document.querySelectorAll('.activity .line')].some((l) => /λόγος (spoken|falada)/.test(l.textContent)), null, { timeout: 90000 });
console.log('grc speaker: spoke λόγος');
await page.click('.dictionary button.pin >> nth=0'); await page.waitForTimeout(300);
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
console.log('grc after drag:', (await dragTo('.pill:has-text("λόγος") >> nth=0', '.pool .item')).slice(0, 4).join(' '));
await page.reload();
await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('dictionary ready'));
await page.click('button.sample:has-text("John")'); await page.waitForSelector('.pill'); await page.waitForTimeout(600);
console.log('grc after reload: pinned', await page.$$eval('.pill.pinned .surface', (e) => e.map((x) => x.textContent)), '| first:', await page.$$eval('.pool .pill .surface', (e) => e.slice(0, 2).map((x) => x.textContent).join(' ')));
await page.click('nav.languages a:has-text("Latin")'); await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('dictionary ready'));
console.log('bar -> Latin:', await page.textContent('nav.languages a[aria-current=page]'), page.url());
await page.goto(base + '/grc/game/'); await page.waitForSelector('.grid .cell');   // the old link opens the drills page, letters first
console.log('grc drill grid:', (await page.$$eval('.grid .glyph', (e) => e.map((x) => x.textContent))).join(' '));
// ---- German (languages phase 3)
await page.goto(base + '/de/');
await page.waitForFunction(() => document.querySelector('.status')?.textContent.startsWith('dictionary ready'));
await page.click('button.sample:has-text("Kafka")'); await page.waitForSelector('.pill'); await page.waitForTimeout(800);
console.log('de articles:', (await page.$$eval('.pill .article', (e) => e.map((x) => x.textContent))).join(' '), '| chunks:', JSON.stringify(await page.$$eval('.chunk', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ')))));
await page.click('.pill:has-text("Bett")'); await page.waitForSelector('.dictionary .ipa', { timeout: 20000 });
console.log('de entry:', (await page.textContent('.dictionary .form')).replace(/\s+/g, ' ').trim(), '| ipa', await page.textContent('.dictionary .ipa'));
await page.waitForSelector('.dictionary .paradigm td.reading', { timeout: 20000 });
console.log('de entry table:', await page.$$eval('.dictionary td.reading', (e) => e.map((x) => x.dataset.cell + ' ' + x.textContent)));
await page.keyboard.press('Escape');
console.log('de commas:', await page.$$eval('.pool .trail', (e) => e.map((x) => x.textContent).join(' ')));
console.log('de natural voice offered:', (await page.$('button.download')) !== null);
console.log('activity lines:', await page.$$eval('.activity .line', (els) => els.length), '| last:', (await page.textContent('.activity .line.last')).slice(0, 120));
console.log('errors:', errors);
await browser.close();
