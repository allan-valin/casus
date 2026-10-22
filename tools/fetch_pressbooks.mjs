// Fetch an openly licensed Pressbooks textbook for Learn (its hosts answer scripts with a challenge, so a headless
// browser reads the pages): the table of contents, then each chapter, one every 1.5 s, into vendor/<folder>/
// (index.html, chapters.txt, <slug>.html). Usage: node tools/fetch_pressbooks.mjs <book url> <folder>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [url, folder] = process.argv.slice(2);
const out = join(fileURLToPath(new URL('..', import.meta.url)), 'vendor', folder);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Casus' });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(3000);
const toc = await p.content();
writeFileSync(join(out, 'index.html'), toc);
const base = new URL(url);
const slugs = [...new Set([...toc.matchAll(/href="([^"]*\/chapter\/([^/"#]+)\/)"/g)].filter((m) => new URL(m[1], base).pathname.startsWith(base.pathname)).map((m) => m[2]))];
writeFileSync(join(out, 'chapters.txt'), slugs.map((s) => new URL(`chapter/${s}/`, base).href).join('\n') + '\n');
let got = 0;
for (const s of slugs) {
  const f = join(out, `${s}.html`);
  if (existsSync(f) && statSync(f).size > 2000) continue;
  try {
    await p.goto(new URL(`chapter/${s}/`, base).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(800);
    writeFileSync(f, await p.content()); got += 1;
  } catch (e) { console.log('skip', s, e.message.slice(0, 60)); }
  await new Promise((r) => setTimeout(r, 1500));
}
console.log(folder, slugs.length, 'chapters,', got, 'fetched');
await b.close();
