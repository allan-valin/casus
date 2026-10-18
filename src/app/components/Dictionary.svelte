<script>
  import Candidates from './Candidates.svelte';
  import Overlay from './Overlay.svelte';
  import { eraStatus, warning, AGE_LABEL } from '../lib/era.js';
  import { pickIpa, wiktionaryUrl } from '../lib/entry.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  let { block, reader, onclose } = $props();

  const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' };
  const lemmaIds = $derived([...new Set(block.candidates.map((c) => String(c.analysis.lemma)))]);
  const extras = $derived(reader.lexiconExtras);

  function classLine(r) {
    const bits = [];
    if (r.pos === 'verb') bits.push(r.conj ? t('dict.conjugation', { n: r.conj }) : t('dict.verb'));
    else if (r.decl) bits.push(t('dict.declension', { n: ui.lang === 'pt' ? `${r.decl}ª` : (ORDINAL[r.decl] ?? r.decl) }));
    else bits.push(r.pos);
    if (r.gender) bits.push(r.gender);
    if (r.kind && r.kind !== 'x') bits.push(r.kind);
    return bits.join(' · ');
  }

  /* Allan, 2026-10-18: never swap dictionaries silently. Under the headword, one button per
   * dictionary that has the word; the preferred language opens first when it has it, else the
   * first that does; when none has it, say so. Form, class, age and frequency are Whitaker's
   * lexicon either way. */
  const DICTS = ['en', 'pt'];
  const available = $derived(DICTS.filter((d) => lemmaIds.some((id) => extras.glosses[d]?.[id])));
  let chosen = $state(null);
  const dict = $derived(available.includes(chosen) ? chosen : (available.includes(reader.glossLang) ? reader.glossLang : available[0] ?? null));
  function gloss(id) {
    return dict ? (extras.glosses[dict]?.[id] ?? null) : null;
  }
</script>

<Overlay {onclose} label="dictionary" panelClass="dictionary">
  <div class="body">
    <h3>{block.token.surface}</h3>
    {#if block.candidates.length > 0 && extras.lemmas}
      <div class="dicts" role="tablist" aria-label="dictionaries">
        {#each available as d (d)}
          <button class="dict-tab" class:active={dict === d} data-dict={d} role="tab" aria-selected={dict === d} onclick={() => (chosen = d)}>{t(`settings.lang.${d}`)}</button>
        {/each}
        {#if available.length === 0}<span class="no-gloss">{t('dict.nogloss')}</span>{/if}
      </div>
    {/if}
    {#if block.candidates.length === 0}
      <p class="none">{t('dict.none')}</p>
    {:else if !extras.lemmas}
      <p class="loading">{t('dict.loading')}</p>
    {:else}
      <h4>{t('dict.section')}</h4>
      {#each lemmaIds as id (id)}
        {@const r = extras.lemmas[id]}
        {#if r}
          {@const status = eraStatus(r.age, reader.era)}
          {@const g = gloss(id)}
          {@const ip = pickIpa(extras.ipa?.[id], (reader.lang?.eras ?? []).find((e) => e.id === reader.era)?.ipa ?? [])}
          <div class="entry" class:dim-near={status === 'near'} class:dim-out={status === 'out'}>
            <div class="form">{r.dict_form ?? r.headword}
              <a class="wiktionary" href={wiktionaryUrl(r.headword, reader.lang?.wiktionary ?? 'Latin', 'en')} target="_blank" rel="noopener" title={t('dict.wiktionary')}>Wiktionary ↗</a>
              {#if ui.lang === 'pt'}<a class="wiktionary pt" href={wiktionaryUrl(r.headword, reader.lang?.wiktionary ?? 'Latin', 'pt')} target="_blank" rel="noopener" title={t('dict.wiktionary')}>Wikcionário ↗</a>{/if}
            </div>
            {#if ip}<div class="ipa-line"><span class="ipa" title={ip.tags.join(', ')}>{ip.ipa}</span></div>{/if}
            <div class="class">{classLine(r)}</div>
            {#if g !== null}<div class="gloss">{g}</div>{:else if dict}<div class="gloss missing">{t('dict.missingHere', { name: t(`settings.lang.${dict}`) })}</div>{/if}
            <div class="meta">{t('dict.age')}: {AGE_LABEL[r.age] ?? r.age} · {t('dict.freq')} {r.freq}</div>
            {#if warning(r.age, reader.era)}<div class="warning">{warning(r.age, reader.era)}</div>{/if}
          </div>
        {:else}
          <div class="entry"><div class="form">lemma {id}</div><div class="meta">no record</div></div>
        {/if}
      {/each}
    {/if}
    {#if block.candidates.length > 0}
      <h4>{t('dict.readings')} <span class="sub">{t('dict.readings.sub')}</span></h4>
    {/if}
    <Candidates {block} {reader} />
  </div>
</Overlay>

<style>
  h3 { margin: 0 0 8px; font-family: Georgia, serif; font-size: 1.4rem; }
  h4 { margin: 12px 0 4px; font-size: 0.85rem; color: var(--ink-2); text-transform: uppercase; letter-spacing: 0.04em; }
  .sub { text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--muted); }
  .entry { padding: 6px 0; }
  .dim-near { opacity: 0.75; }
  .dim-out { opacity: 0.45; }
  .form { font-weight: 700; }
  .class, .meta { font-size: 0.85em; color: var(--ink-2); }
  .wiktionary { font-size: 0.75rem; font-weight: 400; margin-left: 8px; color: var(--accent); }
  .ipa-line { margin: 2px 0; }
  .ipa { font-family: 'Charis SIL', 'Doulos SIL', 'Gentium Plus', 'Noto Sans', serif; font-size: 1.05rem; color: var(--ink); }
  .dicts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 0 0 6px; }
  .dict-tab { min-height: 30px; padding: 3px 10px; font-size: 0.85rem; border-radius: 999px; }
  .dict-tab.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .no-gloss, .missing { color: var(--muted); font-style: italic; font-size: 0.9em; }
  .warning { color: #a33; font-size: 0.85em; }
  .none, .loading { color: #666; font-style: italic; }
</style>
