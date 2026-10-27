/* Learn's full-text search (Allan, 2026-10-27: "hallo" found nothing — only titles were searched). The build reads
 * every lesson once and writes a word index, data/<code>/learn-search.json: { ids: [lesson ids in Learn's order],
 * w: { word: [positions in ids] } }. The page fetches it on the first search. */
const SKIP = new Set(['id', 'source', 'credit', 'furi', 'tok', 'match', 'pool', 'mt', 'more']);
const WORD = /[\p{L}\p{M}\p{N}]+/gu;

function strings(o, out) {
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) for (const v of o) strings(v, out);
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!SKIP.has(k)) strings(v, out);
  return out;
}

const plain = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').toLowerCase();

export function buildSearchIndex(learn, readLesson) {
  const ids = (learn?.levels ?? []).flatMap((l) => l.topics.flatMap((t) => t.lessons.map((e) => e.id)));
  const w = Object.create(null);          // no inherited keys: "constructor" is a word like any other
  ids.forEach((id, k) => {
    const lesson = readLesson(id);
    if (!lesson) return;
    for (const word of new Set(plain(strings(lesson, []).join(' ')).match(WORD) ?? [])) {
      if (word.length < 2 && !/[^\p{Script=Latin}\p{N}]/u.test(word)) continue;   // a single Latin letter says nothing
      (w[word] ??= []).push(k);
    }
  });
  return { ids, w };
}

/** lesson ids holding every word of the query, in Learn's order; the last word may be unfinished (typed so far) */
export function searchIndex(index, query) {
  const words = query.toLowerCase().match(WORD) ?? [];
  if (!index || !words.length) return [];
  let hits = null;
  words.forEach((word, n) => {
    const keys = n === words.length - 1 ? Object.keys(index.w).filter((k) => k.startsWith(word)) : [word];
    const here = new Set(keys.flatMap((k) => (Object.hasOwn(index.w, k) ? index.w[k] : [])));
    hits = hits ? new Set([...hits].filter((k) => here.has(k))) : here;
  });
  return [...hits].sort((a, b) => a - b).map((k) => index.ids[k]);
}
