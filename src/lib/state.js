import { segment } from './segment.js';
import { tokenize } from './tokenize.js';
import { normalizeForm } from './normalize.js';
import { runCascade } from './disambiguate.js';

/*
 * Single source of truth for the parser side: text, sentences, selection and
 * pins. Takes an already-built lexicon, so it never fetches; serialises to a
 * plain object (`toJSON`) — persistence itself belongs to the UI plan.
 */
export function createState({ text, lexicon, saved = null }) {
  const sentences = segment(text);
  let tokensBySentence = [];
  let analysesByKey = new Map();
  let selectedIndex = saved?.selected ?? 0;
  const pins = new Map((saved?.pins ?? []).map((p) => [pinKey(p.sentence, p.tokenIndex), p.analysis]));
  let cache = null;

  async function load() {
    const split = sentences.map((s) => tokenize(s.text));
    const keys = new Set();
    for (const tokens of split) {
      for (const [i, t] of tokens.entries()) {
        if (t.kind !== 'word') continue;
        keys.add(t.key);
        if (t.enclitic) keys.add(wholeKey(t, tokens[i + 1]));
      }
    }
    analysesByKey = await lexicon.lookupAll([...keys]);
    tokensBySentence = split.map((tokens) => rejoinAttested(tokens, analysesByKey));
    cache = null;
  }

  function blocks() {
    if (!cache) {
      const sentencePins = new Map();
      for (const [key, analysis] of pins) {
        const [sentence, tokenIndex] = key.split(':').map(Number);
        if (sentence === selectedIndex) sentencePins.set(tokenIndex, analysis);
      }
      cache = runCascade(tokensBySentence[selectedIndex] ?? [], analysesByKey, { pins: sentencePins });
    }
    return cache;
  }

  return {
    load,
    sentences: () => sentences,
    selected: () => selectedIndex,
    select(i) { selectedIndex = i; cache = null; },
    blocks,
    pin(tokenIndex, analysis) { pins.set(pinKey(selectedIndex, tokenIndex), analysis); cache = null; },
    unpin(tokenIndex) { pins.delete(pinKey(selectedIndex, tokenIndex)); cache = null; },
    toJSON: () => ({
      text,
      selected: selectedIndex,
      pins: [...pins].map(([key, analysis]) => {
        const [sentence, tokenIndex] = key.split(':').map(Number);
        return { sentence, tokenIndex, analysis };
      }),
    }),
  };
}

function pinKey(sentence, tokenIndex) {
  return `${sentence}:${tokenIndex}`;
}

function wholeKey(host, enclitic) {
  return normalizeForm(host.surface + enclitic.surface);
}

/**
 * The tokenizer splits every -que/-ue/-ne it can; here the lexicon has the
 * last word: a host whose whole form is attested (legione, ratione) is put
 * back together, and only an unattested whole (populusque) stays split.
 */
function rejoinAttested(tokens, analysesByKey) {
  const out = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    const next = tokens[i + 1];
    if (t.enclitic && next && (analysesByKey.get(wholeKey(t, next)) ?? []).length > 0) {
      const surface = t.surface + next.surface;
      out.push({ ...t, surface, key: wholeKey(t, next), enclitic: null, end: next.end });
      i += 1;
    } else {
      out.push({ ...t });
    }
  }
  return out.map((t, index) => ({ ...t, index }));
}
