<script>
  /*
   * The source text, read-only, never reordered (spec §6). Each sentence is a bordered,
   * clickable box (feedback D11). The selected sentence is rendered from the reader's blocks
   * and their offsets, so the words carry the same indices as the pills and the punctuation
   * between them is the original text, untouched.
   */
  import { t } from '../lib/i18n.svelte.js';
  import { displayForm } from '../lib/entry.js';
  let { reader, hovered = null, partners = new Set() } = $props();

  // marks supplied by the dictionary for unaccented input, shown as ruby over the word
  const supplied = $derived(reader.layers.marks === false ? new Map() : new Map(reader.blocks
    .map((b) => [b.token.index, [...new Set(b.candidates.map((c) => c.analysis.marked).filter(Boolean))]])
    .filter(([, s]) => s.length)
    // the text pane gives one spelling (the pill lists them all): one when it is certain, else the first and …
    .map(([i, s]) => [i, s.length === 1 ? displayForm(s[0]) : `${displayForm(s[0])}…`])));

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
          {#if piece.index !== undefined}{@const sup = supplied.get(piece.index)}<span class="word" class:hot={piece.index === hovered} class:hot-partner={piece.index !== hovered && partners.has(piece.index)}>{#if sup}<ruby>{piece.text}<rt class="supplied">{sup}</rt></ruby>{:else}{piece.text}{/if}</span>{:else}{piece.text}{/if}
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
  rt.supplied { color: #6b4e9b; font-size: 0.62em; font-family: system-ui, sans-serif; }
  .hot-partner { background: #ffe58a; border-radius: 3px; }
</style>
