<script>
  /* Feedback D14: what is on the screen, how to use it, and every resource behind it. */
  import Overlay from './Overlay.svelte';
  let { onclose } = $props();
</script>

<Overlay {onclose} label="help" panelClass="help">
  <div class="body">
    <h3>What Casus does</h3>
    <p>Latin word order is free, so the words that belong together — a noun and its adjective, a preposition and
      its object — are often lines apart. A reader reassembles them by matching endings. Casus puts that work
      on the screen: the text stays as written, and the same words become blocks coloured by <b>case</b>, so
      agreement is seen rather than deduced. It never translates: it shows structure.</p>

    <h3>How to use the page</h3>
    <ol>
      <li><b>Text.</b> Pick a demonstration sample or paste Latin, then press <i>Identify grammar</i>.</li>
      <li><b>Sentences.</b> Each sentence is a bordered box. Click one to work on it.</li>
      <li><b>Blocks.</b> Every word of that sentence is a block. <b>Click</b> a block for its dictionary entry
        and the readings the parser still allows; <b>pin</b> the reading you believe and the sentence re-reads.
        <b>Drag</b> blocks to regroup them (neighbours slide aside). A preposition and its object move as one
        glued chunk; ⛓ unglues them. Hovering a word lights the words that agree with it.</li>
      <li><b>Arrange.</b> <i>Restore original order</i> and <i>auto-sort by case</i> sit above the blocks. The small
        number on each block is its place in the text, so no arrangement loses the reading order.</li>
      <li><b>Legend.</b> Below the blocks: what each colour, border and badge means. Colour is never the only
        cue — the two-letter badge and the border style say the same thing.</li>
      <li><b>Ambiguity is shown, never guessed.</b> A white block with <b>?</b> has more than one possible
        reading; the dots are its possible cases. That is the honest answer until the sentence settles it.</li>
    </ol>
    <p>Your arrangement and pins are saved in this browser automatically, per text. <i>Export</i> at the top
      downloads them as JSON (to reload or process) or Markdown (to read elsewhere).</p>

    <h3>Dictionaries and resources</h3>
    <ul class="resources">
      <li><b>Whitaker's WORDS</b> (William Whitaker, public domain): the Latin lexicon, every inflected form,
        the English glosses, the period (age) and frequency tags. Built offline into a sharded index.</li>
      <li><b>Portuguese Wiktionary</b> via Wiktextract (CC BY-SA): the Portuguese glosses, where they exist.
        Separately licensed; see NOTICE.md.</li>
      <li><b>Sample passages</b>: Caesar, <i>De bello Gallico</i> 1.1; Cicero, <i>In Catilinam</i> 1.1; the Vulgate,
        Genesis 1 — short public-domain excerpts, provenance in <code>samples/SOURCES.md</code>.</li>
      <li><b>Svelte</b> and <b>Vite</b> (MIT): the page. The drag-and-drop is Casus' own (pointer events, no library): blocks stay still while you aim, a bar marks the gap, the move happens on release.</li>
      <li><b>Colours</b>: the Okabe–Ito colour-blind-safe set, checked pairwise for the three common colour
        vision deficiencies.</li>
    </ul>
    <p class="fine">Casus is open source (AGPL-3.0), by Allan Valin. Source: <code>github.com/allan-valin/casus</code>.</p>
  </div>
</Overlay>

<style>
  h3 { margin: 10px 0 6px; font-family: Georgia, serif; font-size: 1.15rem; }
  h3:first-child { margin-top: 0; }
  p, li { line-height: 1.5; }
  ol, ul { padding-left: 20px; }
  li { margin: 4px 0; }
  .fine { color: var(--muted); font-size: 0.85rem; }
  code { font-size: 0.9em; }
</style>
