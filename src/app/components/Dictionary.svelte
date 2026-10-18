<script>
  import Candidates from './Candidates.svelte';
  import Overlay from './Overlay.svelte';
  import { eraStatus, warning, AGE_LABEL } from '../lib/era.js';
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

  /** §8: the chosen language when it has the word, else English with the badge flipped. */
  function gloss(id) {
    const want = reader.glossLang;
    const pt = extras.glosses.pt?.[id];
    const en = extras.glosses.en?.[id];
    if (want === 'pt' && pt) return { text: pt, lang: 'pt' };
    if (want === 'pt') return { text: en ?? '', lang: 'en (no pt)' };
    return { text: en ?? '', lang: 'en' };
  }
</script>

<Overlay {onclose} label="dictionary" panelClass="dictionary">
  <div class="body">
    <h3>{block.token.surface}</h3>
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
          <div class="entry" class:dim-near={status === 'near'} class:dim-out={status === 'out'}>
            <div class="form">{r.dict_form ?? r.headword}</div>
            <div class="class">{classLine(r)}</div>
            <div class="gloss">{g.text} <span class="gloss-lang" title={t('dict.glosslang')}>{g.lang}</span></div>
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
  .gloss-lang { font-size: 0.7em; border: 1px solid var(--muted); border-radius: 3px; padding: 0 3px; margin-left: 4px; color: var(--ink-2); }
  .warning { color: #a33; font-size: 0.85em; }
  .none, .loading { color: #666; font-style: italic; }
</style>
