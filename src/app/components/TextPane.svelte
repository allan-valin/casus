<script>
  /*
   * The source text, read-only, never reordered (spec §6). Each sentence is a bordered,
   * clickable box (feedback D11). The selected sentence is rendered from the reader's blocks
   * and their offsets, so the words carry the same indices as the pills and the punctuation
   * between them is the original text, untouched.
   */
  import { t } from '../lib/i18n.svelte.js';
  let { reader, hovered = null, partners = new Set() } = $props();

  function pieces(sentence) {
    const out = [];
    let at = 0;
    for (const block of reader.blocks) {
      const { start, end, surface, index } = block.token;
      if (start > at) out.push({ text: sentence.text.slice(at, start) });
      out.push({ text: surface, index });
      at = end;
    }
    if (at < sentence.text.length) out.push({ text: sentence.text.slice(at) });
    return out;
  }
</script>

<div class="text">
  {#each reader.sentences as sentence, i (sentence.start)}
    <span class="sentence" class:dimmed={i !== reader.selected} class:current={i === reader.selected} data-index={i}
          role="button" tabindex="0" title={i === reader.selected ? t('textpane.current') : t('textpane.other')}
          onclick={() => reader.select(i)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reader.select(i); } }}>
      {#if i === reader.selected}
        {#each pieces(sentence) as piece}
          {#if piece.index !== undefined}<span class="word" class:hot={piece.index === hovered} class:hot-partner={piece.index !== hovered && partners.has(piece.index)}>{piece.text}</span>{:else}{piece.text}{/if}
        {/each}
      {:else}
        {sentence.text}
      {/if}
    </span>
    {' '}
  {/each}
</div>

<style>
  .text { counter-reset: sentence; line-height: 2; font-size: var(--text-size); font-family: Georgia, serif; }
  .sentence { cursor: pointer; border: 1.5px solid var(--line); border-radius: 6px; padding: 2px 6px; margin: 2px 0; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone; background: var(--panel); }
  .sentence:hover { border-color: var(--accent); }
  .current { border-color: var(--accent); border-width: 2px; background: var(--panel-hi); }
  .dimmed { opacity: 0.6; }
  .sentence::before { counter-increment: sentence; content: counter(sentence); font-size: 0.6em; color: var(--muted); margin-right: 4px; vertical-align: super; }
  .hot { background: color-mix(in srgb, var(--accent) 28%, white); outline: 2px solid var(--accent); border-radius: 3px; }
  .hot-partner { background: #ffe58a; border-radius: 3px; }
</style>
