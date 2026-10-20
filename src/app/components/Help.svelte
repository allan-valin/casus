<script>
  /* Feedback D14: what is on the screen, how to use it, and every resource behind it. */
  import Overlay from './Overlay.svelte';
  import { ui } from '../lib/i18n.svelte.js';
  import { HELP } from '../lib/i18n.help.js';
  let { onclose, view = 'reader' } = $props();
</script>

<Overlay {onclose} label="help" panelClass="help">
  {#if HELP[view]}
  <div class="body" dir="auto">{@html HELP[view][ui.lang] ?? HELP[view].en}</div>
  {:else if ui.lang === 'pt'}
  <div class="body">
    <h3>O que o Casus faz</h3>
    <p>A ordem das palavras em latim é livre, então as que pertencem juntas — um substantivo e seu adjetivo, uma
      preposição e seu objeto — ficam muitas vezes linhas de distância. Quem lê as reúne comparando terminações.
      O Casus põe esse trabalho na tela: o texto fica como está escrito, e as mesmas palavras viram blocos
      coloridos por <b>caso</b>, de modo que a concordância se vê em vez de se deduzir. Ele nunca traduz:
      mostra estrutura.</p>

    <h3>Como usar a página</h3>
    <ol>
      <li><b>Texto.</b> Escolha uma amostra de demonstração ou cole latim, depois aperte <i>Identificar a gramática</i>.</li>
      <li><b>Frases.</b> Cada frase é uma caixa com borda. Clique numa para trabalhar nela.</li>
      <li><b>Blocos.</b> Cada palavra dessa frase é um bloco. <b>Clique</b> num bloco para ver o verbete e as
        leituras que o analisador ainda admite; <b>fixe</b> a leitura em que você acredita e a frase é relida.
        <b>Arraste</b> blocos para reagrupá-los: os outros ficam parados, uma barra mostra onde ele vai cair, e
        ele se move quando você solta. Uma preposição e seu objeto se movem como um bloco colado; ⛓ os descola.
        Passar o mouse sobre uma palavra acende as que concordam com ela.</li>
      <li><b>Organizar.</b> <i>Restaurar a ordem original</i>, <i>agrupar por caso</i> e as ordens SVO, SOV, VSO,
        VOS, OVS, OSV (S = sujeito no nominativo, V = verbo, O = objeto no acusativo) ficam acima dos blocos. O
        numerozinho em cada bloco é sua posição no texto, então nenhum arranjo perde a ordem de leitura.</li>
      <li><b>Legenda.</b> Abaixo dos blocos: o que significa cada cor, borda e etiqueta. A cor nunca é o único
        sinal — a etiqueta de duas letras e o estilo da borda dizem o mesmo.</li>
      <li><b>A ambiguidade é mostrada, nunca adivinhada.</b> Um bloco branco com <b>?</b> tem mais de uma leitura
        possível; os pontos são seus casos possíveis. Essa é a resposta honesta até a frase resolvê-la.</li>
    </ol>
    <p>Seu arranjo e suas fixações são salvos neste navegador automaticamente, por texto. <i>Exportar</i>, no
      alto, baixa um arquivo JSON (para recarregar ou processar) ou Markdown (para ler em outro lugar).</p>

    <h3>Dicionários e recursos</h3>
    <ul class="resources">
      <li><b>WORDS de Whitaker</b> (William Whitaker, domínio público): o léxico latino, todas as formas
        flexionadas, as definições em inglês, a época e a frequência. Gerado offline num índice fragmentado.</li>
      <li><b>Wikcionário em português</b> via Wiktextract (CC BY-SA): as definições em português, onde existem
        (cobertura parcial: vocabulário comum). Licença própria; veja NOTICE.md.</li>
      <li><b>Amostras</b>: César, <i>De bello Gallico</i> 1.1; Cícero, <i>In Catilinam</i> 1.1; a Vulgata,
        Gênesis 1 — trechos curtos em domínio público, procedência em <code>samples/SOURCES.md</code>.</li>
      <li><b>Wiktionary em inglês</b> via Wiktextract (kaikki.org, CC BY-SA): o dicionário de grego antigo (formas, definições, pronúncias) e o IPA e os links do Wikcionário de cada idioma.</li>
      <li><b>Piper</b> (MIT) e a voz <b>Thorsten</b> (CC0): a voz natural opcional do alemão, baixada só quando você aperta Baixar nos ajustes do dicionário.</li>
      <li><b>espeak-ng</b> (GPL-3.0): a voz do botão de áudio quando o navegador não tem uma para o idioma, carregada do jsDelivr na primeira vez que você o aperta.</li>
      <li><b>Svelte</b> e <b>Vite</b> (MIT): a página. O arrastar é do próprio Casus (eventos de ponteiro, sem biblioteca).</li>
      <li><b>Cores</b>: o conjunto Okabe–Ito, seguro para daltonismo, verificado par a par para as três
        deficiências de visão de cor mais comuns.</li>
    </ul>
    <p class="fine">Casus é código aberto (AGPL-3.0), de Allan Valin. Fonte: <code>github.com/allan-valin/casus</code>.</p>
  </div>
  {:else}
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
        <b>Drag</b> blocks to regroup them: the others stay put, a bar shows where it will land, and it moves when
        you let go. A preposition and its object move as one glued chunk; ⛓ unglues them. Hovering a word lights
        the words that agree with it.</li>
      <li><b>Arrange.</b> <i>Restore original order</i>, <i>auto-sort by case</i> and the word orders SVO, SOV, VSO,
        VOS, OVS, OSV (S = subject in the nominative, V = verb, O = object in the accusative) sit above the blocks.
        The small number on each block is its place in the text, so no arrangement loses the reading order.</li>
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
      <li><b>English Wiktionary</b> via Wiktextract (kaikki.org, CC BY-SA): the Ancient Greek dictionary (forms, glosses, pronunciations) and every language's IPA and Wiktionary links.</li>
      <li><b>Piper</b> (MIT) and the <b>Thorsten</b> voice (CC0): the optional natural German voice, downloaded only when you press Download in the dictionary settings.</li>
      <li><b>espeak-ng</b> (GPL-3.0): the speaker button's voice when your browser has none for the language, loaded from jsDelivr the first time you press it.</li>
      <li><b>Svelte</b> and <b>Vite</b> (MIT): the page. The drag-and-drop is Casus' own (pointer events, no library): blocks stay still while you aim, a bar marks the gap, the move happens on release.</li>
      <li><b>Colours</b>: the Okabe–Ito colour-blind-safe set, checked pairwise for the three common colour
        vision deficiencies.</li>
    </ul>
    <p class="fine">Casus is open source (AGPL-3.0), by Allan Valin. Source: <code>github.com/allan-valin/casus</code>.</p>
  </div>
  {/if}
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
