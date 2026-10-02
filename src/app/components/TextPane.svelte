<script>
  /*
   * The left pane: the source text, read-only, never reordered (spec §6).
   * The selected sentence is rendered from the reader's blocks and their
   * offsets, so the words carry the same indices as the pills on the right
   * and the punctuation between them is the original text, untouched.
   */
  let { reader, hovered = null } = $props();

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
    <span class="sentence" class:dimmed={i !== reader.selected} data-index={i}
          role="button" tabindex="0"
          onclick={() => reader.select(i)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reader.select(i); } }}>
      {#if i === reader.selected}
        {#each pieces(sentence) as piece}
          {#if piece.index !== undefined}<span class="word" class:hot={piece.index === hovered}>{piece.text}</span>{:else}{piece.text}{/if}
        {/each}
      {:else}
        {sentence.text}
      {/if}
    </span>
    {' '}
  {/each}
</div>

<style>
  .text { line-height: 1.8; font-size: 1.1rem; font-family: Georgia, serif; }
  .sentence { cursor: pointer; border-radius: 4px; padding: 0 2px; }
  .dimmed { opacity: 0.4; }
  .hot { background: #ffe58a; border-radius: 3px; }
</style>
