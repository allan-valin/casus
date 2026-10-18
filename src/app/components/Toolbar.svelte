<script>
  /* Dictionary settings, said in plain words (feedback D13, D18). */
  import { ERAS } from '../lib/era.js';
  import { t } from '../lib/i18n.svelte.js';
  let { reader } = $props();
</script>

<div class="toolbar">
  <label class="field">
    <span class="name">{t('settings.period')}</span>
    <select class="era" bind:value={reader.era}>
      {#each ERAS as e (e.id)}<option value={e.id}>{t(`era.${e.id}`)}</option>{/each}
    </select>
    <span class="note">{t('settings.period.note', { authors: t(`era.${reader.era}.authors`) })}</span>
  </label>
  <label class="field">
    <span class="name">{t('settings.language')}</span>
    <select class="gloss" bind:value={reader.glossLang}>
      <option value="en">{t('settings.lang.en')}</option>
      <option value="pt">{t('settings.lang.pt')}</option>
    </select>
    <span class="note">{t('settings.language.note', { name: t(`settings.lang.${reader.glossLang}`) })}</span>
  </label>
</div>

<style>
  .toolbar { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 24px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .name { font-weight: 600; font-size: 0.9rem; }
  .note { color: var(--muted); font-size: 0.8rem; }
  select { max-width: 100%; }
</style>
