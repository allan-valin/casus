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

let translator = null;
/** html in `from` → html in `to`, with Bergamot (tags kept); the engine is loaded once, from our own site */
export async function translateHtml(html, from, to, { base = '/' } = {}) {
  if (!translator) {
    const { LatencyOptimisedTranslator } = await import('@browsermt/bergamot-translator/translator.js');
    translator = new LatencyOptimisedTranslator({ workerUrl: `${base}bergamot/translator-worker.js`, pivotLanguage: 'en' });
  }
  const res = await translator.translate({ from, to, text: html, html: true });
  return res.target.text;
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
          try {
            translated ??= await o.translate(original, o.src, o.ui);
            p.innerHTML = translated; showing = 'translated'; p.append(' ', button());
            o.onSay?.('ok');
          } catch (err) {
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
