"""Japanese lines of the Conversation course, written with their readings (Allan, 2026-10-22: furigana over kanji and
romaji below, as elsewhere on the site): 私[わたし] は 学生[がくせい] です。

- a reading in brackets belongs to the run of kanji right before it; kana and punctuation read as written;
- spaces separate words: the displayed text drops them, the romaji keeps them (and reads the particles は/へ/を as
  wa/e/o);
- a kanji without its reading is an error, so nothing is guessed.

parse() gives { text: the displayed line, rt: [[word, its kana reading]…], say: the kana the voice reads } — the browser
voice and espeak-ng both read kana, espeak cannot read kanji."""
import re

KANJI = r'々一-鿿㐀-䶿豈-﫿'
KANA = r'぀-ヿー'
RUBY = re.compile(rf'([{KANJI}]+)\[([{KANA}]+)\]')
PUNCT = re.compile(r'([。、！？!?「」『』（）…・,.\s]+)$')


def _word(tok):
    surface = RUBY.sub(lambda m: m.group(1), tok)
    reading = RUBY.sub(lambda m: m.group(2), tok)
    if re.search(f'[{KANJI}]', reading):
        raise ValueError(f'kanji without a reading in «{tok}»: write it as 漢字[かんじ]')
    return surface, reading


def parse(markup):
    rt = []
    for tok in markup.split():
        tail = PUNCT.search(tok)
        core, punct = (tok[:tail.start()], tail.group(1)) if tail else (tok, '')
        if core:
            rt.append(list(_word(core)))
        if punct:
            rt.append([punct, punct])
    return {'text': ''.join(s for s, _ in rt), 'rt': rt, 'say': ''.join(r for _, r in rt)}


QUOTE = re.compile(r'«([^»]+)»')


def convert_narration(text):
    """«…» spans of taught words inside a narrator line: markup out, readings kept"""
    found = {}
    def one(m):
        r = parse(m.group(1))
        found[r['text']] = {'rt': r['rt'], 'say': r['say']}
        return f"«{r['text']}»"
    return QUOTE.sub(one, text), found


def rich_course(data):
    """every taught string of a built course: markup out, its readings into data['readings'][displayed text]"""
    readings = {}
    def conv(s):
        r = parse(s)
        readings[r['text']] = {'rt': r['rt'], 'say': r['say']}
        return r['text']
    seen = set()
    for item in data.get('items', []):
        if id(item) not in seen:
            seen.add(id(item)); item['text'] = conv(item['text'])
    for u in data.get('units', []):
        for item in u.get('new_items', []):
            if id(item) not in seen:
                seen.add(id(item)); item['text'] = conv(item['text'])
        for s in u.get('steps', []):
            if isinstance(s.get('text'), dict):
                for k, v in s['text'].items():
                    s['text'][k], found = convert_narration(v)
                    readings.update(found)
            for line in s.get('lines', []) or []:
                line['text'] = conv(line['text'])
            if isinstance(s.get('answer'), dict) and 'text' in s['answer']:
                s['answer']['text'] = conv(s['answer']['text'])
            if s.get('parts'):
                s['parts'] = [conv(p) for p in s['parts']]
    data['readings'] = readings
    return data
