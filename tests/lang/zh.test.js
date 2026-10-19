// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { getLanguage } from '../../src/lang/registry.js';
import { createState } from '../../src/lib/state.js';
import Block from '../../src/app/components/Block.svelte';

const zh = getLanguage('zh');
const W = (lemma, pos, reading) => ({ lemma, pos, reading });
const LEX = { 我: [W('wo', 'pron', 'wǒ')], 在: [W('zai', 'prep', 'zài'), W('zai2', 'verb', 'zài')], 学校: [W('xx', 'noun', 'xuéxiào')], 学: [W('xue', 'verb', 'xué')],
  校: [W('xiao', 'noun', 'xiào')], 吃: [W('chi', 'verb', 'chī')], 饭: [W('fan', 'noun', 'fàn')], 的: [W('de', 'particle', 'de')], 朋友: [W('py', 'noun', 'péngyou')],
  把: [W('ba', 'prep', 'bǎ')], 书: [W('shu', 'noun', 'shū')], 看: [W('kan', 'verb', 'kàn')], 完: [W('wan', 'verb', 'wán')], 了: [W('le', 'particle', 'le')] };
const lexicon = { lookupAll: async (keys) => new Map(keys.map((k) => [k, LEX[k] ?? []])) };
async function read(t) { const s = createState({ text: t, lexicon, lang: zh }); await s.load(); return s.blocks(); }

describe('Chinese', () => {
  it('splits into words and puts pinyin under each, syllables with their tones', async () => {
    const b = await read('我在学校吃饭。');
    expect(b.map((x) => x.token.surface)).toEqual(['我', '在', '学校', '吃', '饭']);
    expect(b[2].roman).toBe('xuéxiào');
    expect(b[2].romanParts).toEqual([['xué', 2], ['xiào', 4]]);
  });
  it('a preposition gives the noun after it its role (在 place), 的 makes the word before it the possessor', async () => {
    const b = await read('我在学校吃饭。');
    expect(b[1].candidates.map((c) => c.analysis.pos)).toEqual(['prep']);
    expect(b[2].candidates[0].analysis.case).toBe('loc');
    const c = await read('我的朋友。');
    expect(c[0].candidates[0].analysis.case).toBe('gen');
  });
  it('把 brings the object before the verb: 把书 is the object', async () => {
    const b = await read('我把书看完了。');
    expect(b.find((x) => x.token.surface === '书').candidates[0].analysis.case).toBe('obj');
  });
  it('the block colours each pinyin syllable by its tone', () => {
    const block = { token: { index: 0, surface: '学校', key: '学校' }, roman: 'xuéxiào', romanParts: [['xué', 2], ['xiào', 4]], candidates: [{ analysis: { lemma: 'x', pos: 'noun' }, reasons: [], links: [] }], pinned: null };
    const { container } = render(Block, { block, layers: { nominal: true, verb: true, function: true, roman: true }, onhover: () => {}, onopen: () => {}, romanize: (s) => s });
    expect([...container.querySelectorAll('.roman .tone')].map((s) => s.className.match(/tone-(\d)/)[1])).toEqual(['2', '4']);
  });
});

describe('Chinese on real-data cases', () => {
  const L2 = { 我: [W('wo', 'pron', 'wǒ')], 在: [W('zai', 'verb', 'zài')], 在学: [W('zx', 'verb', 'zàixué')], 学校: [W('xx', 'noun', 'xuéxiào')], 校: [W('xiao', 'noun', 'xiào')],
    学: [W('xue', 'verb', 'xué')], 吃饭: [W('cf', 'verb', 'chīfàn')], 他: [W('ta', 'pron', 'tā')], 把: [W('ba', 'verb', 'bǎ')], 书: [W('shu', 'noun', 'shū')],
    看完: [W('kw', 'verb', 'kànwán')], 了: [W('le', 'particle', 'liǎo')], 的: [W('de', 'particle', 'dì')], 朋友: [W('py', 'noun', 'péngyou')] };
  const ranks = { 我: 2, 在: 6, 学校: 500, 吃饭: 900, 他: 7, 把: 60, 书: 400, 了: 4, 的: 1 };
  const lx = { lookupAll: async (keys) => new Map(keys.map((k) => [k, L2[k] ?? []])), file: async (n) => (n === 'wordfreq.json' ? ranks : null) };
  const read2 = async (t) => { const s = createState({ text: t, lexicon: lx, lang: zh }); await s.load(); return s.blocks(); };
  it('a tie in word splitting goes to the commoner words: 在 + 学校, not 在学 + 校', async () => {
    expect((await read2('我在学校吃饭。')).map((b) => b.token.surface)).toEqual(['我', '在', '学校', '吃饭']);
  });
  it('把 is the preposition before its object whatever the dictionary calls it; particles read in the neutral tone', async () => {
    const b = await read2('他把书看完了。');
    expect(b[1].candidates.map((c) => c.analysis.pos)).toEqual(['prep']);
    expect(b[2].candidates[0].analysis.case).toBe('obj');
    expect(b[4].roman).toBe('le');
    expect((await read2('我的朋友。'))[1].roman).toBe('de');
  });
});
