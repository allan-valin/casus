import json, re, subprocess, sys
model, out = sys.argv[1], sys.argv[2]
texts = json.loads(sys.argv[3])
pmap = json.load(open(model + '.json'))['phoneme_id_map']
CLITICS = {'ли','е','во','до','се','ќе','ги','го','ја','ми','ти','му','ѝ','на','од','со','за','и','а','сум','си','ме','те'}
def ipa_word(w):
    ipa = subprocess.run(['espeak-ng', '-v', 'mk', '-q', '--ipa', w], capture_output=True, text=True).stdout.strip()
    ipa = ipa.replace('æ', 'a').replace('k^', 'kʲ').replace('ɪ', 'i').replace('ʊ', 'u').replace('ɛ', 'e').replace('ˌ', '')
    if w.lower() in CLITICS: ipa = ipa.replace('ˈ', '')
    for ch in [c for c in w.lower() if c in 'ѓѕ']:
        ipa = ipa.replace('dʑ', 'ɡʲ' if ch == 'ѓ' else 'dz', 1)
    return ipa
res = []
for t in texts:
    words = re.findall(r"\w+|[.,!?;:]", t)
    ipa = ''
    for w in words:
        if re.match(r'\w', w):
            ipa += (' ' if ipa else '') + ipa_word(w)
        else:
            ipa += w
    ids, miss = [pmap['^'][0], pmap['_'][0]], set()
    for ch in ipa:
        if ch in pmap: ids += [pmap[ch][0], pmap['_'][0]]
        else: miss.add(ch)
    ids.append(pmap['$'][0])
    res.append({'text': t, 'ipa': ipa, 'ids': ids, 'missing': sorted(miss)})
json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
for r in res: print(r['ipa'], r['missing'])
