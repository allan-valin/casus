// Drives both spike pages in headless Chromium and fills the README's criteria.
// usage: node spikes/drag/measure.mjs http://localhost:5199
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5199';

function overlap(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

async function boxes(page) {
  return page.$$eval('.pill', (els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { text: e.dataset.text, x: r.x, y: r.y, width: r.width, height: r.height, dragged: e.classList.contains('sortable-chosen') || e.getAttribute('aria-grabbed') === 'true' || e.id?.startsWith('dnd-action-dragged') || false };
  }));
}

async function drag(page, text, target, steps = 20) {
  const el = await page.$(`.pill[data-text="${text}"]`);
  const from = await el.boundingBox();
  const to = await (await page.$(`.pill[data-text="${target}"]`)).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  const frames = [];
  const dx = (to.x + 4 - (from.x + from.width / 2)) / steps;
  const dy = (to.y + to.height / 2 - (from.y + from.height / 2)) / steps;
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(from.x + from.width / 2 + dx * i, from.y + from.height / 2 + dy * i);
    await page.waitForTimeout(40);
    frames.push(await boxes(page));
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
  return frames;
}

function judge(before, frames, after, draggedText) {
  const still = (f) => f.filter((b) => b.text !== draggedText && !b.dragged && b.width > 0);
  const pos = (f) => Object.fromEntries(still(f).map((b) => [b.text, `${Math.round(b.x)},${Math.round(b.y)}`]));
  const p0 = pos(before);
  const slid = frames.some((f) => Object.entries(pos(f)).some(([t, p]) => p0[t] !== undefined && p0[t] !== p));
  let overlapped = false;
  for (const f of frames) {
    const s = still(f);
    for (let i = 0; i < s.length; i += 1) for (let j = i + 1; j < s.length; j += 1) if (overlap(s[i], s[j])) overlapped = true;
  }
  const rows = (f) => new Set(f.map((b) => Math.round(b.y))).size;
  return { slid, overlapped, rowsBefore: rows(before), rowsAfter: rows(after) };
}

const browser = await chromium.launch();
for (const name of ['dnd-action', 'sortable']) {
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
  await page.goto(`${base}/${name}/`);
  await page.waitForSelector('.pill');
  const before = await boxes(page);
  const frames1 = await drag(page, 'venit', 'Caesar');
  const mid = await boxes(page);
  const order1 = mid.map((b) => b.text);
  const frames2 = await drag(page, 'in Galliam', 'Romanus');
  const after = await boxes(page);
  const order2 = after.map((b) => b.text);
  const j1 = judge(before, frames1, mid, 'venit');
  const j2 = judge(mid, frames2, after, 'in Galliam');
  const chunkMovedAsOne = after.filter((b) => b.text === 'in Galliam').length === 1 && order2.indexOf('in Galliam') > order2.indexOf('Romanus') - 2;
  console.log(JSON.stringify({ name, order1, order2, drag1: j1, drag2: j2, chunkMovedAsOne }, null, 1));
  await page.close();
}
await browser.close();
