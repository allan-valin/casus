/* File upload (Allan, 2026-10-18; Word and PDF 2026-10-19): a document read in the page as if pasted.
 * - .txt .md: UTF-8 as is; a byte-order mark dropped, line endings \n; NUL bytes mean it is not text
 * - .docx (Word), .odt (OpenDocument): the paragraphs, read from the zipped XML (JSZip, MIT)
 * - .epub: the chapters in spine order
 * - .pdf: the text of every page (Mozilla's pdf.js, Apache-2.0); a scanned PDF has no text to give
 * - .html .htm: the visible text; .srt .vtt: the lines, without numbers and timings
 * The libraries load only when such a file is picked. Anything else is refused, saying what is accepted. */
export const ACCEPT = '.txt,.md,.docx,.odt,.pdf,.epub,.html,.htm,.srt,.vtt,text/plain,text/markdown,text/html,application/pdf,'
  + 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/epub+zip';

function asText(file) {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {           // older engines (and jsdom) only have FileReader
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file, 'utf-8');
  });
}
async function asBytes(file) {
  if (typeof file.arrayBuffer === 'function') return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(file);
  });
}

const tidy = (s) => s.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n');
const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
const byLocal = (doc, name) => [...doc.getElementsByTagName('*')].filter((e) => e.localName === name);

/** the visible text of an HTML or XHTML page, one line per block */
function htmlText(source) {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  for (const e of doc.querySelectorAll('script, style, noscript, template')) e.remove();
  for (const e of doc.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, tr, blockquote, section, article, pre')) e.append('\n');
  return tidy(doc.body?.textContent ?? '');
}

async function zipOf(file) {
  const { default: JSZip } = await import('jszip');
  return JSZip.loadAsync(await asBytes(file));
}

async function docx(file) {
  const z = await zipOf(file);
  const doc = xml(await z.file('word/document.xml').async('string'));
  return tidy(byLocal(doc, 'p').map((p) => byLocal(p, 't').map((t) => t.textContent).join('')).join('\n'));
}

async function odt(file) {
  const z = await zipOf(file);
  const doc = xml(await z.file('content.xml').async('string'));
  return tidy(byLocal(doc, 'text').flatMap((body) => [...body.children]).filter((e) => e.localName === 'p' || e.localName === 'h' || e.localName === 'list')
    .map((e) => e.textContent).join('\n'));
}

async function epub(file) {
  const z = await zipOf(file);
  const container = xml(await z.file('META-INF/container.xml').async('string'));
  const opfPath = byLocal(container, 'rootfile')[0].getAttribute('full-path');
  const dir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const opf = xml(await z.file(opfPath).async('string'));
  const items = Object.fromEntries(byLocal(opf, 'item').map((i) => [i.getAttribute('id'), i.getAttribute('href')]));
  const parts = [];
  for (const ref of byLocal(opf, 'itemref')) {
    const f = z.file(dir + decodeURI(items[ref.getAttribute('idref')] ?? ''));
    if (f) parts.push(htmlText(await f.async('string')));
  }
  return tidy(parts.join('\n'));
}

async function pdf(file, loadPdf) {
  const lib = await loadPdf();
  const doc = await lib.getDocument({ data: await asBytes(file), isEvalSupported: false }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const content = await (await doc.getPage(n)).getTextContent();
    pages.push(pdfLines(content.items));
  }
  return tidy(pages.join('\n'));
}

/* a page's text by position: a new line wherever the text moves down (slides rarely flag line ends), a space between
 * pieces of one line that do not touch, so bullet points stay one per line (Allan, 2026-10-19) */
export function pdfLines(items) {
  let out = '';
  let last = null;
  for (const i of items) {
    const str = i.str ?? '';
    const [, , , , x = 0, y = 0] = i.transform ?? [];
    const h = Math.abs(i.height || i.transform?.[3] || 10) || 10;
    if (last) {
      if (Math.abs(y - last.y) > h * 0.5) out += '\n';
      else if (x - last.end > h * 0.15 && !/\s$/.test(out) && !/^\s/.test(str)) out += ' ';
    }
    out += str;
    if (i.hasEOL) { out += '\n'; last = null; continue; }
    if (str) last = { y, end: x + (i.width || 0) };
  }
  return out;
}

async function browserPdf() {
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  return lib;
}

function subtitles(source) {
  return tidy(source.replace(/^WEBVTT.*$/m, '').split('\n')
    .filter((l) => !/^\d+$/.test(l.trim()) && !/-->/.test(l) && !/^(NOTE|STYLE|REGION)\b/.test(l.trim()))
    .map((l) => l.replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '')).join('\n'));
}

export async function readTextFile(file, { loadPdf = browserPdf } = {}) {
  const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
  if (ext === 'docx') return docx(file);
  if (ext === 'odt') return odt(file);
  if (ext === 'epub') return epub(file);
  if (ext === 'pdf') {
    const text = await pdf(file, loadPdf);
    if (!text.trim()) throw new Error(`${file.name} has no text layer (a scanned PDF); copy the text another way`);
    return text;
  }
  if (ext === 'doc') throw new Error(`${file.name} is an old Word file: save it as .docx and try again`);
  if (['html', 'htm'].includes(ext)) return htmlText(await asText(file));
  if (['srt', 'vtt'].includes(ext)) return subtitles(await asText(file));
  if (['txt', 'md', ''].includes(ext)) {
    const text = await asText(file);
    if (text.includes('\u0000')) throw new Error(`${file.name} is not a text file`);
    return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  }
  throw new Error(`${file.name} is not a text file: Casus reads text, Word (.docx), OpenDocument (.odt), PDF, EPUB, HTML and subtitle files`);
}
