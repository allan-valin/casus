/* The characters drill: 100 of the commonest Chinese characters (simplified, with the traditional form where it
 * differs, as the "capital" row), answered by pinyin — with tone marks, tone numbers (wo3) or none. */
import { makeAlphabetGame } from '../../lib/alphabet.js';

const LIST = [
  ['的', '的', 'de'], ['一', '一', 'yī'], ['是', '是', 'shì'], ['不', '不', 'bù'], ['了', '了', 'le'], ['人', '人', 'rén'], ['我', '我', 'wǒ'], ['在', '在', 'zài'], ['有', '有', 'yǒu'], ['他', '他', 'tā'],
  ['这', '這', 'zhè'], ['中', '中', 'zhōng'], ['大', '大', 'dà'], ['来', '來', 'lái'], ['上', '上', 'shàng'], ['国', '國', 'guó'], ['个', '個', 'gè'], ['到', '到', 'dào'], ['说', '說', 'shuō'], ['们', '們', 'men'],
  ['为', '為', 'wèi'], ['子', '子', 'zǐ'], ['和', '和', 'hé'], ['你', '你', 'nǐ'], ['地', '地', 'dì'], ['出', '出', 'chū'], ['道', '道', 'dào'], ['也', '也', 'yě'], ['时', '時', 'shí'], ['年', '年', 'nián'],
  ['得', '得', 'de'], ['就', '就', 'jiù'], ['那', '那', 'nà'], ['要', '要', 'yào'], ['下', '下', 'xià'], ['以', '以', 'yǐ'], ['生', '生', 'shēng'], ['会', '會', 'huì'], ['自', '自', 'zì'], ['着', '著', 'zhe'],
  ['去', '去', 'qù'], ['之', '之', 'zhī'], ['过', '過', 'guò'], ['家', '家', 'jiā'], ['学', '學', 'xué'], ['对', '對', 'duì'], ['可', '可', 'kě'], ['她', '她', 'tā'], ['里', '裡', 'lǐ'], ['后', '後', 'hòu'],
  ['小', '小', 'xiǎo'], ['么', '麼', 'me'], ['心', '心', 'xīn'], ['多', '多', 'duō'], ['天', '天', 'tiān'], ['而', '而', 'ér'], ['能', '能', 'néng'], ['好', '好', 'hǎo'], ['都', '都', 'dōu'], ['然', '然', 'rán'],
  ['没', '沒', 'méi'], ['日', '日', 'rì'], ['于', '於', 'yú'], ['起', '起', 'qǐ'], ['还', '還', 'hái'], ['发', '發', 'fā'], ['成', '成', 'chéng'], ['事', '事', 'shì'], ['只', '只', 'zhǐ'], ['作', '作', 'zuò'],
  ['当', '當', 'dāng'], ['想', '想', 'xiǎng'], ['看', '看', 'kàn'], ['文', '文', 'wén'], ['无', '無', 'wú'], ['开', '開', 'kāi'], ['手', '手', 'shǒu'], ['十', '十', 'shí'], ['用', '用', 'yòng'], ['主', '主', 'zhǔ'],
  ['行', '行', 'xíng'], ['方', '方', 'fāng'], ['又', '又', 'yòu'], ['如', '如', 'rú'], ['前', '前', 'qián'], ['所', '所', 'suǒ'], ['本', '本', 'běn'], ['见', '見', 'jiàn'], ['经', '經', 'jīng'], ['头', '頭', 'tóu'],
  ['面', '面', 'miàn'], ['公', '公', 'gōng'], ['同', '同', 'tóng'], ['三', '三', 'sān'], ['已', '已', 'yǐ'], ['老', '老', 'lǎo'], ['从', '從', 'cóng'], ['动', '動', 'dòng'], ['两', '兩', 'liǎng'], ['长', '長', 'cháng'],
];
const TONES = { ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4], ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4], ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4], ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4], ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4] };
function variants(p) {
  let bare = '';
  let tone = 0;
  for (const c of p) { if (TONES[c]) { bare += TONES[c][0]; tone = TONES[c][1]; } else bare += c; }
  return [...new Set([p, bare + (tone || ''), bare, bare.replace('ü', 'v') + (tone || ''), bare.replace('ü', 'v')])];
}
export const LETTERS = LIST.map(([s, t, p], k) => ({ lower: s, upper: t, names: [], sounds: variants(p), row: `r${Math.floor(k / 10) + 1}`, spoken: s }));
const IDS = [...new Set(LETTERS.map((l) => l.row))];
export const ROWS = [
  ...IDS.map((id) => ({ id, items: LETTERS.filter((l) => l.row === id).map((l) => ({ glyph: l.lower, letter: l })) })),
  ...IDS.map((id) => ({ id: `${id}-trad`, capital: true, items: LETTERS.filter((l) => l.row === id && l.upper !== l.lower).map((l) => ({ glyph: l.upper, letter: l })) })).filter((r) => r.items.length),
];
export const { createGame, createGrid } = makeAlphabetGame(ROWS);
export const LABELS = { small: 'simplified', capital: 'traditional' };
