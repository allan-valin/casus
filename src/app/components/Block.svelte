<script>
  import { blockStyle } from '../lib/colors.js';
  let { block, layers, onhover, onopen, lemmaOf = null } = $props();
  const style = $derived(blockStyle(block, layers));
  // the class sub-layer needs one lemma; the case may still be open (rosa nom/abl is one word)
  const oneLemma = $derived(block.candidates.length > 0 && block.candidates.every((c) => String(c.analysis.lemma) === String(block.candidates[0].analysis.lemma)));
</script>

<!-- a div, not a button: svelte-dnd-action will not start a drag on an element with a .value -->
<div class="pill" class:striped={style.striped} class:pinned={block.pinned} class:unknown={style.unknown}
     style:background={style.background} role="button" tabindex="0"
     onmouseenter={() => onhover(block.token.index)} onmouseleave={() => onhover(null)}
     onclick={() => onopen(block)}
     onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onopen(block); } }}>
  <sup class="index">{block.token.index + 1}</sup>
  <span class="surface">{block.token.surface}</span>
  <span class="badge">{style.badge}</span>
  {#if layers.classes && oneLemma && lemmaOf}
    {@const r = lemmaOf(block.candidates[0].analysis.lemma)}
    {#if r}<span class="class">{r.pos === 'verb' ? (r.conj ?? '') : [r.decl, r.gender].filter(Boolean).join(' ')}</span>{/if}
  {/if}
</div>

<style>
  .pill { display: inline-flex; align-items: baseline; gap: 4px; border: 2px solid transparent; border-radius: 12px;
          padding: 2px 10px; font: inherit; cursor: grab; color: #111; user-select: none; }
  .pill:focus-visible { outline: 2px solid #246; outline-offset: 1px; }
  .pinned { border-style: dotted; border-color: #222; }
  .unknown { color: #666; font-style: italic; }
  .index { font-size: 0.6em; opacity: 0.7; }
  .badge { font-size: 0.7em; font-weight: 700; letter-spacing: 0.02em; opacity: 0.85; }
  .class { font-size: 0.65em; opacity: 0.8; border-left: 1px solid rgba(0,0,0,.3); padding-left: 4px; }
</style>
