/*
 * Indonesian (2026-10-21): no cases; the colours are the roles from word order (subject – verb – object), on the shared
 * Romance rules, with kepada / untuk + noun the indirect object. splitWords takes the clitics written onto a word —
 * -nya (his, her, its; the), -ku, -mu (my, your), -lah, -kah, -pun — when the word itself is unknown, and reads a
 * reduplicated plural (anak-anak) as its base word.
 */
import { makeRoleStage, makeClosedStage, prep, pron } from '../romance.js';

export const roleStage = makeRoleStage({ dative: ['kepada', 'untuk', 'bagi'], unaccusative: /^$/ });

const P = (w, person, number) => [pron(w, { person, number })];
export const closedStage = makeClosedStage({
  aku: P('aku', '1', 'sg'), saya: P('saya', '1', 'sg'), kamu: P('kamu', '2', 'sg'), anda: P('anda', '2', 'sg'), engkau: P('engkau', '2', 'sg'),
  dia: P('dia', '3', 'sg'), ia: P('ia', '3', 'sg'), beliau: P('beliau', '3', 'sg'), kami: P('kami', '1', 'pl'), kita: P('kita', '1', 'pl'),
  kalian: P('kalian', '2', 'pl'), mereka: P('mereka', '3', 'pl'),
  di: [prep('di')], ke: [prep('ke')], dari: [prep('dari')], dengan: [prep('dengan')], pada: [prep('pada')], kepada: [prep('kepada')],
  nya: [{ lemma: 'nya', pos: 'det', person: '3' }], ku: [{ lemma: 'ku', pos: 'det', person: '1' }], mu: [{ lemma: 'mu', pos: 'det', person: '2' }],
  lah: [{ lemma: 'lah', pos: 'particle' }], kah: [{ lemma: 'kah', pos: 'particle' }], pun: [{ lemma: 'pun', pos: 'particle' }],
  untuk: [prep('untuk')], bagi: [prep('bagi')], dalam: [prep('dalam')], oleh: [prep('oleh')], tentang: [prep('tentang')],
});

const CLITICS = [['nya', 'nya'], ['ku', 'ku'], ['mu', 'mu'], ['lah', 'lah'], ['kah', 'kah'], ['pun', 'pun']];
export async function splitWords(tokens, lexicon) {
  const words = tokens.filter((t) => t.kind === 'word');
  const keys = new Set(words.map((t) => t.key));
  for (const t of words) {
    for (const [c] of CLITICS) if (t.key.endsWith(c) && t.key.length > c.length + 2) keys.add(t.key.slice(0, -c.length));
    const m = t.key.match(/^(.+)-\1$/);
    if (m) keys.add(m[1]);
  }
  const found = await lexicon.lookupAll([...keys]);
  const known = (k) => (found.get(k) ?? []).length > 0;
  const out = [];
  for (const t of tokens) {
    if (t.kind !== 'word' || known(t.key)) { out.push(t); continue; }
    const red = t.key.match(/^(.+)-\1$/);
    if (red && known(red[1])) { out.push({ ...t, key: red[1] }); continue; }
    const hit = CLITICS.find(([c]) => t.key.endsWith(c) && known(t.key.slice(0, -c.length)));
    if (!hit) { out.push(t); continue; }
    const cut = t.surface.length - hit[0].length;
    out.push({ ...t, surface: t.surface.slice(0, cut), key: t.key.slice(0, -hit[0].length), end: t.start + cut });
    out.push({ surface: t.surface.slice(cut), kind: 'word', key: hit[1], start: t.start + cut, end: t.end, enclitic: null, proclitic: false });
  }
  return out;
}
