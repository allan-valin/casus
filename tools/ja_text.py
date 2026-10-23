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


# kana written one way and said another: the greetings keep the old particle は, said わ
SAID = {'こんにちは': 'こんにちわ', 'こんばんは': 'こんばんわ'}


def _word(tok):
    surface = RUBY.sub(lambda m: m.group(1), tok)
    reading = SAID.get(surface, RUBY.sub(lambda m: m.group(2), tok))
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


_KANJI = re.compile(r'[々㐀-䶿一-鿿]')


def _kanji_of(texts, lessons, skip=()):
    out, seen = [], set(skip)
    for t in texts:
        for k in _KANJI.findall(t):
            if k not in seen and k != '々':
                seen.add(k)
                out.append({'k': k, 'lesson': lessons.get(k)})
    return out


def unit_kanji(data, lessons):
    """each unit's new kanji (first met in its new items) and the kanji of its review items, each with the Learn
    kanji lesson that drills it (Allan, 2026-10-22: link them in the unit card and in the review)"""
    text_of = {i['id']: i['text'] for u in data.get('units', []) for i in u.get('new_items', [])}
    met = set()
    for u in data.get('units', []):
        u['kanji'] = _kanji_of([i['text'] for i in u.get('new_items', [])], lessons, met)
        met.update(x['k'] for x in u['kanji'])
        u['review_kanji'] = _kanji_of([text_of[r['item']] for r in u.get('reviews', []) if r['item'] in text_of], lessons)
    return data


def kanji_lessons(folder):
    """{kanji: lesson id} from the Learn kanji lessons (data/ja/learn/n5-k1.json …)"""
    import json
    from pathlib import Path
    out = {}
    for p in sorted(Path(folder).glob('n[1-5]-k*.json')):
        for k in json.loads(p.read_text(encoding='utf-8')).get('kanji', []):
            out.setdefault(k['k'], p.stem)
    return out
