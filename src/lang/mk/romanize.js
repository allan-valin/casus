/* Macedonian → Latin letters as Wiktionary writes them (ISO 9-based: ѓ ǵ, ќ ḱ, ѕ dz, џ dž, љ lj, њ nj, ж ž, ш š, ч č). */
const MAP = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'ǵ', е: 'e', ж: 'ž', з: 'z', ѕ: 'dz', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm',
  н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'ḱ', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š', ѐ: 'è', ѝ: 'ì' };
export function romanizeMk(text) {
  let out = '';
  for (const ch of text.normalize('NFC')) {
    const lower = ch.toLowerCase();
    const r = MAP[lower];
    if (r === undefined) { out += ch; continue; }
    out += ch !== lower ? r[0].toUpperCase() + r.slice(1) : r;
  }
  return out;
}
