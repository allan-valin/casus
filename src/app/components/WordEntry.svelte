<script>
  /** A word's dictionary entry — lemma, gloss, readings, forms table, Wiktionary links — shared by the pronunciation
   * trainer and the Learn pages (Allan, 2026-10-20: words open their entry, as in the Reader).
   * lookup(word) -> analyses; loadInfo() -> { lemmas, ipa, glosses } (loaded once by the caller, cached there). */
  import { t, ui } from '../lib/i18n.svelte.js';
  import Speaker from './Speaker.svelte';
  import Paradigm from './Paradigm.svelte';
  import { frontDecode } from '../lib/paradigm.js';
  import { describeAnalysis } from '../lib/colors.js';
  import { wiktionaryUrl } from '../lib/entry.js';
  import { entriesFor } from '../lib/pronounce.js';

  let { word, lang, lookup, loadInfo, voice = null, loadParadigm = null, onclose = null } = $props();

  let entries = $state(null), info = $state(null);
  $effect(() => {
    const w = word;
    entries = null;
    (async () => {
      info ??= await loadInfo().catch(() => ({}));
      const list = entriesFor(await lookup(w.toLowerCase()).catch(() => []), info?.lemmas);
      if (w === word) entries = list;
    })();
  });
  const wikt = (w, l) => wiktionaryUrl(w, lang.wiktionary ?? 'Latin', l);
</script>

<div class="entry-panel">
  <h4 lang={lang.bcp47}>{word}{#if onclose} <button class="close-entry" onclick={onclose} aria-label={t('speak.close')}>✕</button>{/if}</h4>
  {#if !entries}<p class="note">{t('dict.loading')}</p>
  {:else if !entries.length}<p class="note">{t('dict.none')} <a href={wikt(word, ui.lang === 'pt' ? 'pt' : 'en')} target="_blank" rel="noopener">Wiktionary ↗</a></p>
  {:else}{#each entries as e (e.id)}
    <div class="entry">
      <div class="form" lang={lang.bcp47}><b>{e.lemma.dict_form ?? e.lemma.headword}</b> <small>{e.lemma.pos ?? ''}</small>
        {#if info?.ipa?.[e.id]?.length}<span class="ipa">{info.ipa[e.id][0].ipa}</span>{/if}{#if voice}<Speaker text={e.lemma.headword} {voice} />{/if}
        <a href={wikt(e.lemma.headword, 'en')} target="_blank" rel="noopener">Wiktionary ↗</a>
        {#if ui.lang === 'pt'}<a href={wikt(e.lemma.headword, 'pt')} target="_blank" rel="noopener">Wikcionário ↗</a>{/if}</div>
      {#if info?.glosses?.[e.id]}<div class="gloss">{info.glosses[e.id]}</div>{/if}
      <div class="note">{t('speak.entry.readings')}: {[...new Set(e.readings.map(describeAnalysis))].join(' · ')}</div>
      {#if loadParadigm}{#await loadParadigm(e.id).then((r) => (r ? frontDecode(r) : null)) then rows}{#if rows?.length}<Paradigm {rows} lemma={e.id} {lang} form={word.toLowerCase()} readings={e.readings} />{/if}{/await}{/if}
    </div>
  {/each}{/if}
</div>

<style>
  .entry-panel { border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; margin: 8px 0; background: var(--panel); }
  .entry-panel h4 { margin: 0 0 6px; display: flex; justify-content: space-between; }
  .entry { border-top: 1px dashed var(--line); padding: 6px 0; }
  .entry .ipa { margin-inline-start: 6px; }
  .entry a { margin-inline-start: 6px; font-size: .85em; }
  .gloss { margin: 2px 0; }
  .note { color: var(--ink-2); font-size: .9em; margin: 2px 0; }
  .close-entry { min-height: 24px; padding: 0 6px; }
</style>
