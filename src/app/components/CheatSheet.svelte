<script>
  /* The cheat sheet of the drills page (Allan, 2026-10-18): everything a drill asks, on one page — the alphabet
   * with names and sounds, every model word's tables, the words, the phrases. It opens on the current drill and a
   * menu on top moves to any other (Allan, 2026-10-19: it was not clear it showed only the selected drill). */
  import { t, ui } from '../lib/i18n.svelte.js';
  import { frontDecode } from '../lib/paradigm.js';
  import { displayForm } from '../lib/entry.js';
  import Paradigm from './Paradigm.svelte';
  let { lang, drill, drills = [drill], nouns = [], verbs = [], models = null, words = [], phrases = [] } = $props();
  let picked = $state(null);
  // (the matching grid drills the same words; the sentence drills have no sheet of their own: the tables help most)
  const section = $derived(((s) => ({ match: 'words' })[s] ?? s)(picked && drills.includes(picked) ? picked : drill));
  const shown = $derived(models ?? (section === 'verbs' ? verbs : nouns));
  const glossOf = (m) => (typeof m.gloss === 'string' ? m.gloss : (m.gloss?.[ui.lang] ?? m.gloss?.en ?? ''));
  const romanize = lang.script?.romanize ?? null;
  const hasNames = !!lang.game?.LETTERS?.some((l) => l.names?.length);
</script>

<div class="cheat">
  <h3>{t('drills.cheatsheet')}</h3>
  <nav class="cheat-menu" aria-label={t('drills.cheatsheet')}>
    {#each drills as d}<button class="cheat-tab" class:active={d === section} data-section={d} aria-pressed={d === section} onclick={() => { picked = d; }}>{lang.drillNames?.[d]?.[ui.lang] ?? t(`drills.${d}`)}</button>{/each}
  </nav>
  {#if (section === 'nouns' || section === 'verbs') && shown.length > 1}
    <nav class="cheat-jump">{#each shown as m (m.id)}<a href={`#cheat-${m.id}`}>{displayForm(m.headword)}</a>{/each}</nav>
  {/if}
  {#if section === 'letters' && lang.game}
    <table>
      <thead><tr><th>{lang.game.LABELS?.small ?? t('cheat.small')}</th><th>{lang.game.LABELS?.capital ?? t('cheat.capital')}</th>{#if hasNames}<th>{t('cheat.name')}</th>{/if}<th>{t('cheat.sound')}</th></tr></thead>
      <tbody>
        {#each lang.game.LETTERS as l}
          <tr class="letter"><td class="glyph">{l.lower}</td><td class="glyph">{l.upper}</td>{#if hasNames}<td>{l.names[0]}</td>{/if}<td>{l.sounds.join(', ')}</td></tr>
        {/each}
      </tbody>
    </table>
  {:else if section === 'words'}
    <table>
      <thead><tr><th>#</th><th>{t('cheat.word')}</th><th>{t('cheat.meaning')}</th></tr></thead>
      <tbody>{#each words as w (w.rank)}<tr class="word"><td>{w.rank}</td><td class="w">{w.w}{#if romanize} <span class="roman">{romanize(w.w)}</span>{/if}</td><td>{w.en}</td></tr>{/each}</tbody>
    </table>
  {:else if section === 'phrases'}
    <table>
      <thead><tr><th>{t('cheat.phrase')}</th><th>{t('cheat.meaning')}</th><th>{t('quiz.literal')}</th></tr></thead>
      <tbody>{#each phrases as p (p.p)}<tr class="phrase"><td class="w">{p.p}{#if romanize} <span class="roman">{romanize(p.p)}</span>{/if}</td><td>{p.en}{#if p.literally}<div class="note">{t('quiz.literally')}: {p.literally}</div>{/if}{#if p.note}<div class="note">{p.note} ({t('quiz.noteBy')})</div>{/if}{#if p.wiki}<div class="note">{p.wiki.text} <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(p.wiki.title.replaceAll(' ', '_'))}`} target="_blank" rel="noopener">Wikipedia</a></div>{/if}</td><td class="lit">{p.lit.map(([w, g]) => `${w}: ${g || '—'}`).join(' · ')}</td></tr>{/each}</tbody>
    </table>
  {:else}
    {#each shown as m (m.id)}
      <section class="model" id={`cheat-${m.id}`}>
        <h4>{displayForm(m.dict_form)}{#if romanize} <span class="roman">{romanize(m.headword)}</span>{/if}{#if glossOf(m)} <span class="gloss">— {glossOf(m)}</span>{/if}</h4>
        <Paradigm rows={frontDecode(m.rows)} lemma={m.id} {lang} form="" openAll={section === 'nouns'} />
      </section>
    {/each}
  {/if}
</div>

<style>
  .cheat h3 { margin-top: 0; }
  .cheat-menu { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; position: sticky; top: 0; background: var(--panel); padding: 4px 0; z-index: 1; }
  .cheat-tab { font: inherit; padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--ink); cursor: pointer; }
  .cheat-tab.active { border-color: var(--accent); background: var(--panel-hi); font-weight: 600; }
  .cheat-jump { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.9em; margin-bottom: 6px; }
  .model { border-top: 1px solid var(--line-soft); padding-top: 6px; margin-top: 8px; }
  h4 { margin: 4px 0; }
  .gloss { font-weight: 400; font-style: italic; color: var(--ink-2); }
  .roman { font-weight: 400; font-style: italic; font-size: 0.85em; color: var(--ink-2); }
  table { border-collapse: collapse; }
  th, td { border: 1px solid var(--line-soft); padding: 3px 10px; text-align: left; }
  th { background: var(--panel-hi); color: var(--ink-2); }
  .w { font-family: Georgia, serif; font-size: 1.05em; }
  .note { color: var(--ink-2); font-size: 0.85em; margin-top: 3px; }
  .lit { color: var(--ink-2); font-size: 0.9em; }
  .glyph { font-size: 1.3em; font-family: Georgia, serif; }
</style>
