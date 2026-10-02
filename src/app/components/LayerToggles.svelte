<script>
  /* Spec §7.2: every layer toggles independently; the class sub-layer is off by default. */
  let { reader } = $props();
</script>

<fieldset class="layers">
  <legend>layers</legend>
  <label><input type="checkbox" bind:checked={reader.layers.nominal}> nominal</label>
  <label><input type="checkbox" bind:checked={reader.layers.verb}> verb</label>
  <label><input type="checkbox" bind:checked={reader.layers.function}> function</label>
  <label><input type="checkbox" bind:checked={reader.layers.classes}> class</label>
</fieldset>

<style>
  .layers { display: inline-flex; gap: 10px; border: 1px solid #ccc; border-radius: 6px; padding: 4px 10px; }
</style>
