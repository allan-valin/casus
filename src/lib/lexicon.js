/*
 * Shard loading and form -> analyses lookup. Pure: `fetchShard(name)` is
 * injected, so this module never touches fetch, window or document.
 *
 * The shard rule and the analysis codes mirror tools/casus_build/shard.py.
 * A mismatch on either side is silent total lookup failure, so change both.
 */

const POS = { n: 'noun', a: 'adj', v: 'verb', p: 'vpar', u: 'supine', o: 'pron', m: 'num', d: 'adv', r: 'prep', c: 'conj', j: 'interj' };
const CASE = { n: 'nom', v: 'voc', g: 'gen', l: 'loc', d: 'dat', b: 'abl', a: 'acc', x: 'x' };
const NUMBER = { s: 'sg', p: 'pl', x: 'x' };
const GENDER = { m: 'm', f: 'f', n: 'n', c: 'c', x: 'x' };
const DEGREE = { p: 'pos', c: 'comp', s: 'super', x: 'x' };
const TENSE = { p: 'pres', i: 'impf', f: 'fut', r: 'perf', l: 'plup', u: 'futp', x: 'x' };
const MOOD = { i: 'ind', s: 'sub', m: 'imp', n: 'inf', p: 'ppl', x: 'x' };
const VOICE = { a: 'act', p: 'pass', x: 'x' };
const CONJ = { 1: '1', 2: '2', 3: '3', i: '3-io', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', x: null };
const PERSON = { 0: '0', 1: '1', 2: '2', 3: '3' };

const LAYOUT = {
  noun: [['case', CASE], ['number', NUMBER], ['gender', GENDER]],
  adj: [['case', CASE], ['number', NUMBER], ['gender', GENDER], ['degree', DEGREE]],
  pron: [['case', CASE], ['number', NUMBER], ['gender', GENDER]],
  num: [['case', CASE], ['number', NUMBER], ['gender', GENDER]],
  supine: [['case', CASE], ['number', NUMBER], ['gender', GENDER]],
  verb: [['person', PERSON], ['number', NUMBER], ['tense', TENSE], ['mood', MOOD], ['voice', VOICE], ['conj', CONJ]],
  vpar: [['case', CASE], ['number', NUMBER], ['gender', GENDER], ['tense', TENSE], ['voice', VOICE], ['conj', CONJ]],
  adv: [['degree', DEGREE]],
  prep: [['governs', CASE]],
  conj: [],
  interj: [],
};

/** Latin's format-2 code tables, also carried by the Latin inventory (src/lang/la/inventory.js). */
export const LATIN_CODES = { POS, LAYOUT };

/** One format-2 code (see docs/DATA.md) back into a spelled-out analysis; `codes` = a language's tables. */
export function decodeAnalysis(code, lemma, codes = LATIN_CODES) {
  const pos = codes.POS[code[0]];
  const out = { lemma, pos };
  codes.LAYOUT[pos].forEach(([name, table], i) => {
    out[name] = table[code[i + 1]];
  });
  return out;
}

/**
 * Which shard holds a form. With a set of shard names: the longest name that
 * prefixes the form (null when none does). Without: the plain two-letter rule.
 */
export function shardKey(form, names = null) {
  if (!names) return form.slice(0, 2);
  for (let n = Math.min(form.length, 5); n > 0; n -= 1) {
    const candidate = form.slice(0, n);
    if (names.has(candidate)) return candidate;
  }
  return null;
}

function toAnalyses(entry, codes = LATIN_CODES) {
  if (!entry) return [];
  const out = [];
  for (const row of entry) {
    if (Array.isArray(row)) {
      const lemma = String(row[0]);
      // Japanese: a "~reading" after the lemma is the kana reading of this spelling (食べました: たべました)
      const reading = typeof row[1] === 'string' && row[1].startsWith('~') ? row[1].slice(1) : null;
      for (let i = reading ? 2 : 1; i < row.length; i += 1) {
        const a = decodeAnalysis(row[i], lemma, codes);
        out.push(reading ? { ...a, reading } : a);
      }
    } else {
      out.push(row);
    }
  }
  return out;
}

// Greek mark signatures, by base-letter position (NFD): breathings ̓ ̔, accents ́ ̀ ͂
function marks(word) {
  const out = [];
  let i = -1;
  for (const ch of word.normalize('NFD')) {
    if (/\p{M}/u.test(ch)) out.push([i, ch]); else i += 1;
  }
  return out;
}
function breathings(word) {
  return marks(word).filter(([, m]) => m === '\u0313' || m === '\u0314').map(([p, m]) => `${p}${m}`).join(',');
}
function accentPositions(word) {
  return marks(word).filter(([, m]) => m === '\u0301' || m === '\u0300' || m === '\u0342').map(([p]) => p);
}
function dropLastAccent(word) {
  const d = word.normalize('NFD');
  const at = Math.max(d.lastIndexOf('\u0301'), d.lastIndexOf('\u0300'));
  return (d.slice(0, at) + d.slice(at + 1)).normalize('NFC');
}

/**
 * createLexicon({ fetchShard, manifest }) -> { lookup, lookupAll, loadedShards }.
 * Shard promises are cached, so concurrent lookups share one fetch; a failed
 * fetch resolves to an empty shard and degrades one word, never the sentence.
 */
export function createLexicon({ fetchShard, fetchFile = null, manifest = null, codes = LATIN_CODES, script = null }) {
  const files = new Map();
  /** another data file of the language (expressions.json…), fetched once; null when absent */
  function file(name) {
    if (!fetchFile) return Promise.resolve(null);
    if (!files.has(name)) files.set(name, Promise.resolve().then(() => fetchFile(name)).catch(() => null));
    return files.get(name);
  }
  const names = manifest?.shards ? new Set(Object.keys(manifest.shards)) : null;
  const cache = new Map();
  // Greek: shards are named by the form without diacritics, and unaccented input is matched against
  // every accented key of its shard (languages plan Task 11; no second key in the data)
  const prefixOf = script?.prefixOf ?? ((f) => f);
  const byStripped = new Map();
  function strippedIndex(name, data) {
    if (!byStripped.has(name)) {
      const m = new Map();
      for (const k of Object.keys(data)) { const s = script.strip(k); if (!m.has(s)) m.set(s, []); m.get(s).push(k); }
      byStripped.set(name, m);
    }
    return byStripped.get(name);
  }
  let warned = false;

  function shard(name) {
    if (!cache.has(name)) {
      cache.set(name, Promise.resolve()
        .then(() => fetchShard(name))
        .then((data) => data ?? {})
        .catch(() => ({})));
    }
    return cache.get(name);
  }

  async function lookup(key) {
    if (names === null && !warned) {
      warned = true;
      console.warn('createLexicon: no manifest given — using the two-letter shard rule, which misses every form in format-2 data');
    }
    const name = shardKey(prefixOf(key), names);
    if (name === null) return [];
    const data = await shard(name);
    const exact = toAnalyses(data[key], codes);
    if (!script?.strip) return exact;
    const marked = script.hasMarks(key);
    if (exact.length && marked) return exact;
    // a host followed by an enclitic carries a second accent (ἄνθρωπός τις): drop the last one
    if (!exact.length && accentPositions(key).length >= 2) {
      const single = dropLastAccent(key);
      if (data[single]) return toAnalyses(data[single], codes).map((a) => ({ ...a, marked: single }));
    }
    // otherwise every spelling of the shard with the same letters, kept when it shares the input's
    // breathings and, if the input has accents (a monotonic keyboard, a missing enclitic accent), its
    // accent positions — else all of them (review finding: real input is partly marked)
    let keys = (strippedIndex(name, data).get(script.strip(key)) ?? []).filter((k) => k !== key);
    // a script may narrow the matches further (Arabic: a hamza the text writes must be there)
    if (script.keeps) keys = keys.filter((k) => script.keeps(key, k));
    const breath = breathings(key);
    if (breath) keys = keys.filter((k) => breathings(k) === breath);
    const accents = accentPositions(key).join(',');
    if (accents) {
      const same = keys.filter((k) => accentPositions(k).join(',') === accents);
      if (same.length) keys = same;
    }
    const supplied = keys.flatMap((k) => toAnalyses(data[k], codes).map((a) => ({ ...a, marked: k })));
    return [...exact, ...supplied];
  }

  async function lookupAll(keys) {
    const unique = [...new Set(keys)];
    const results = await Promise.all(unique.map((k) => lookup(k)));
    return new Map(unique.map((k, i) => [k, results[i]]));
  }

  return {
    lookup,
    lookupAll,
    file,
    // the shard a form lives in: files that mirror the form shards (ipa-forms/<name>.json) are fetched by it
    shardName: (key) => shardKey(prefixOf(key), names),
    loadedShards: () => [...cache.keys()],
  };
}
