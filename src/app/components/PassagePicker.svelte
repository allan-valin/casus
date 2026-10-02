<script>
  /* v1 input (spec §10.1): paste, or one of the bundled passages. */
  let { samples = [], onchoose, fetchImpl } = $props();
  let pasted = $state('');
  async function choose(sample) {
    const res = await fetchImpl(`/samples/${sample.file}`);
    if (!res.ok) return;
    onchoose((await res.text()).trim(), sample.era ?? null);
  }
</script>

<div class="picker">
  <textarea rows="4" placeholder="Paste Latin here…" bind:value={pasted}></textarea>
  <button class="read" onclick={() => pasted.trim() && onchoose(pasted.trim(), null)}>Read</button>
  <span class="or">or a bundled passage:</span>
  {#each samples as s (s.id)}
    <button class="sample" onclick={() => choose(s)}>{s.title}</button>
  {/each}
</div>

<style>
  .picker { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  textarea { flex: 1 1 100%; font-family: Georgia, serif; font-size: 1rem; }
  .or { color: #666; }
</style>
