/* Russian → Latin letters as Wiktionary writes them (ž, x, c, č, š, šč, ʺ, ʹ; е je after a vowel or at the start),
 * the stress mark carried onto the Latin vowel (кни́га kníga). */
const MAP = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'ž', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'c', ч: 'č', ш: 'š', щ: 'šč', ъ: 'ʺ', ы: 'y', ь: 'ʹ', э: 'e', ю: 'ju', я: 'ja', ё: 'jo' };
const VOWELS = 'аеёиоуыэюя';
export function romanizeRu(text) {
  let out = '';
  // NFD for the stress mark, with ё and й put back together (their marks belong to the letter)
  const chars = [...text.normalize('NFD').replace(/\u0435\u0308/g, '\u0451').replace(/\u0415\u0308/g, '\u0401').replace(/\u0438\u0306/g, '\u0439').replace(/\u0418\u0306/g, '\u0419')];
  let prev = ' ';
  for (const ch of chars) {
    if (ch === '́' || ch === '̀') { out = out.normalize('NFD').replace(/([aeiouy])([^aeiouy]*)$/u, `$1${ch}$2`).normalize('NFC'); continue; }
    const lower = ch.toLowerCase();
    let r;
    if (lower === 'е') r = (/[\s\p{P}]/u.test(prev) || VOWELS.includes(prev) || prev === 'ъ' || prev === 'ь') ? 'je' : 'e';
    else r = MAP[lower] ?? ch;
    out += ch !== lower ? r[0].toUpperCase() + r.slice(1) : r;
    prev = lower;
  }
  return out.normalize('NFC');
}
