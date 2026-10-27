<script>
  /* The progression chip in the header (Allan, 2026-10-20, after Duolingo): level and streak; a click opens the panel
   * with XP to the next level, today's XP and every achievement. Toasts tell a level or an achievement just reached.
   * version: bumped by the page after each answer, so the chip reads the new state. */
  import { t } from '../lib/i18n.svelte.js';
  import { ACHIEVEMENTS, levelOf } from '../lib/progression.js';
  import Overlay from './Overlay.svelte';
  let { progression, version = 0, toasts = [] } = $props();
  let open = $state(false);
  const view = $derived.by(() => {
    void version;
    const s = progression.state;
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return { xp: s.xp, lv: levelOf(s.xp), streak: progression.streak(), today: s.days[key] ?? 0, unlocked: { ...s.unlocked } };
  });
</script>

<button class="xp-chip" title={t('xp.chip.title')} onclick={() => { open = true; }}>
  <span class="lv">{t('xp.level', { n: view.lv.level })}</span>
  <span class="bar" aria-hidden="true"><span style:width="{Math.round((100 * (view.xp - view.lv.from)) / (view.lv.to - view.lv.from))}%"></span></span>
  <span class="streak" class:cold={!view.streak}>🔥{view.streak}</span>
</button>
{#each toasts as x (x.id)}<div class="xp-toast" role="status">{x.text}</div>{/each}

{#if open}
  <Overlay onclose={() => { open = false; }} label={t('xp.title')}>
    <div class="xp-panel">
      <h3>{t('xp.title')}</h3>
      <p class="big">{t('xp.level', { n: view.lv.level })} · {t('xp.total', { xp: view.xp })}</p>
      <div class="bar wide"><span style:width="{Math.round((100 * (view.xp - view.lv.from)) / (view.lv.to - view.lv.from))}%"></span></div>
      <p class="muted">{t('xp.next', { n: view.lv.to - view.xp, level: view.lv.level + 1 })} · 🔥 {t('xp.streak', { n: view.streak })} · {t('xp.today', { xp: view.today })}</p>
      <h4>{t('xp.achievements', { n: Object.keys(view.unlocked).length, total: ACHIEVEMENTS.length })}</h4>
      <ul class="achs">
        {#each ACHIEVEMENTS as a}
          <li class="ach" class:got={!!view.unlocked[a.id]} title={view.unlocked[a.id] ?? t('xp.locked')}>
            <span class="icon">{a.icon}</span><span><b>{t(`ach.${a.id}`)}</b><br /><small>{t(`ach.${a.id}.d`)}</small></span>
          </li>
        {/each}
      </ul>
      <p class="muted small">{t('xp.note')}</p>
    </div>
  </Overlay>
{/if}

<style>
  .xp-chip { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: .9em; padding: 0 10px; height: var(--control-h); box-sizing: border-box; border: 1.5px solid var(--accent); border-radius: 999px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .lv { font-weight: 700; }
  .bar { display: inline-block; width: 48px; height: 7px; border-radius: 4px; background: var(--line); overflow: hidden; }
  .bar.wide { display: block; width: 100%; max-width: 28em; height: 12px; border-radius: 6px; }
  .bar span { display: block; height: 100%; background: var(--accent); }
  .streak.cold { filter: grayscale(1); opacity: .6; }
  .xp-toast { position: fixed; right: 16px; bottom: 16px; z-index: 50; padding: 10px 16px; border-radius: 10px; background: var(--fill); color: var(--fill-ink); font-weight: 700; box-shadow: 0 4px 16px rgba(0,0,0,.25); animation: pop .3s ease-out; }
  @keyframes pop { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
  .big { font-size: 1.3em; font-weight: 700; }
  .achs { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(13em, 1fr)); gap: 8px; }
  .ach { display: flex; gap: 8px; align-items: center; padding: 8px; border: 1px solid var(--line); border-radius: 10px; opacity: .45; filter: grayscale(1); }
  .ach.got { opacity: 1; filter: none; border-color: var(--accent); }
  .icon { font-size: 1.6em; }
  .muted { color: var(--ink-2); } .small { font-size: .85em; }
</style>
