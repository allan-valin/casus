<script>
  /* Proofreading (Allan, 2026-10-18: a LanguageTool-like checker, he was tired of the paywall; 2026-10-19: the tab
   * beside Reader and Drills). Spelling in the page with Hunspell (offline once the dictionary is loaded); grammar
   * from LanguageTool, the one on this computer first, the public one otherwise. Marks in the text, suggestions to
   * click, and the text can go to the reader. */
  import { onMount } from 'svelte';
  import { t } from '../lib/i18n.svelte.js';
  import { DICTIONARIES, loadSpeller as defaultLoadSpeller, spellIssues } from '../../lib/proof/spell.js';
  import { checkGrammar as defaultCheckGrammar, LT_CODE } from '../../lib/proof/grammar.js';
  import { mergeIssues } from '../../lib/proof/merge.js';
  let { lang, storage = null, fetchImpl, say = () => {}, loadSpeller = defaultLoadSpeller, checkGrammar = defaultCheckGrammar, toReader = null } = $props();

  const KEY = `casus:proof:${lang.code}`;
  let text = $state('');
  let issues = $state([]);
  let checked = $state(false);
  let busy = $state(false);
  let grammarEngine = $state(null);
  let allowPublic = $state(true);
  let speller = null;
  const hasSpell = !!DICTIONARIES[lang.code];
  const hasGrammar = !!LT_CODE[lang.code];

  onMount(() => {
    try { text = storage?.getItem(KEY) ?? storage?.getItem(`casus:input:${lang.code}`) ?? ''; } catch { /* blocked */ }
    try { allowPublic = storage?.getItem('casus:proof:public') !== 'off'; } catch { /* blocked */ }
  });
  function keep() { try { storage?.setItem(KEY, text); } catch { /* full */ } }

  async function check() {
    if (!text.trim()) return;
    busy = true;
    keep();
    try {
      const [sp, gr] = await Promise.all([
        hasSpell ? (async () => { speller ??= await loadSpeller(lang.code, fetchImpl); return spellIssues(text, speller, { suggest: true }); })().catch((e) => { say('act.proof.spellFailed', { error: e.message }); return []; }) : [],
        hasGrammar ? checkGrammar(text, lang.code, { fetchImpl, allowPublic }).catch((e) => { say('act.proof.grammarFailed', { error: e.message }); return { engine: null, issues: [] }; }) : { engine: null, issues: [] },
      ]);
      grammarEngine = gr.engine;
      issues = mergeIssues(sp, gr.issues);
      checked = true;
      say('act.proof.done', { n: issues.length });
    } finally { busy = false; }
  }

  /** a suggestion replaces its stretch; the other marks move with the text */
  function apply(issue, replacement) {
    const delta = replacement.length - issue.length;
    text = text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length);
    issues = issues.filter((i) => i !== issue && (i.offset + i.length <= issue.offset || i.offset >= issue.offset + issue.length))
      .map((i) => (i.offset >= issue.offset + issue.length ? { ...i, offset: i.offset + delta } : i));
    keep();
    say('act.proof.applied', { from: issue.word ?? '', to: replacement });
  }
  function ignore(issue) { issues = issues.filter((i) => i !== issue); }

  // the text cut into plain stretches and marked ones, for the mirror
  const pieces = $derived.by(() => {
    const out = [];
    let at = 0;
    for (const [k, i] of issues.entries()) {
      if (i.offset < at) continue;
      if (i.offset > at) out.push({ text: text.slice(at, i.offset) });
      out.push({ text: text.slice(i.offset, i.offset + i.length), issue: i, k });
      at = i.offset + i.length;
    }
    out.push({ text: text.slice(at) });
    return out;
  });
</script>

<section class="card proof">
  <h2>{t('proof.heading')}</h2>
  <p class="engines">
    {#if hasSpell}{t('proof.spell', { name: DICTIONARIES[lang.code][0] })}{:else}{t('proof.noSpell')}{/if} ·
    {#if !hasGrammar}{t('proof.noGrammar')}{:else if grammarEngine === 'local'}{t('proof.grammar.local')}{:else if grammarEngine === 'public'}{t('proof.grammar.public')}{:else}{t('proof.grammar.ready')}{/if}
  </p>
  <textarea rows="8" dir="auto" bind:value={text} oninput={() => { checked = false; keep(); }} placeholder={t('proof.placeholder')}></textarea>
  <div class="bar">
    <button class="check primary" onclick={check} disabled={busy || !text.trim() || (!hasSpell && !hasGrammar)}>{busy ? t('proof.checking') : t('proof.check')}</button>
    {#if hasGrammar}<label title={t('proof.public.title')}><input type="checkbox" bind:checked={allowPublic} onchange={() => { try { storage?.setItem('casus:proof:public', allowPublic ? 'on' : 'off'); } catch { /* not kept */ } }}> {t('proof.public')}</label>{/if}
    {#if toReader}<button class="to-reader" onclick={() => toReader(text)}>{t('proof.toReader')}</button>{/if}
  </div>
  {#if checked}
    <div class="mirror" dir="auto">{#each pieces as p}{#if p.issue}<mark class={p.issue.kind} title={p.issue.message ?? t('proof.misspelt')}>{p.text}</mark>{:else}{p.text}{/if}{/each}</div>
    {#if issues.length === 0}<p class="clean">{t('proof.clean')}</p>{/if}
    <ol class="issues">
      {#each issues as i (i.offset + ':' + i.kind + ':' + (i.rule ?? i.word))}
        <li class="issue" data-kind={i.kind}>
          <span class="tag">{i.kind === 'spelling' ? t('proof.kind.spelling') : (i.category || t('proof.kind.grammar'))}</span>
          <q>{text.slice(i.offset, i.offset + i.length)}</q> {i.kind === 'spelling' ? t('proof.misspelt') : i.message}
          <span class="fixes">{#each i.replacements as r}<button class="fix" onclick={() => apply(i, r)}>{r}</button>{/each}<button class="ignore" onclick={() => ignore(i)}>{t('proof.ignore')}</button></span>
        </li>
      {/each}
    </ol>
  {/if}
  {#if hasGrammar && grammarEngine !== 'local'}
    <details class="local"><summary>{t('proof.local.heading')}</summary><p>{t('proof.local.body')}</p><pre>bash tools/languagetool.sh</pre></details>
  {/if}
</section>

<style>
  .engines { color: var(--ink-2); font-size: 0.9em; margin: 0 0 8px; }
  textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: var(--text-size); padding: 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); }
  .bar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin: 8px 0; }
  button { font: inherit; padding: 6px 14px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); color: var(--ink); cursor: pointer; }
  button.primary { border-color: var(--accent); font-weight: 600; }
  .mirror { white-space: pre-wrap; font-size: var(--text-size); line-height: 1.8; padding: 8px; border: 1px solid var(--line-soft); border-radius: 8px; background: var(--panel-hi); }
  mark { background: none; color: inherit; text-decoration: underline wavy; text-underline-offset: 3px; }
  mark.spelling { text-decoration-color: #d62728; }
  mark.grammar { text-decoration-color: #1f77b4; }
  .issues { padding-left: 1.4em; display: flex; flex-direction: column; gap: 6px; }
  .tag { font-size: 0.8em; padding: 1px 6px; border-radius: 6px; border: 1px solid var(--line); color: var(--ink-2); margin-right: 4px; }
  .issue[data-kind=spelling] .tag { border-color: #d62728; }
  .issue[data-kind=grammar] .tag { border-color: #1f77b4; }
  .fixes { display: inline-flex; flex-wrap: wrap; gap: 4px; margin-left: 6px; }
  .fix { padding: 2px 10px; border-color: var(--accent); }
  .ignore { padding: 2px 10px; color: var(--ink-2); }
  .clean { color: #2e8b57; font-weight: 600; }
  .local { margin-top: 10px; color: var(--ink-2); font-size: 0.92em; }
  pre { background: var(--panel-hi); padding: 6px 10px; border-radius: 6px; overflow-x: auto; }
</style>
