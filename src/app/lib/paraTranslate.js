/*
 * One paragraph of a Learn page translated on request, in the browser (Allan, 2026-10-28: pages from a French book
 * kept French paragraphs; Google Translate is proprietary, so Bergamot — Mozilla's offline engine, MPL-2.0, the one
 * inside Firefox). Its models pair English with 13 languages; other pairs go through English. No model exists for
 * Macedonian or Arabic, so those interfaces get no button. The engine and a model (~20–40 MB per direction) download
 * the first time and stay in the browser's cache.
 */
export const BERGAMOT = new Set(['en', 'bg', 'cs', 'de', 'es', 'et', 'fa', 'fr', 'it', 'nl', 'pl', 'pt', 'ru', 'uk']);

export const canTranslate = (from, to) => !!from && !!to && from !== to && BERGAMOT.has(from) && BERGAMOT.has(to);

// the commonest little words of the explanation languages a Learn page can be in
const STOP = {
  fr: 'le la les des du un une et est sont dans pour sur avec que qui ne pas au aux ce cette se plus par',
  en: 'the a an and is are of to in for with that this it on be by or not from as which',
  es: 'el la los las de del un una y es son en para con que no por se lo como más',
  de: 'der die das und ist sind ein eine zu mit von im den dem nicht auch für auf es',
  it: 'il lo la gli le di del un una e è sono in per con che non si',
  pt: 'o a os as de do da um uma e é são em para com que não no na por se',
};
const words = (t) => (t.toLowerCase().match(/\p{L}+/gu) ?? []);
const hits = (t, code) => { const s = new Set((STOP[code] ?? '').split(' ')); return words(t).filter((w) => s.has(w)).length; };

/** is this paragraph still in the source language (not yet in the interface's)? */
export function looksLike(text, from, to) {
  const a = hits(text, from), b = hits(text, to);
  return a >= 2 && a > b;
}

// the script each explanation language is written in; text in any other script is the taught language
const SCRIPT = { bg: 'Cyrillic', ru: 'Cyrillic', uk: 'Cyrillic', fa: 'Arabic' };
const foreign = (src) => new RegExp(`[^\\p{Script=${SCRIPT[src] ?? 'Latin'}}\\p{Script=Common}\\p{Script=Inherited}]+`, 'gu');

/** the taught language kept out of the engine's hands: every run in another script becomes an empty placeholder
 * element (Bergamot keeps tags but drops text it cannot read); restore(html) puts the runs back */
export function protect(html, src) {
  const runs = [];
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
  for (const node of texts) {
    const rx = foreign(src);
    if (!rx.test(node.data)) continue;
    const frag = document.createDocumentFragment();
    let at = 0;
    node.data.replace(foreign(src), (m, i) => {
      if (i > at) frag.append(node.data.slice(at, i));
      const ph = document.createElement('span');
      ph.setAttribute('data-ph', String(runs.length));
      runs.push(m); frag.append(ph); at = i + m.length; return m;
    });
    if (at < node.data.length) frag.append(node.data.slice(at));
    node.replaceWith(frag);
  }
  return {
    html: tpl.innerHTML,
    restore(out) {
      const t = document.createElement('template');
      t.innerHTML = out;
      for (const ph of t.content.querySelectorAll('span[data-ph]')) ph.replaceWith(runs[Number(ph.getAttribute('data-ph'))] ?? '');
      // the engine drops the space after an empty element: a kept word followed straight by a letter gets it back
      let html = t.innerHTML;
      for (const r of new Set(runs)) {
        const esc = r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`${esc}((?:</[a-z]+>)*)(?=\\p{L})`, 'gu'), `${r}$1 `);
      }
      return html;
    },
  };
}

let translator = null;
let queue = Promise.resolve();
let failed = null;       // rejects the running translation when the engine reports an error
export const BERGAMOT_CACHE = 'casus-bergamot';
const listeners = new Set();
const flow = { done: 0, total: 0 };
/** follow the model download: fn(doneBytes, totalBytes); returns the unsubscribe */
export function onBergamotProgress(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const tell = () => listeners.forEach((fn) => fn(flow.done, flow.total));

/* Allan 2026-10-28: minutes of "downloading" with no feedback; nothing kept between visits; not removable. The
 * library's own download had a 60 s timeout (a ~25 MB model on a slow line never finished) and kept nothing. Our
 * download: no timeout, bytes reported as they come, models kept in a named cache that Downloads lists and removes. */
async function cachedBacking() {
  const { TranslatorBacking } = await import('@browsermt/bergamot-translator/translator.js');
  return class CachedBacking extends TranslatorBacking {
    async fetch(url, checksum) {
      const cache = await caches.open(BERGAMOT_CACHE).catch(() => null);
      const hit = await cache?.match(url);
      if (hit) return hit.arrayBuffer();
      const res = await fetch(url, { credentials: 'omit', ...(checksum ? { integrity: `sha256-${this.hexToBase64(checksum)}` } : {}) });
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      const size = Number(res.headers.get('content-length')) || 0;
      flow.total += size; tell();
      const reader = res.body.getReader();
      const chunks = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); flow.done += value.length; tell();
      }
      const body = await new Blob(chunks).arrayBuffer();
      try { await navigator.storage?.persist?.(); await cache?.put(url, new Response(body)); } catch { /* not kept */ }
      return body;
    }
  };
}

/** bytes of Bergamot models kept on this device (0 when none) */
export async function bergamotStored() {
  try {
    const cache = await caches.open(BERGAMOT_CACHE);
    let n = 0;
    for (const req of await cache.keys()) n += (await (await cache.match(req.url)).arrayBuffer()).byteLength;
    return n;
  } catch { return 0; }
}
/** remove the kept models; the next translation downloads again */
export async function removeBergamot() { translator = null; flow.done = 0; flow.total = 0; return caches.delete(BERGAMOT_CACHE); }

/** html in `from` → html in `to`, with Bergamot (tags kept); the engine is loaded once, from our own site. One
 * translation at a time: the library cancels a pending one when the next arrives (a second ⇄ click failed the first) */
export function translateHtml(html, from, to, { base = '/' } = {}) {
  const run = queue.then(async () => {
    if (!translator) {
      const { LatencyOptimisedTranslator } = await import('@browsermt/bergamot-translator/translator.js');
      const Backing = await cachedBacking();
      // a worker that fails to start reports only to onerror, and the translation then waits forever: fail it instead
      const opts = { workerUrl: `${base}bergamot/translator-worker.js`, pivotLanguage: 'en', downloadTimeout: 0,
        onerror: (err) => { console.error('Bergamot:', err); failed?.(err); } };
      translator = new LatencyOptimisedTranslator(opts, new Backing(opts));
    }
    const kept = protect(html, from);
    const broke = new Promise((_, reject) => { failed = (err) => { translator = null; reject(err instanceof Error ? err : new Error(String(err))); }; });
    try {
      const res = await Promise.race([translator.translate({ from, to, text: kept.html, html: true }), broke]);
      return kept.restore(res.target.text);
    } finally { failed = null; }
  });
  queue = run.catch(() => {});
  return run;
}

/** Svelte action: a small button after each paragraph still in the source language; it swaps in a translation
 * and back. opts: { src, ui, translate(html, from, to), labels: { button, busy, original, failed }, onSay? } */
export function paraButtons(node, opts) {
  function apply(o) {
    node.querySelectorAll('button.para-tr').forEach((b) => b.remove());
    if (!o || !canTranslate(o.src, o.ui)) return;
    for (const p of node.querySelectorAll('p, li')) {
      if (p.closest('table') || p.querySelector('p, li')) continue;
      if (!looksLike(p.textContent ?? '', o.src, o.ui)) continue;
      const original = p.innerHTML;
      let translated = null, showing = 'original';
      const button = () => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'para-tr';
        b.textContent = showing === 'original' ? `⇄ ${o.labels.button}` : `↺ ${o.labels.original}`;
        b.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (showing === 'translated') { p.innerHTML = original; showing = 'original'; p.append(' ', button()); return; }
          b.disabled = true; b.textContent = `⇄ ${o.labels.busy}`;
          const mb = (x) => (x / 1e6).toFixed(1);
          const off = onBergamotProgress((done, total) => { if (total) b.textContent = `⇄ ${o.labels.busy} ${mb(done)} / ${mb(total)} MB`; });
          try {
            translated ??= await o.translate(original, o.src, o.ui);
            off();
            p.innerHTML = translated; showing = 'translated'; p.append(' ', button());
            o.onSay?.('ok');
          } catch (err) {
            off();
            b.disabled = false; b.textContent = `⇄ ${o.labels.failed}`; b.title = String(err?.message ?? err);
            o.onSay?.('err', String(err?.message ?? err));
          }
        });
        return b;
      };
      p.append(' ', button());
    }
  }
  queueMicrotask(() => apply(opts));
  return { update(next) { opts = next; queueMicrotask(() => apply(next)); } };
}
