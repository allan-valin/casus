<script>
  /* Dictionary settings, said in plain words (feedback D13, D18). */
  import { ERAS } from '../lib/era.js';
  import { t } from '../lib/i18n.svelte.js';
  import VoiceSettings from './VoiceSettings.svelte';
  let { reader, voice = null, onvoice = () => {} } = $props();
  const eras = $derived(reader.lang?.eras ?? ERAS);
  // a period id two languages share (classical) gets the language's own label when it has one
  const eraKey = (id) => (reader.lang?.code && reader.lang.code !== 'la' && t(`era.${reader.lang.code}.${id}`) !== `era.${reader.lang.code}.${id}` ? `era.${reader.lang.code}.${id}` : `era.${id}`);
</script>

<div class="toolbar">
  <label class="field">
    <span class="name">{t('settings.period')}</span>
    <select class="era" bind:value={reader.era}>
      {#each eras as e (e.id)}<option value={e.id}>{t(eraKey(e.id))}</option>{/each}
    </select>
    <span class="note">{t(reader.lang?.code === 'grc' ? 'settings.period.noteGrc' : 'settings.period.note', { authors: t(`${eraKey(reader.era)}.authors`) })}</span>
  </label>
  <label class="field">
    <span class="name">{t('settings.language')}</span>
    <select class="gloss" bind:value={reader.glossLang}>
      <option value="en">{t('settings.lang.en', { source: reader.lang?.sources?.en ?? '' })}</option>
      <option value="pt">{t('settings.lang.pt', { source: reader.lang?.sources?.pt ?? '' })}</option>
    </select>
    <span class="note">{t('settings.language.note', { name: t(`settings.lang.${reader.glossLang}`, { source: reader.lang?.sources?.[reader.glossLang] ?? '' }) })}</span>
  </label>
  <VoiceSettings {voice} onaction={onvoice} />
</div>

<style>
  .toolbar { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px 24px; }
  .field { display: flex; flex-direction: column; gap: 4px; }
  .name { font-weight: 600; font-size: 0.9rem; }
  .note { color: var(--muted); font-size: 0.8rem; }
  select { max-width: 100%; }
</style>
