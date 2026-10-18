<script>
  /* Spec §7.2: every layer toggles independently; the class sub-layer is off by default. */
  import { t } from '../lib/i18n.svelte.js';
  let { reader } = $props();
</script>

<fieldset class="layers">
  <legend>{t('layers.legend')}</legend>
  <label title={t('layers.nominal.title')}><input type="checkbox" bind:checked={reader.layers.nominal}> {t('layers.nominal')}</label>
  <label title={t('layers.verb.title')}><input type="checkbox" bind:checked={reader.layers.verb}> {t('layers.verb')}</label>
  <label title={t('layers.function.title')}><input type="checkbox" bind:checked={reader.layers.function}> {t('layers.function')}</label>
  {#if reader.lang?.script?.spaced === false}<label title={t('layers.furigana.title')}><input type="checkbox" bind:checked={reader.layers.furigana}> {t('layers.furigana')}</label>{/if}
  {#if reader.lang?.script?.romanize}<label title={t('layers.roman.title')}><input type="checkbox" bind:checked={reader.layers.roman}> {t('layers.roman')}</label>{/if}
  {#if reader.lang?.script?.hasMarks}<label title={t('layers.marks.title')}><input type="checkbox" bind:checked={reader.layers.marks}> {t('layers.marks')}</label>{/if}
  <label title={t('layers.classes.title')}><input type="checkbox" bind:checked={reader.layers.classes}> {t('layers.classes')}</label>
</fieldset>

<style>
  .layers { display: inline-flex; flex-wrap: wrap; gap: 6px 14px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px 8px; margin: 0; background: var(--panel); }
  legend { color: var(--ink-2); font-size: 0.85rem; padding: 0 4px; }
  label { white-space: nowrap; }
</style>
