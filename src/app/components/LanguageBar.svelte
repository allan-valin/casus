<script>
  /* The navigation: every shipped language on the first row, the current one marked; on a second row, what to do
   * with it — read, or drill (Allan, 2026-10-19: the drills link moved under the languages, and on the drills page
   * a language name opens that language's drills). */
  import { LANGUAGES } from '../../lang/registry.js';
  import { drillsPath } from '../lib/route.js';
  import { withBase } from '../lib/paths.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  let { current, view = 'reader' } = $props();
  const here = $derived(LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0]);
</script>

<nav class="languages" aria-label={t('nav.label')}>
  {#each LANGUAGES as l (l.code)}
    <a href={withBase(view === 'drills' ? drillsPath(l) : l.path)} aria-current={l.code === current ? 'page' : undefined}>{l.name[ui.lang] ?? l.name.en}</a>
  {/each}
</nav>
<nav class="views" aria-label={t('nav.views')}>
  <a data-view="reader" href={withBase(here.path)} aria-current={view === 'reader' ? 'page' : undefined}>{t('nav.reader')}</a>
  <a data-view="drills" href={withBase(drillsPath(here))} aria-current={view === 'drills' ? 'page' : undefined}>{t('nav.game')}</a>
</nav>

<style>
  .languages { display: flex; flex-wrap: wrap; gap: 4px; }
  .languages a { padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); text-decoration: none; font-size: 0.92rem; }
  .languages a:hover { border-color: var(--accent); }
  .languages a[aria-current=page] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  /* the second row is tabs, not pills, so it does not read as more languages */
  .views { display: flex; gap: 2px; margin-top: 8px; border-bottom: 2px solid var(--line); }
  .views a { padding: 6px 16px; color: var(--ink-2); text-decoration: none; font-weight: 600; font-size: 0.92rem; border-bottom: 3px solid transparent; margin-bottom: -2px; }
  .views a:hover { color: var(--ink); }
  .views a[aria-current=page] { color: var(--accent); border-bottom-color: var(--accent); }
</style>
