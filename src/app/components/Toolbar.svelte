<script>
  /* Dictionary settings, said in plain words (feedback D13, D18). */
  import { ERAS } from '../lib/era.js';
  let { reader } = $props();
  const LANG = { en: 'English (Whitaker)', pt: 'Português (Wikcionário)' };
  const era = $derived(ERAS.find((e) => e.id === reader.era));
</script>

<div class="toolbar">
  <label class="field">
    <span class="name">Dictionary period</span>
    <select class="era" bind:value={reader.era}>
      {#each ERAS as e (e.id)}<option value={e.id}>{e.label}</option>{/each}
    </select>
    <span class="note">Words only attested outside this period are dimmed and flagged. {era ? `Authors: ${era.authors}.` : ''}</span>
  </label>
  <label class="field">
    <span class="name">Dictionary language</span>
    <select class="gloss" bind:value={reader.glossLang}>
      <option value="en">English</option>
      <option value="pt">Português</option>
    </select>
    <span class="note">Active: {LANG[reader.glossLang]}. A word missing in Portuguese falls back to English, and the entry says so.</span>
  </label>
</div>

<style>
  .toolbar { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 24px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .name { font-weight: 600; font-size: 0.9rem; }
  .note { color: var(--muted); font-size: 0.8rem; }
  select { max-width: 100%; }
</style>
