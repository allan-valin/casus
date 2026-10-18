<script>
  import { blockStyle as latinBlockStyle } from '../lib/colors.js';
  import { t } from '../lib/i18n.svelte.js';
  import { suppliedLabel, displayForm } from '../lib/entry.js';
  let { block, layers, onhover, onopen, lemmaOf = null, colors = null, showArticle = false, romanize = null } = $props();
  // German: every noun shows its article, the mark that decides its adjective endings (de.md §2)
  const ARTICLE = { m: 'der', f: 'die', n: 'das' };
  const article = $derived.by(() => {
    if (!showArticle) return '';
    // only when the word can only be a noun (sentence-initial Er/Ich also read as pronouns: review I4)
    const nouns = block.candidates.filter((c) => c.analysis.pos === 'noun');
    if (!nouns.length || nouns.length !== block.candidates.length) return '';
    if (nouns.every((c) => c.analysis.number === 'pl')) return 'die (Pl.)';
    // singular readings without a known gender get no article rather than a wrong one (review I2)
    return [...new Set(nouns.filter((c) => c.analysis.number !== 'pl').map((c) => ARTICLE[c.analysis.gender]).filter(Boolean))].join(' / ');
  });
  const style = $derived((colors?.blockStyle ?? latinBlockStyle)(block, layers));
  // the class sub-layer needs one lemma; the case may still be open (rosa nom/abl is one word)
  // marks the input lacked, supplied by the dictionary (languages design §7): every distinct spelling
  const supplied = $derived(layers.marks === false ? [] : [...new Set(block.candidates.map((c) => c.analysis.marked).filter(Boolean))]);
  // non-Latin scripts: the word in Latin letters, small, under it (Allan, 2026-10-18); from the dictionary's
  // spelling when the input lacked marks and only one spelling fits, so breathings (h) are not lost
  const roman = $derived(!romanize || layers.roman === false ? '' : [...new Set((supplied.length ? supplied : [block.token.surface]).map(romanize))].join(' / '));
  const oneLemma = $derived(block.candidates.length > 0 && block.candidates.every((c) => String(c.analysis.lemma) === String(block.candidates[0].analysis.lemma)));
</script>

<!-- a div, not a button: the pool's pointer drag must start on it, and a button would swallow pointerdown -->
<div class="pill" class:ambiguous={style.ambiguous} class:pinned={block.pinned} class:unknown={style.unknown}
     style:background={style.fill} style:border-color={style.border} style:border-style={style.borderStyle}
     role="button" tabindex="0" title={style.unknown ? t('block.unknown') : t('block.title')}
     onmouseenter={() => onhover(block.token.index)} onmouseleave={() => onhover(null)}
     onclick={() => onopen(block)}
     onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onopen(block); } }}>
  <sup class="index">{block.token.index + 1}</sup>
  <span class="word-stack">{#if article}<span class="article" title={t('block.article')}>{article}</span>{/if}{#if supplied.length}<span class="reading supplied" title={`${t('block.supplied')}: ${supplied.map(displayForm).join(' / ')}`}>{suppliedLabel(supplied)}</span>{/if}<span class="surface">{#if block.parts}{#each block.parts as part, k}<span class="root" class:root-b={k % 2 === 1} title={t('block.compound')}>{part}</span>{/each}{:else}{block.token.surface}{/if}</span>{#if roman}<span class="roman" title={t('block.roman')}>{roman}</span>{/if}</span>
  <span class="badge" style:color={style.ambiguous || style.unknown ? '#555' : style.border}>{style.badge}</span>
  {#if style.dots.length}<span class="dots" aria-label="possible cases">{#each style.dots as d}<i class="dot" style:background={d}></i>{/each}</span>{/if}
  {#if layers.classes && oneLemma && lemmaOf}
    {@const r = lemmaOf(block.candidates[0].analysis.lemma)}
    {#if r}<span class="class">{r.pos === 'verb' ? (r.conj ?? '') : [r.decl, r.gender].filter(Boolean).join(' ')}</span>{/if}
  {/if}
</div>{#if block.token.trail}<span class="trail" aria-hidden="true">{block.token.trail}</span>{/if}

<style>
  .pill { display: inline-flex; align-items: baseline; gap: 5px; border: 2.5px solid; border-radius: 12px;
          padding: 4px 12px; font: inherit; font-size: var(--pill-size); cursor: grab; color: var(--ink); user-select: none; touch-action: none; }
  .pill:focus-visible { outline: 2px solid #246; outline-offset: 1px; }
  .pinned { outline: 2px dotted #222; outline-offset: 2px; }
  .unknown { color: #666; font-style: italic; }
  .index { font-size: 0.6em; opacity: 0.7; }
  .trail { font-family: Georgia, serif; font-size: 1.3em; font-weight: 700; color: var(--ink); margin-left: 2px; align-self: flex-end; }
  .word-stack { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.15; }
  .roman { font-size: 0.62em; color: var(--ink-2); font-style: italic; letter-spacing: 0.02em; margin-top: 1px; }
  .root { color: var(--ink); }
  .root-b { color: #6b4e9b; }
  .article { font-size: 0.72em; font-weight: 600; color: var(--ink-2); letter-spacing: 0.02em; }
  .reading { font-size: 0.82em; font-weight: 600; letter-spacing: 0.02em; }
  .reading.supplied { color: #6b4e9b; border-bottom: 1px dotted currentColor; }
  .badge { font-size: 0.72em; font-weight: 700; letter-spacing: 0.02em; }
  .dots { display: inline-flex; gap: 2px; align-items: center; align-self: center; }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,.25); }
  .class { font-size: 0.65em; opacity: 0.8; border-left: 1px solid rgba(0,0,0,.3); padding-left: 4px; }
</style>
