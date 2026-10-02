<script>
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  let items = $state([
    { id: 1, text: 'Caesar' }, { id: 2, text: 'in Galliam', chunk: true }, { id: 3, text: 'magnam' },
    { id: 4, text: 'cum legione', chunk: true }, { id: 5, text: 'venit' }, { id: 6, text: 'senatus' },
    { id: 7, text: 'populus' }, { id: 8, text: 'que' }, { id: 9, text: 'Romanus' },
  ]);
  const flipDurationMs = 150;
  function handle(e) { items = e.detail.items; }
</script>
<div class="pool" use:dndzone={{ items, flipDurationMs }} onconsider={handle} onfinalize={handle}>
  {#each items as item (item.id)}
    <div class="pill" class:chunk={item.chunk} data-text={item.text} animate:flip={{ duration: flipDurationMs }}>{item.text}</div>
  {/each}
</div>
