<script>
  /* The cheat sheet of the drills page (Allan, 2026-10-18): everything the current drill asks, on one page —
   * the alphabet with names and sounds, or every model word's tables. */
  import { t, ui } from '../lib/i18n.svelte.js';
  import { frontDecode } from '../lib/paradigm.js';
  import { displayForm } from '../lib/entry.js';
  import Paradigm from './Paradigm.svelte';
  let { lang, drill, models = [], words = [], phrases = [] } = $props();
  const glossOf = (m) => (typeof m.gloss === 'string' ? m.gloss : (m.gloss?.[ui.lang] ?? m.gloss?.en ?? ''));
  const romanize = lang.script?.romanize ?? null;
</script>

<div class="cheat">
  <h3>{t('drills.cheatsheet')} · {t(`drills.${drill}`)}</h3>
  {#if drill === 'letters' && lang.game}
    <table>
      <thead><tr><th>{t('cheat.small')}</th><th>{t('cheat.capital')}</th><th>{t('cheat.name')}</th><th>{t('cheat.sound')}</th></tr></thead>
      <tbody>
        {#each lang.game.LETTERS as l}
          <tr class="letter"><td class="glyph">{l.lower}</td><td class="glyph">{l.upper}</td><td>{l.names[0]}</td><td>{l.sounds.join(', ')}</td></tr>
        {/each}
      </tbody>
    </table>
  {:else if drill === 'words'}
    <table>
      <thead><tr><th>#</th><th>{t('cheat.word')}</th><th>{t('cheat.meaning')}</th></tr></thead>
      <tbody>{#each words as w (w.rank)}<tr class="word"><td>{w.rank}</td><td class="w">{w.w}{#if romanize} <span class="roman">{romanize(w.w)}</span>{/if}</td><td>{w.en}</td></tr>{/each}</tbody>
    </table>
  {:else if drill === 'phrases'}
    <table>
      <thead><tr><th>{t('cheat.phrase')}</th><th>{t('cheat.meaning')}</th><th>{t('quiz.literal')}</th></tr></thead>
      <tbody>{#each phrases as p (p.p)}<tr class="phrase"><td class="w">{p.p}</td><td>{p.en}</td><td class="lit">{p.lit.map(([w, g]) => `${w}: ${g || '—'}`).join(' · ')}</td></tr>{/each}</tbody>
    </table>
  {:else}
    {#each models as m (m.id)}
      <section class="model">
        <h4>{displayForm(m.dict_form)}{#if romanize} <span class="roman">{romanize(m.headword)}</span>{/if}{#if glossOf(m)} <span class="gloss">— {glossOf(m)}</span>{/if}</h4>
        <Paradigm rows={frontDecode(m.rows)} lemma={m.id} {lang} form="" openAll={drill === 'nouns'} />
      </section>
    {/each}
  {/if}
</div>

<style>
  .cheat h3 { margin-top: 0; }
  .model { border-top: 1px solid var(--line-soft); padding-top: 6px; margin-top: 8px; }
  h4 { margin: 4px 0; }
  .gloss { font-weight: 400; font-style: italic; color: var(--ink-2); }
  .roman { font-weight: 400; font-style: italic; font-size: 0.85em; color: var(--ink-2); }
  table { border-collapse: collapse; }
  th, td { border: 1px solid var(--line-soft); padding: 3px 10px; text-align: left; }
  th { background: var(--panel-hi); color: var(--ink-2); }
  .w { font-family: Georgia, serif; font-size: 1.05em; }
  .lit { color: var(--ink-2); font-size: 0.9em; }
  .glyph { font-size: 1.3em; font-family: Georgia, serif; }
</style>
