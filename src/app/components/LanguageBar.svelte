<script>
  /* The navigation bar: every shipped language, the current one marked; the drills of the current language. */
  import { LANGUAGES } from '../../lang/registry.js';
  import { drillsPath } from '../lib/route.js';
  import { withBase } from '../lib/paths.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  let { current, view = 'reader' } = $props();
</script>

<nav class="languages" aria-label={t('nav.label')}>
  {#each LANGUAGES as l (l.code)}
    <a href={withBase(l.path)} aria-current={l.code === current && view === 'reader' ? 'page' : undefined}>{l.name[ui.lang] ?? l.name.en}</a>
  {/each}
  <a class="game-link" href={withBase(drillsPath(LANGUAGES.find((l) => l.code === current)))} aria-current={view === 'drills' ? 'page' : undefined}>{t('nav.game')}</a>
</nav>

<style>
  .languages { display: flex; flex-wrap: wrap; gap: 4px; }
  a { padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); text-decoration: none; font-size: 0.92rem; }
  a:hover { border-color: var(--accent); }
  a[aria-current=page] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .game-link { margin-left: 6px; }
</style>
