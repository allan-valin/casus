<script>
  /* The navigation: every shipped language on the first row, the current one marked; on a second row, what to do
   * with it — read, or drill (Allan, 2026-10-19: the drills link moved under the languages, and on the drills page
   * a language name opens that language's drills; 2026-10-19: proofreading). */
  import { SITE, SITES, siteLanguages, siteUrl, siteOf } from '../../sites.js';
  import { LANGUAGES as ALL } from '../../lang/registry.js';
  import { FAMILIES, REGIONS } from '../lib/families.js';
  const LANGUAGES = siteLanguages();
  import { drillsPath, proofPath, learnPath, speakPath, talkPath } from '../lib/route.js';
  import { withBase } from '../lib/paths.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { languageFlag } from '../lib/theme.js';
  import Picker from './Picker.svelte';
  // each site its own mark and colour, so the three read as places, not three words (Allan, 2026-10-20)
  const SITE_LOOK = { casus: { mark: '🏛', colour: '#6b4e9b' }, asia: { mark: '⛩', colour: '#bc002d' }, world: { mark: '🌍', colour: '#00796b' } };
  // which rows to draw (Allan, 2026-10-22: the header shows the sites and the views; the languages live behind the gear)
  let { current, view = 'reader', parts = ['languages', 'sites', 'views'] } = $props();
  // a language of this site: a local link to the same view; of another site: that site's page, same view
  const pathOf = (l) => (view === 'drills' ? drillsPath(l) : view === 'proof' ? proofPath(l) : view === 'learn' ? learnPath(l) : view === 'speak' ? speakPath(l) : view === 'talk' ? talkPath(l) : l.path);
  const hrefOf = (l) => (siteOf(l.code).id === SITE.id ? withBase(pathOf(l)) : siteUrl(l.code, view));
  const VIEW_KEY = { reader: 'nav.reader', drills: 'nav.game', learn: 'nav.learn', talk: 'nav.talk', speak: 'nav.speak', proof: 'nav.proof' };
  const here = $derived(LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0]);
  // the list by family or by region, remembered in this browser; Expand all / Collapse all (Allan, 2026-10-27)
  const BY_KEY = 'casus:languages:group-by';
  let by = $state((() => { try { return localStorage.getItem(BY_KEY) === 'region' ? 'region' : 'family'; } catch { return 'family'; } })());
  const groups = $derived(by === 'region' ? REGIONS : FAMILIES);
  let opened = $state({});
  const isOpen = (g) => opened[g.id] ?? g.codes.includes(current);
  function groupBy(b) { by = b; opened = {}; try { localStorage.setItem(BY_KEY, b); } catch { /* not kept */ } }
  const setAll = (v) => { opened = Object.fromEntries(groups.map((g) => [g.id, v])); };
</script>

{#if parts.includes('languages')}<nav class="languages" aria-label={t('nav.label')}>
  <div class="group-tools">
    <span class="group-toggle" role="group" aria-label={t('nav.groupBy')}>
      <button class="group-by" data-by="family" aria-pressed={by === 'family'} onclick={() => groupBy('family')}>{t('nav.byFamily')}</button>
      <button class="group-by" data-by="region" aria-pressed={by === 'region'} onclick={() => groupBy('region')}>{t('nav.byRegion')}</button>
    </span>
    <button class="expand-all" onclick={() => setAll(true)}>{t('nav.expandAll')}</button>
    <button class="collapse-all" onclick={() => setAll(false)}>{t('nav.collapseAll')}</button>
  </div>
  <!-- every language of all three sites, by family; another site's language links there (Allan, 2026-10-22) -->
  {#each groups as f (f.id)}{@const members = f.codes.map((c) => ALL.find((l) => l.code === c)).filter(Boolean)}{#if members.length}
    <details class="family" data-group={f.id} open={isOpen(f)} ontoggle={(e) => { if (e.currentTarget.open !== isOpen(f)) opened = { ...opened, [f.id]: e.currentTarget.open }; }}>
      <summary>{f.name[ui.lang] ?? f.name.en} <span class="family-n">{members.length}</span></summary>
      <div class="family-langs">
        {#each members as l (l.code)}<a href={hrefOf(l)} data-code={l.code} aria-current={l.code === current ? 'page' : undefined} data-site={siteOf(l.code).id}>{#if languageFlag(l.code)}<img class="flag" src={languageFlag(l.code)} alt="" />{/if}{l.name[ui.lang] ?? l.name.en}{#if siteOf(l.code).id !== SITE.id}<span class="other-site" title={siteOf(l.code).title}>↗</span>{/if}</a>{/each}
      </div>
    </details>
  {/if}{/each}
</nav>{/if}
<!-- the other two sites (Allan, 2026-10-19: one codebase, three sites) -->
{#if parts.includes('sites')}<nav class="sites" aria-label={t('nav.sites')} style:--site-here={SITE_LOOK[SITE.id]?.colour}>
  <!-- folded: the current site on the button, the other two in its menu (Allan, 2026-10-22) -->
  <!-- on a phone only the site's mark and the arrow (Allan, 2026-10-22: one line for site, view, level and gear) -->
  <Picker cls="site-picker" title={t('nav.sites')}>
    {#snippet head()}<span aria-hidden="true">{SITE_LOOK[SITE.id]?.mark ?? ''}</span> <span class="site-name">{SITE.title}</span>{/snippet}
    {#each Object.values(SITES) as s (s.id)}{#if s.id === SITE.id}<span class="site here" data-site={s.id} style:--site={SITE_LOOK[s.id]?.colour}><span class="site-mark" aria-hidden="true">{SITE_LOOK[s.id]?.mark}</span>{s.title}</span>{:else}<a class="site" data-site={s.id} style:--site={SITE_LOOK[s.id]?.colour} href={siteUrl(s.languages[0])}><span class="site-mark" aria-hidden="true">{SITE_LOOK[s.id]?.mark}</span>{s.title}</a>{/if}{/each}
  </Picker>
</nav>{/if}
{#if parts.includes('views')}<nav class="views" aria-label={t('nav.views')}>
  <a data-view="reader" href={withBase(here.path)} aria-current={view === 'reader' ? 'page' : undefined}>{t('nav.reader')}</a>
  <a data-view="drills" href={withBase(drillsPath(here))} aria-current={view === 'drills' ? 'page' : undefined}>{t('nav.game')}</a>
  <a data-view="learn" href={withBase(learnPath(here))} aria-current={view === 'learn' ? 'page' : undefined}>{t('nav.learn')}</a>
  <a data-view="talk" href={withBase(talkPath(here))} aria-current={view === 'talk' ? 'page' : undefined}>{t('nav.talk')}</a>
  <a data-view="speak" href={withBase(speakPath(here))} aria-current={view === 'speak' ? 'page' : undefined}>{t('nav.speak')}</a>
  <a data-view="proof" href={withBase(proofPath(here))} aria-current={view === 'proof' ? 'page' : undefined}>{t('nav.proof')}</a>
</nav>{/if}
<!-- on a phone the views fold into one button showing the current one (Allan, 2026-10-22) -->
{#if parts.includes('viewfold')}<div class="view-fold">
  <Picker cls="view-picker" label={t(VIEW_KEY[view] ?? 'nav.reader')} title={t('nav.views')}>
  <a data-view="reader" href={withBase(here.path)} aria-current={view === 'reader' ? 'page' : undefined}>{t('nav.reader')}</a>
  <a data-view="drills" href={withBase(drillsPath(here))} aria-current={view === 'drills' ? 'page' : undefined}>{t('nav.game')}</a>
  <a data-view="learn" href={withBase(learnPath(here))} aria-current={view === 'learn' ? 'page' : undefined}>{t('nav.learn')}</a>
  <a data-view="talk" href={withBase(talkPath(here))} aria-current={view === 'talk' ? 'page' : undefined}>{t('nav.talk')}</a>
  <a data-view="speak" href={withBase(speakPath(here))} aria-current={view === 'speak' ? 'page' : undefined}>{t('nav.speak')}</a>
  <a data-view="proof" href={withBase(proofPath(here))} aria-current={view === 'proof' ? 'page' : undefined}>{t('nav.proof')}</a>
</Picker>
</div>{/if}

<style>
  .languages { display: flex; flex-direction: column; gap: 4px; }
  .group-tools { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 4px; }
  .group-tools button { border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; background: transparent; color: var(--ink); cursor: pointer; font-size: 0.85rem; }
  .group-toggle { display: inline-flex; gap: 0; }
  .group-toggle button:first-child { border-start-end-radius: 0; border-end-end-radius: 0; }
  .group-toggle button:last-child { border-start-start-radius: 0; border-end-start-radius: 0; border-inline-start: 0; }
  .group-tools button[aria-pressed=true] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .family summary { cursor: pointer; font-weight: 700; font-size: 0.9rem; padding: 6px 4px; list-style-position: inside; }
  .family-n { display: inline-block; min-width: 1.4em; padding: 0 6px; border-radius: 999px; background: var(--line); color: var(--ink-2); font-size: 0.8em; text-align: center; font-weight: 600; }
  .family-langs { display: flex; flex-wrap: wrap; gap: 4px; padding: 2px 0 8px 14px; }
  .other-site { margin-inline-start: 4px; color: var(--muted); font-size: 0.85em; }
  .sites { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.85rem; margin: 8px 0 0; }
  .site { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px 4px 6px; border-radius: 8px; border: 2px solid var(--site); color: var(--site); text-decoration: none; font-weight: 700; background: var(--panel); }
  .site.here { background: var(--site); color: #fff; }
  a.site:hover { background: color-mix(in srgb, var(--site) 15%, var(--panel)); }
  :global(:root[data-mode=dark]) .site:not(.here) { color: color-mix(in srgb, var(--site) 50%, white); }
  .site-mark { font-size: 1.15em; }
  .sites :global(.site-picker summary) { border-color: var(--site-here); color: var(--ink); font-size: 1rem; }
  .flag { width: 18px; height: 13px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; box-shadow: 0 0 0 1px rgba(0,0,0,.15); }
  .languages a { display: inline-flex; align-items: center; height: var(--control-h); box-sizing: border-box; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); text-decoration: none; font-size: 0.92rem; }
  .languages a:hover { border-color: var(--accent); }
  .languages a[aria-current=page] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  /* the views are toolbar items: a border on every side (Allan, 2026-10-22), the current one filled */
  .views { display: flex; flex-wrap: wrap; gap: 4px; }
  .views a { display: inline-flex; align-items: center; height: var(--control-h); box-sizing: border-box; padding: 0 14px; color: var(--ink); text-decoration: none; font-weight: 600; font-size: 0.92rem; border: 1.5px solid var(--line); border-radius: 8px; background: var(--panel); }
  .views a:hover { border-color: var(--accent); }
  .views a[aria-current=page] { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); }
  .view-fold { display: none; }
  .view-fold :global(a) { display: block; padding: 8px 12px; color: var(--ink); text-decoration: none; font-weight: 600; }
  .view-fold :global(a[aria-current=page]) { background: var(--accent); color: var(--accent-ink); }
  .view-fold :global(summary) { max-width: 46vw; }
  .view-fold :global(.picker-label) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 560px) { .view-fold { display: block; } .sites :global(.site-name) { display: none; } }
</style>
