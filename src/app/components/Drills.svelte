<script>
  /* The drills page (Allan, 2026-10-18; was the letters drill): pick a language here and its drills open —
   * the letters of a non-Latin alphabet, and the noun and verb endings of every language. */
  import { onMount } from 'svelte';
  import { LANGUAGES } from '../../lang/registry.js';
  import { t, ui } from '../lib/i18n.svelte.js';
  import { drillsPath } from '../lib/route.js';
  import Game from './Game.svelte';
  import EndingsDrill from './EndingsDrill.svelte';
  let { lang, voice = null, loadModels, navigate, random = Math.random } = $props();

  const NOMINAL = new Set(['noun', 'adj', 'det', 'pron']);
  const drills = $derived([...(lang.game ? ['letters'] : []), 'nouns', 'verbs']);
  let chosen = $state(null);
  const drill = $derived(chosen && drills.includes(chosen) ? chosen : drills[0]);
  let models = $state([]);
  onMount(() => { loadModels().then((m) => { models = m ?? []; }).catch(() => { models = []; }); });
  const nouns = $derived(models.filter((m) => NOMINAL.has(m.pos)));
  const verbs = $derived(models.filter((m) => m.pos === 'verb'));
  const withDrills = LANGUAGES;          // every shipped language has at least the endings drills
</script>

<section class="card drills">
  <h2>{t('drills.heading')}</h2>
  <div class="bar">
    <label>{t('drills.language')}
      <select class="drill-language" value={lang.code} onchange={(e) => navigate(drillsPath(withDrills.find((l) => l.code === e.currentTarget.value)))}>
        {#each withDrills as l}<option value={l.code}>{l.name[ui.lang] ?? l.name.en}</option>{/each}
      </select>
    </label>
    <div class="tabs" role="tablist">
      {#each drills as d}
        <button class="drill-tab" class:active={d === drill} data-drill={d} role="tab" aria-selected={d === drill} onclick={() => { chosen = d; }}>{t(`drills.${d}`)}</button>
      {/each}
    </div>
  </div>
  <p class="hint">{t(`drills.${drill}.hint`)}</p>
  {#if drill === 'letters'}
    <Game {lang} {voice} />
  {:else if drill === 'nouns'}
    {#key 'nouns'}<EndingsDrill {lang} models={nouns} {random} />{/key}
  {:else}
    {#key 'verbs'}<EndingsDrill {lang} models={verbs} {random} />{/key}
  {/if}
</section>

<style>
  .bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 8px; }
  label { display: inline-flex; gap: 6px; align-items: center; font-weight: 600; }
  select { font: inherit; padding: 6px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .drill-tab { font: inherit; padding: 6px 14px; border: 1.5px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .drill-tab.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .hint { color: var(--ink-2); }
</style>
