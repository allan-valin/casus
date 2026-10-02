<script>
  import Candidates from './Candidates.svelte';
  import { eraStatus, warning, AGE_LABEL } from '../lib/era.js';
  let { block, reader, onclose } = $props();
  let dialog = $state(null);
  $effect(() => { dialog?.focus(); });

  const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' };
  const lemmaIds = $derived([...new Set(block.candidates.map((c) => String(c.analysis.lemma)))]);
  const extras = $derived(reader.lexiconExtras);

  function classLine(r) {
    const bits = [];
    if (r.pos === 'verb') bits.push(r.conj ? `conjugation ${r.conj}` : 'verb');
    else if (r.decl) bits.push(`${ORDINAL[r.decl] ?? r.decl} declension`);
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

<div class="dictionary" role="dialog" aria-label="dictionary" tabindex="-1" bind:this={dialog}
     onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}>
  <button class="close" onclick={onclose} aria-label="close">×</button>
  <h3>{block.token.surface}</h3>
  {#if block.candidates.length === 0}
    <p class="none">not in lexicon</p>
  {:else if !extras.lemmas}
    <p class="loading">loading the lemma table…</p>
  {:else}
    {#each lemmaIds as id (id)}
      {@const r = extras.lemmas[id]}
      {#if r}
        {@const status = eraStatus(r.age, reader.era)}
        {@const g = gloss(id)}
        <div class="entry" class:dim-near={status === 'near'} class:dim-out={status === 'out'}>
          <div class="form">{r.dict_form ?? r.headword}</div>
          <div class="class">{classLine(r)}</div>
          <div class="gloss">{g.text} <span class="gloss-lang">{g.lang}</span></div>
          <div class="meta">age: {AGE_LABEL[r.age] ?? r.age} · freq {r.freq}</div>
          {#if warning(r.age, reader.era)}<div class="warning">{warning(r.age, reader.era)}</div>{/if}
        </div>
      {:else}
        <div class="entry"><div class="form">lemma {id}</div><div class="meta">no record</div></div>
      {/if}
    {/each}
  {/if}
  <Candidates {block} {reader} />
</div>

<style>
  .dictionary:focus { outline: none; }
  .dictionary { position: relative; border: 1px solid #999; border-radius: 8px; padding: 12px 14px; background: #fff; max-width: 420px; box-shadow: 0 4px 16px rgba(0,0,0,.15); margin-top: 12px; }
  .close { position: absolute; top: 6px; right: 8px; border: 0; background: none; font-size: 1.2em; cursor: pointer; }
  h3 { margin: 0 0 8px; font-family: Georgia, serif; }
  .entry { padding: 6px 0; }
  .dim-near { opacity: 0.75; }
  .dim-out { opacity: 0.45; }
  .form { font-weight: 700; }
  .class, .meta { font-size: 0.85em; color: #555; }
  .gloss-lang { font-size: 0.7em; border: 1px solid #999; border-radius: 3px; padding: 0 3px; margin-left: 4px; }
  .warning { color: #a33; font-size: 0.85em; }
  .none, .loading { color: #666; font-style: italic; }
</style>
