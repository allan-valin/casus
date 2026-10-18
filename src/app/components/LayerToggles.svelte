<script>
  /* Spec §7.2: every layer toggles independently; the class sub-layer is off by default. */
  let { reader } = $props();
</script>

<fieldset class="layers">
  <legend>Colour these word kinds</legend>
  <label title="nouns, adjectives, pronouns, participles: coloured by case"><input type="checkbox" bind:checked={reader.layers.nominal}> nouns &amp; adjectives</label>
  <label title="finite verbs: dark border, person·number·tense badge"><input type="checkbox" bind:checked={reader.layers.verb}> verbs</label>
  <label title="prepositions (hue of the governed case), conjunctions, particles"><input type="checkbox" bind:checked={reader.layers.function}> function words</label>
  <label title="adds declension and gender (nouns) or conjugation (verbs) to each block"><input type="checkbox" bind:checked={reader.layers.classes}> declension / conjugation</label>
</fieldset>

<style>
  .layers { display: inline-flex; flex-wrap: wrap; gap: 6px 14px; border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px 8px; margin: 0; background: var(--panel); }
  legend { color: var(--ink-2); font-size: 0.85rem; padding: 0 4px; }
  label { white-space: nowrap; }
</style>
