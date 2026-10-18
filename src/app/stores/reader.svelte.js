import { createState } from '../../lib/state.js';
import { initialOrder, move as moveIn, moveItem as moveItemIn, autoSort as autoSortIn, arrangeBy } from '../lib/order.js';
import { loadLemmas, loadGlosses } from '../lib/fetchers.js';
import { getLanguage } from '../../lang/registry.js';

const DEFAULT_LAYERS = { nominal: true, verb: true, function: true, classes: false };

/**
 * The single source of truth for the page (spec §5.2 state.js + the UI state).
 * Parse decisions come from createState; this adds layers, era, gloss language,
 * per-sentence arrangement and unglued chunks, and serialises all of it.
 */
export function createReader({ lexicon, text, saved = null, onaction = () => {}, lang = getLanguage('la') }) {
  const state = createState({ text, lexicon, lang, saved });
  let version = $state(0);                       // bumped after every state.* call so getters re-read
  let loaded = $state(false);
  const layers = $state({ ...DEFAULT_LAYERS, ...(saved?.layers ?? {}) });
  let era = $state(saved?.era ?? 'classical');
  let glossLang = $state(saved?.glossLang ?? 'en');
  const orders = $state(Object.fromEntries(Object.entries(saved?.order ?? {}).map(([k, v]) => [Number(k), [...v]])));
  const unglued = $state(new Set(saved?.unglued ?? []));
  let lexiconExtras = $state({ lemmas: null, glosses: { en: null, pt: null } });

  function touch() { version += 1; }

  function currentBlocks() {
    void version;
    return loaded ? state.blocks() : [];
  }

  /** The cascade for sentence i, with its pins, without touching the selection. */
  function blocksFor(i) {
    void version;
    if (!loaded) return [];
    const keep = state.selected();
    if (i === keep) return state.blocks();
    state.select(i);
    const out = state.blocks();
    state.select(keep);
    return out;
  }

  function orderFor(i, blocks) {
    const stored = orders[i];
    const valid = stored && stored.length === blocks.length && stored.every((n) => blocks.some((b) => b.token.index === n));
    return valid ? stored : initialOrder(blocks);
  }

  /** A saved order is applied only when it names exactly this sentence's tokens. */
  function currentOrder() {
    void version;
    return orderFor(state.selected(), currentBlocks());
  }

  return {
    get text() { return text; },
    get sentences() { void version; return state.sentences(); },
    get selected() { void version; return state.selected(); },
    get blocks() { return currentBlocks(); },
    get order() { return currentOrder(); },
    blocksOf: (i) => blocksFor(i),
    orderOf: (i) => orderFor(i, blocksFor(i)),
    layers,
    get era() { return era; },
    set era(v) { era = v; },
    get glossLang() { return glossLang; },
    set glossLang(v) { glossLang = v; },
    get unglued() { void version; return unglued; },
    get lexiconExtras() { return lexiconExtras; },
    set lexiconExtras(v) { lexiconExtras = v; },

    async load() { await state.load(); loaded = true; touch(); },
    async loadExtras(fetchImpl, base = '/data') {
      const [lemmas, en, pt] = await Promise.all([
        loadLemmas(fetchImpl, base), loadGlosses(fetchImpl, base, 'en'), loadGlosses(fetchImpl, base, 'pt'),
      ]);
      lexiconExtras = { lemmas, glosses: { en, pt } };
    },
    select(i) { state.select(i); touch(); onaction('select', { n: i + 1 }); },
    pin(tokenIndex, analysis) { state.pin(tokenIndex, analysis); touch(); onaction('pin', { tokenIndex, analysis }); },
    unpin(tokenIndex) { state.unpin(tokenIndex); touch(); onaction('unpin', { tokenIndex }); },
    move(from, to) { orders[state.selected()] = moveIn(currentOrder(), from, to); touch(); onaction('move', { indices: [from] }); },
    moveItem(indices, to) { orders[state.selected()] = moveItemIn(currentOrder(), indices, to); touch(); onaction('move', { indices }); },
    autoSort() { orders[state.selected()] = autoSortIn(currentOrder(), currentBlocks()); touch(); onaction('autosort'); },
    arrange(pattern) { orders[state.selected()] = arrangeBy(currentOrder(), currentBlocks(), pattern); touch(); onaction('arrange', { pattern }); },
    restoreOrder() { delete orders[state.selected()]; touch(); onaction('restore'); },
    toggleGlue(prepIndex) { if (unglued.has(prepIndex)) unglued.delete(prepIndex); else unglued.add(prepIndex); touch(); onaction('glue', { tokenIndex: prepIndex }); },

    toJSON() {
      void version;   // read the counter so an effect over toJSON() re-runs after every change
      const base = state.toJSON();
      return {
        ...base,
        layers: { ...layers },
        era,
        glossLang,
        order: Object.fromEntries(Object.entries(orders).map(([k, v]) => [k, [...v]])),
        unglued: [...unglued],
      };
    },
  };
}
