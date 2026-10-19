<script>
  /* How to bring text from other websites (Allan, 2026-10-19): the "Send to Casus" bookmark, explained step by step.
   * Sites such as NHK cannot be shown inside Casus (they forbid it), so the bookmark runs on the site instead. */
  import { t } from '../lib/i18n.svelte.js';
  import { bookmarkletHref } from '../lib/bookmarklet.js';
  let { pageUrl, language } = $props();
  const href = $derived(bookmarkletHref(pageUrl, { add: t('send.add'), cancel: t('send.cancel') }));
  let anchor = $state(null);
  // Svelte would refuse a javascript: href in the template; set it on the element instead
  $effect(() => { if (anchor) anchor.setAttribute('href', href); });
</script>

<details class="send">
  <summary>{t('send.heading')}</summary>
  <ol>
    <li>{t('send.step1')} <a class="bookmarklet" bind:this={anchor} onclick={(e) => e.preventDefault()} draggable="true" title={t('send.drag')}>📎 {t('send.name', { language })}</a></li>
    <li>{t('send.step2')}</li>
    <li>{t('send.step3')}</li>
    <li>{t('send.step4')}</li>
  </ol>
  <p class="tip">{t('send.tip')}</p>
</details>

<style>
  .send { margin-top: 10px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; background: var(--panel); }
  summary { cursor: pointer; font-weight: 600; }
  ol { margin: 6px 0; padding-left: 1.4em; display: flex; flex-direction: column; gap: 6px; }
  .bookmarklet { display: inline-block; margin-left: 6px; padding: 4px 12px; border: 1.5px dashed var(--accent); border-radius: 8px; color: var(--ink); text-decoration: none; font-weight: 600; cursor: grab; }
  .tip { color: var(--ink-2); font-size: 0.9em; margin: 4px 0; }
</style>
