<script>
  /* The navigation: every shipped language on the first row, the current one marked; on a second row, what to do
   * with it — read, or drill (Allan, 2026-10-19: the drills link moved under the languages, and on the drills page
   * a language name opens that language's drills; 2026-10-19: proofreading). */
  import { SITE, SITES, siteLanguages, siteUrl } from '../../sites.js';
  const LANGUAGES = siteLanguages();
  import { drillsPath, proofPath, learnPath, speakPath } from '../lib/route.js';
  import { withBase } from '../lib/paths.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { languageFlag } from '../lib/theme.js';
  // each site its own mark and colour, so the three read as places, not three words (Allan, 2026-10-20)
  const SITE_LOOK = { casus: { mark: '🏛', colour: '#6b4e9b' }, asia: { mark: '⛩', colour: '#bc002d' }, world: { mark: '🌍', colour: '#00796b' } };
  let { current, view = 'reader' } = $props();
  const here = $derived(LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0]);
</script>

<nav class="languages" aria-label={t('nav.label')}>
  {#each LANGUAGES as l (l.code)}
    <a href={withBase(view === 'drills' ? drillsPath(l) : view === 'proof' ? proofPath(l) : view === 'learn' ? learnPath(l) : view === 'speak' ? speakPath(l) : l.path)} aria-current={l.code === current ? 'page' : undefined}>{#if languageFlag(l.code)}<img class="flag" src={languageFlag(l.code)} alt="" />{/if}{l.name[ui.lang] ?? l.name.en}</a>
  {/each}
</nav>
<!-- the other two sites (Allan, 2026-10-19: one codebase, three sites) -->
<nav class="sites" aria-label={t('nav.sites')}>
  {#each Object.values(SITES) as s (s.id)}{#if s.id === SITE.id}<span class="site here" data-site={s.id} style:--site={SITE_LOOK[s.id]?.colour}><span class="site-mark" aria-hidden="true">{SITE_LOOK[s.id]?.mark}</span>{s.title}</span>{:else}<a class="site" data-site={s.id} style:--site={SITE_LOOK[s.id]?.colour} href={siteUrl(s.languages[0])}><span class="site-mark" aria-hidden="true">{SITE_LOOK[s.id]?.mark}</span>{s.title}</a>{/if}{/each}
</nav>
<nav class="views" aria-label={t('nav.views')}>
  <a data-view="reader" href={withBase(here.path)} aria-current={view === 'reader' ? 'page' : undefined}>{t('nav.reader')}</a>
  <a data-view="drills" href={withBase(drillsPath(here))} aria-current={view === 'drills' ? 'page' : undefined}>{t('nav.game')}</a>
  <a data-view="learn" href={withBase(learnPath(here))} aria-current={view === 'learn' ? 'page' : undefined}>{t('nav.learn')}</a>
  <a data-view="speak" href={withBase(speakPath(here))} aria-current={view === 'speak' ? 'page' : undefined}>{t('nav.speak')}</a>
  <a data-view="proof" href={withBase(proofPath(here))} aria-current={view === 'proof' ? 'page' : undefined}>{t('nav.proof')}</a>
</nav>

<style>
  .languages { display: flex; flex-wrap: wrap; gap: 4px; }
  .sites { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.85rem; margin: 8px 0 0; }
  .site { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 6px; border-radius: 8px; border: 2px solid var(--site); color: var(--site); text-decoration: none; font-weight: 700; background: var(--panel); }
  .site.here { background: var(--site); color: #fff; }
  a.site:hover { background: color-mix(in srgb, var(--site) 15%, var(--panel)); }
  :global(:root[data-mode=dark]) .site:not(.here) { color: color-mix(in srgb, var(--site) 50%, white); }
  .site-mark { font-size: 1.15em; }
  .flag { width: 18px; height: 13px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; box-shadow: 0 0 0 1px rgba(0,0,0,.15); }
  .languages a { padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); text-decoration: none; font-size: 0.92rem; }
  .languages a:hover { border-color: var(--accent); }
  .languages a[aria-current=page] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  /* the second row is tabs, not pills, so it does not read as more languages */
  .views { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 8px; border-bottom: 2px solid var(--line); }
  .views a { padding: 6px 16px; color: var(--ink-2); text-decoration: none; font-weight: 600; font-size: 0.92rem; border-bottom: 3px solid transparent; margin-bottom: -2px; }
  .views a:hover { color: var(--ink); }
  .views a[aria-current=page] { color: var(--accent-text); border-bottom-color: var(--accent); }
</style>
