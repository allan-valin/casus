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

  // non-Latin scripts: every word in Latin letters, small, under it (Allan, 2026-10-18); the selected sentence
  // romanises the dictionary's spellings (so a missing breathing still gives its h), the others the text as typed
  const romanize = $derived(reader.layers.roman === false ? null : (reader.lang?.script?.romanize ?? null));
  // a script without spaces (Japanese): words come from the blocks, which carry furigana and romaji, and a small
  // gap follows each particle and each verb or adjective form, so the grammar markers stand out (Allan, 2026-10-18)
  const unspaced = $derived(reader.lang?.script?.spaced === false);
  const byIndex = $derived(new Map(reader.blocks.map((b) => [b.token.index, b])));
  const GAP = new Set(['particle', 'verb', 'adj', 'aux']);
  const gapAfter = (i) => { const b = byIndex.get(i); return !!b && b.candidates.length > 0 && b.candidates.every((c) => GAP.has(c.analysis.pos)); };
  const furiOf = (i) => (reader.layers.furigana === false ? null : byIndex.get(i)?.furi ?? null);
  const spellings = $derived(new Map(reader.blocks.map((b) => [b.token.index, [...new Set(b.candidates.map((c) => c.analysis.marked).filter(Boolean))]])));
  function romanOf(piece) {
    if (byIndex.get(piece.index)?.roman !== undefined) return byIndex.get(piece.index).roman;
    const s = spellings.get(piece.index);
    return [...new Set((s?.length ? s : [piece.text]).map(romanize))].join(' / ');
  }
  /** an unselected sentence as words and the text between them */
  function words(text) {
    const out = [];
    let at = 0;
    for (const m of text.matchAll(/[\p{L}\p{M}]+/gu)) {
      if (m.index > at) out.push({ text: text.slice(at, m.index) });
      out.push({ text: m[0], word: true });
      at = m.index + m[0].length;
    }
    if (at < text.length) out.push({ text: text.slice(at) });
    return out;
  }

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

<div class="text" class:romanized={!!romanize}>
  {#each reader.sentences as sentence, i (sentence.start)}
    <span class="sentence" class:dimmed={i !== reader.selected} class:current={i === reader.selected} data-index={i}
          role="button" tabindex="0" title={i === reader.selected ? t('textpane.current') : t('textpane.other')}
          onclick={() => reader.select(i)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reader.select(i); } }}>
      {#if i === reader.selected}
        {#each pieces(sentence) as piece}
          {#if piece.index !== undefined}{@const sup = supplied.get(piece.index)}{@const fu = furiOf(piece.index)}<span class="word" class:gap={unspaced && gapAfter(piece.index)} class:hot={piece.index === hovered} class:hot-partner={piece.index !== hovered && partners.has(piece.index)}>{#if romanize}<span class="ilg">{#if fu}<span>{#each fu as [t, r]}{#if r}<ruby>{t}<rt class="furi">{r}</rt></ruby>{:else}{t}{/if}{/each}</span>{:else if sup}<ruby>{piece.text}<rt class="supplied">{sup}</rt></ruby>{:else}{piece.text}{/if}<span class="roman">{romanOf(piece)}</span></span>{:else if fu}{#each fu as [t, r]}{#if r}<ruby>{t}<rt class="furi">{r}</rt></ruby>{:else}{t}{/if}{/each}{:else if sup}<ruby>{piece.text}<rt class="supplied">{sup}</rt></ruby>{:else}{piece.text}{/if}</span>{:else}{piece.text}{/if}
        {/each}
      {:else if romanize && !unspaced}
        {#each words(sentence.text) as w}{#if w.word}<span class="ilg">{w.text}<span class="roman">{romanize(w.text)}</span></span>{:else}{w.text}{/if}{/each}
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
  .ilg { display: inline-flex; flex-direction: column; align-items: center; line-height: 1.25; }   /* baseline = the word's */
  .text.romanized { line-height: 3; }
  .text.romanized .sentence { padding-top: 0.6em; padding-bottom: 0.9em; }
  .roman { font-size: 0.6em; font-style: italic; font-family: system-ui, sans-serif; color: var(--ink-2); line-height: 1.1; }
  .word.gap { margin-right: 0.45em; }
  rt.furi { font-size: 0.55em; color: var(--ink-2); font-family: system-ui, sans-serif; }
  rt.supplied { color: #6b4e9b; font-size: 0.62em; font-family: system-ui, sans-serif; }
  .hot-partner { background: #ffe58a; border-radius: 3px; }
</style>
