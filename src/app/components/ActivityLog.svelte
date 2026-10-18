<script>
  /* The log under the panes: every action and its outcome, newest last, scrolled to the end. */
  import { t } from '../lib/i18n.svelte.js';
  let { activity } = $props();
  let tall = $state(false);
  let box = $state(null);
  $effect(() => { void activity.lines.length; if (box) box.scrollTop = box.scrollHeight; });
</script>

<section class="activity">
  <div class="head">
    <h2>{t('activity.heading')}</h2>
    <button class="more" onclick={() => (tall = !tall)}>{tall ? t('activity.less') : t('activity.more')}</button>
  </div>
  <div class="log" class:tall bind:this={box} aria-live="polite">
    {#each activity.lines as line, i (i)}
      <div class="line {line.kind}" class:last={i === activity.lines.length - 1}><time>{line.at}</time><span>{line.msg}</span></div>
    {/each}
    {#if activity.lines.length === 0}<div class="line empty"><span>{t('activity.empty')}</span></div>{/if}
  </div>
</section>

<style>
  .activity { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 10px clamp(12px, 2vw, 26px) 12px; }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  h2 { margin: 0; font-size: 0.95rem; color: var(--ink-2); }
  .more { min-height: 28px; padding: 2px 10px; font-size: 0.85rem; }
  .log { max-height: 5.2em; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; line-height: 1.5; margin-top: 6px; }
  .log.tall { max-height: 20em; }
  .line { display: flex; gap: 10px; color: var(--muted); }
  .line.last { color: var(--ink); }
  .line.err { color: #a33; }
  .line.slow { color: #8a5a00; }
  .line.ok { color: #1f6b2f; }
  time { flex: 0 0 auto; opacity: 0.7; }
</style>
