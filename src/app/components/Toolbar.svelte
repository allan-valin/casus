<script>
  import { ERAS } from '../lib/era.js';
  import { toJSON, toMarkdown } from '../lib/exporters.js';
  import LayerToggles from './LayerToggles.svelte';
  let { reader, onexport } = $props();
</script>

<div class="toolbar">
  <LayerToggles {reader} />
  <label>era
    <select class="era" bind:value={reader.era}>
      {#each ERAS as e (e.id)}<option value={e.id}>{e.label}</option>{/each}
    </select>
  </label>
  <label>gloss
    <select class="gloss" bind:value={reader.glossLang}>
      <option value="en">English</option>
      <option value="pt">Português</option>
    </select>
  </label>
  <button class="export-json" onclick={() => onexport('json', toJSON(reader))}>Export JSON</button>
  <button class="export-md" onclick={() => onexport('md', toMarkdown(reader))}>Export Markdown</button>
</div>

<style>
  .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 8px 0; }
</style>
