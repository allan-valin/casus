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

/** One format-2 code (see docs/DATA.md) back into a spelled-out analysis. */
export function decodeAnalysis(code, lemma) {
  const pos = POS[code[0]];
  const out = { lemma, pos };
  LAYOUT[pos].forEach(([name, table], i) => {
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

function toAnalyses(entry) {
  if (!entry) return [];
  const out = [];
  for (const row of entry) {
    if (Array.isArray(row)) {
      const lemma = String(row[0]);
      for (let i = 1; i < row.length; i += 1) out.push(decodeAnalysis(row[i], lemma));
    } else {
      out.push(row);
    }
  }
  return out;
}

/**
 * createLexicon({ fetchShard, manifest }) -> { lookup, lookupAll, loadedShards }.
 * Shard promises are cached, so concurrent lookups share one fetch; a failed
 * fetch resolves to an empty shard and degrades one word, never the sentence.
 */
export function createLexicon({ fetchShard, manifest = null }) {
  const names = manifest?.shards ? new Set(Object.keys(manifest.shards)) : null;
  const cache = new Map();

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
    const name = shardKey(key, names);
    if (name === null) return [];
    const data = await shard(name);
    return toAnalyses(data[key]);
  }

  async function lookupAll(keys) {
    const unique = [...new Set(keys)];
    const results = await Promise.all(unique.map((k) => lookup(k)));
    return new Map(unique.map((k, i) => [k, results[i]]));
  }

  return {
    lookup,
    lookupAll,
    loadedShards: () => [...cache.keys()],
  };
}
