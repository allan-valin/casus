// Ancient Greek for Everyone (Major & Laughy, Pressbooks, CC BY 4.0 "except where otherwise noted"): the book offers
// no download and its site sits behind a Cloudflare check plain HTTP clients fail, so a headless browser reads the
// table of contents and each chapter page, one every few seconds, into vendor/agfe/html/. Usage: node tools/fetch_agfe.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
const BASE = 'https://pressbooks.pub/ancientgreek/';
const OUT = new URL('../vendor/agfe/html/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const get = async (url) => {
  let h = '';
  for (let i = 0; i < 4; i++) {   // a fresh browser context each try: the check passes a new visitor more readily
    const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3000 + 5000 * i);
    h = await p.content();
    await ctx.close();
    if (!/Attention Required/.test(h)) return h;
  }
  return h;
};
const toc = await get(BASE + 'table-of-contents/');
writeFileSync(OUT + 'toc.html', toc);
const links = [...new Set([...toc.matchAll(/href="(https:\/\/pressbooks\.pub\/ancientgreek\/(?:chapter|front-matter|back-matter|part)\/[^"#]+)"/g)].map((m) => m[1]))];
console.log(links.length, 'pages');
writeFileSync(OUT + 'pages.txt', links.join('\n'));
for (const url of links) {
  const slug = url.replace(BASE, '').replace(/\/$/, '').replace(/\//g, '__');
  if (existsSync(OUT + slug + '.html')) continue;
  const h = await get(url);
  if (/Attention Required/.test(h)) { console.log('blocked at', url); break; }
  writeFileSync(OUT + slug + '.html', h);
  console.log(slug, h.length);
}
await b.close();
