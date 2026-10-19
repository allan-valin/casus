/* Russian prepositions and the cases they govern (Wade, A Comprehensive Russian Grammar, ch. 10), by lower-case key. */
export const GOVERNMENT = {
  в: ['acc', 'pre'], во: ['acc', 'pre'], на: ['acc', 'pre'], с: ['gen', 'ins', 'acc'], со: ['gen', 'ins', 'acc'], к: ['dat'], ко: ['dat'],
  от: ['gen'], до: ['gen'], из: ['gen'], у: ['gen'], без: ['gen'], для: ['gen'], о: ['pre', 'acc'], об: ['pre', 'acc'], обо: ['pre', 'acc'],
  по: ['dat', 'acc', 'pre'], за: ['acc', 'ins'], под: ['acc', 'ins'], над: ['ins'], перед: ['ins'], между: ['ins', 'gen'], через: ['acc'],
  про: ['acc'], при: ['pre'], около: ['gen'], после: ['gen'], вокруг: ['gen'], кроме: ['gen'], среди: ['gen'], 'из-за': ['gen'],
  'из-под': ['gen'], против: ['gen'], возле: ['gen'], мимо: ['gen'], вместо: ['gen'], сквозь: ['acc'], благодаря: ['dat'],
};
