<script>
  import { createLexicon } from '../lib/lexicon.js';
  import { makeFetchShard, loadManifest } from './lib/fetchers.js';

  let status = $state('loading the lexicon…');
  let lexicon = $state(null);

  $effect(() => {
    loadManifest(window.fetch.bind(window))
      .then((manifest) => {
        lexicon = createLexicon({ fetchShard: makeFetchShard(window.fetch.bind(window)), manifest });
        status = `lexicon ready: ${Object.keys(manifest.shards).length} shards, built ${manifest.built}`;
      })
      .catch((e) => { status = `no lexicon: ${e.message} — run python3 tools/build_index.py`; });
  });
</script>

<main>
  <h1>Casus</h1>
  <p>{status}</p>
</main>

<style>
  main { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 16px; }
</style>
