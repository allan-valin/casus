// Fetch an Open Book Publishers book's PDF (CC BY) for Learn: its site answers scripts with a browser check, so a
// headless browser opens the book page first and then asks for the PDF; `pdftotext -layout` makes the text that
// tools/learn_pdfbook.py reads. Usage: node tools/fetch_obp.mjs obp.0264 peek  →  vendor/peek/peek.pdf, peek.txt
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [book, folder] = process.argv.slice(2);
const out = join(fileURLToPath(new URL('..', import.meta.url)), 'vendor', folder);
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Casus' });
const p = await ctx.newPage();
await p.goto(`https://www.openbookpublishers.com/books/10.11647/${book}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(6000);
const r = await ctx.request.get(`https://books.openbookpublishers.com/10.11647/${book}.pdf`, { timeout: 180000 });
if (!(r.headers()['content-type'] || '').includes('pdf')) throw new Error(`no PDF for ${book}: ${r.status()}`);
writeFileSync(join(out, `${folder}.pdf`), await r.body());
await b.close();
execFileSync('pdftotext', ['-layout', join(out, `${folder}.pdf`), join(out, `${folder}.txt`)]);
console.log(`${book} → vendor/${folder}/${folder}.txt`);
