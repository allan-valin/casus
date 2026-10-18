<script>
  import { blockStyle } from '../lib/colors.js';
  let { block, layers, onhover, onopen, lemmaOf = null } = $props();
  const style = $derived(blockStyle(block, layers));
  // the class sub-layer needs one lemma; the case may still be open (rosa nom/abl is one word)
  const oneLemma = $derived(block.candidates.length > 0 && block.candidates.every((c) => String(c.analysis.lemma) === String(block.candidates[0].analysis.lemma)));
</script>

<!-- a div, not a button: the pool's pointer drag must start on it, and a button would swallow pointerdown -->
<div class="pill" class:ambiguous={style.ambiguous} class:pinned={block.pinned} class:unknown={style.unknown}
     style:background={style.fill} style:border-color={style.border} style:border-style={style.borderStyle}
     role="button" tabindex="0" title={style.unknown ? 'not in the dictionary' : 'click: dictionary and readings · drag: move'}
     onmouseenter={() => onhover(block.token.index)} onmouseleave={() => onhover(null)}
     onclick={() => onopen(block)}
     onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onopen(block); } }}>
  <sup class="index">{block.token.index + 1}</sup>
  <span class="surface">{block.token.surface}</span>
  <span class="badge" style:color={style.ambiguous || style.unknown ? '#555' : style.border}>{style.badge}</span>
  {#if style.dots.length}<span class="dots" aria-label="possible cases">{#each style.dots as d}<i class="dot" style:background={d}></i>{/each}</span>{/if}
  {#if layers.classes && oneLemma && lemmaOf}
    {@const r = lemmaOf(block.candidates[0].analysis.lemma)}
    {#if r}<span class="class">{r.pos === 'verb' ? (r.conj ?? '') : [r.decl, r.gender].filter(Boolean).join(' ')}</span>{/if}
  {/if}
</div>

<style>
  .pill { display: inline-flex; align-items: baseline; gap: 5px; border: 2.5px solid; border-radius: 12px;
          padding: 4px 12px; font: inherit; font-size: var(--pill-size); cursor: grab; color: var(--ink); user-select: none; touch-action: none; }
  .pill:focus-visible { outline: 2px solid #246; outline-offset: 1px; }
  .pinned { outline: 2px dotted #222; outline-offset: 2px; }
  .unknown { color: #666; font-style: italic; }
  .index { font-size: 0.6em; opacity: 0.7; }
  .badge { font-size: 0.72em; font-weight: 700; letter-spacing: 0.02em; }
  .dots { display: inline-flex; gap: 2px; align-items: center; align-self: center; }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; border: 1px solid rgba(0,0,0,.25); }
  .class { font-size: 0.65em; opacity: 0.8; border-left: 1px solid rgba(0,0,0,.3); padding-left: 4px; }
</style>
