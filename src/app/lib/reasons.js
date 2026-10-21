/* The reasons the parser gives for a reading are written in English (src/lib, src/lang). The reader shows them in
 * the interface language (open item 2026-10-21): each rule matches one English reason and rewrites it, keeping the
 * words of the text ($1, $2 …) as they are; {case:N}, {num:N} and {persons:N} translate a captured English word.
 * A reason no rule knows stays English. tests/ui/reasons.test.js checks every reason the parser gives on the sample
 * texts (tests/fixtures/reasons.json, from tools/collect_reasons.mjs). */

const CASES = {
  pt: { nominative: 'nominativo', vocative: 'vocativo', genitive: 'genitivo', locative: 'locativo', dative: 'dativo', ablative: 'ablativo', accusative: 'acusativo', instrumental: 'instrumental', prepositional: 'preposicional' },
  de: { nominative: 'Nominativ', vocative: 'Vokativ', genitive: 'Genitiv', locative: 'Lokativ', dative: 'Dativ', ablative: 'Ablativ', accusative: 'Akkusativ', instrumental: 'Instrumental', prepositional: 'Präpositiv' },
  mk: { nominative: 'номинатив', vocative: 'вокатив', genitive: 'генитив', locative: 'локатив', dative: 'датив', ablative: 'аблатив', accusative: 'акузатив', instrumental: 'инструментал', prepositional: 'предлошки падеж' },
  ar: { nominative: 'حالة الرفع', vocative: 'حالة النداء', genitive: 'حالة الجر', locative: 'حالة الظرفية', dative: 'حالة القابل', ablative: 'حالة المجاوزة', accusative: 'حالة النصب', instrumental: 'حالة الآلة', prepositional: 'حالة ما بعد حرف الجر' },
};
const NUMS = {
  pt: { singular: 'singular', plural: 'plural' }, de: { singular: 'Singular', plural: 'Plural' },
  mk: { singular: 'еднина', plural: 'множина' }, ar: { singular: 'مفرد', plural: 'جمع' },
};
const PERSON = { pt: (n) => `${n}ª pessoa`, de: (n) => `${n}. Person`, mk: (n) => `${n} лице`, ar: (n) => `الشخص ${n}` };
const OR = { pt: ' ou ', de: ' oder ', mk: ' или ', ar: ' أو ' };

// [English pattern, { pt, de, mk, ar }]; most specific first
const RULES = [
  [/^government: (\S+) \+ (\S+) \(object (.+) is (\w+)\)$/, {
    pt: 'regência: $1 + $2 (o objeto $3 está no {case:4})', de: 'Rektion: $1 + $2 (das Objekt $3 steht im {case:4})',
    mk: 'рекција: $1 + $2 (објектот $3 е во {case:4})', ar: 'العمل: $1 + $2 (المفعول $3 في {case:4})' }],
  [/^government: governed by (\S+) \((.+)\)$/, { pt: 'regência: regido por $1 ($2)', de: 'Rektion: regiert von $1 ($2)', mk: 'рекција: управуван од $1 ($2)', ar: 'العمل: يعمل فيه $1 ($2)' }],
  [/^government: it has taken its object, so it is the preposition$/, { pt: 'regência: já tem seu objeto, então é a preposição', de: 'Rektion: es hat sein Objekt, also ist es die Präposition', mk: 'рекција: веќе го има својот објект, значи е предлог', ar: 'العمل: أخذ معموله، فهو حرف جر' }],
  [/^it has taken its object, so the preposition$/, { pt: 'já tem seu objeto, então é a preposição', de: 'es hat sein Objekt, also die Präposition', mk: 'веќе го има својот објект, значи е предлог', ar: 'أخذ معموله، فهو حرف جر' }],
  [/^agreement: matches (.+) \(([^()]+)\)$/, { pt: 'concordância: combina com $1 ($2)', de: 'Kongruenz: passt zu $1 ($2)', mk: 'согласување: се согласува со $1 ($2)', ar: 'المطابقة: يطابق $1 ($2)' }],
  [/^agreement: in the phrase of (.+)$/, { pt: 'concordância: no sintagma de $1', de: 'Kongruenz: in der Phrase von $1', mk: 'согласување: во синтагмата на $1', ar: 'المطابقة: في مركّب $1' }],
  [/^particle (.+) marks it: (\w+)$/, { pt: 'a partícula $1 o marca: $2', de: 'die Partikel $1 markiert es: $2', mk: 'честичката $1 го означува: $2', ar: 'الأداة $1 تَسِمه: $2' }],
  [/^particle (.+): (\w+)$/, { pt: 'partícula $1: $2', de: 'Partikel $1: $2', mk: 'честичка $1: $2', ar: 'الأداة $1: $2' }],
  [/^particle$/, { pt: 'partícula', de: 'Partikel', mk: 'честичка', ar: 'أداة' }],
  [/^marks the indirect object$/, { pt: 'marca o objeto indireto', de: 'markiert das indirekte Objekt', mk: 'го означува индиректниот објект', ar: 'يَسِم المفعول غير المباشر' }],
  [/^marks (.+) as (\w+)$/, { pt: 'marca $1 como $2', de: 'markiert $1 als $2', mk: 'го означува $1 како $2', ar: 'يَسِم $1 بأنه $2' }],
  [/^phrase: agrees with (.+)$/, { pt: 'sintagma: concorda com $1', de: 'Phrase: kongruiert mit $1', mk: 'синтагма: се согласува со $1', ar: 'المركّب: يطابق $1' }],
  [/^one phrase with (.+)$/, { pt: 'um só sintagma com $1', de: 'eine Phrase mit $1', mk: 'една синтагма со $1', ar: 'مركّب واحد مع $1' }],
  [/^its adjective (.+) agrees$/, { pt: 'seu adjetivo $1 concorda', de: 'sein Adjektiv $1 kongruiert', mk: 'придавката $1 се согласува', ar: 'صفته $1 تطابقه' }],
  [/^makes (.+) a possessor or modifier$/, { pt: 'faz de $1 um possuidor ou modificador', de: 'macht $1 zum Besitzer oder Attribut', mk: 'го прави $1 сопственик или определба', ar: 'يجعل $1 مالكًا أو مقيِّدًا' }],
  [/^(?:clause|subject): (.+) is already the subject of (.+)$/, { pt: 'oração: $1 já é o sujeito de $2', de: 'Satz: $1 ist schon das Subjekt von $2', mk: 'реченица: $1 е веќе подмет на $2', ar: 'الجملة: $1 هو فاعل $2 أصلًا' }],
  [/^clause: its verb (.+) is (singular|plural), so a nominative here is too$/, { pt: 'oração: seu verbo $1 está no {num:2}, então um nominativo aqui também', de: 'Satz: sein Verb $1 steht im {num:2}, also auch ein Nominativ hier', mk: 'реченица: глаголот $1 е во {num:2}, па и номинативот тука', ar: 'الجملة: فعلها $1 {num:2}، فالمرفوع هنا كذلك' }],
  [/^the verb (.+) is its own subject: not nominative$/, { pt: 'o verbo $1 traz o próprio sujeito: não é nominativo', de: 'das Verb $1 enthält sein Subjekt: kein Nominativ', mk: 'глаголот $1 го содржи својот подмет: не е номинатив', ar: 'الفعل $1 يتضمّن فاعله: ليس مرفوعًا' }],
  [/^the clause's only verb, agreeing with (.+)$/, { pt: 'o único verbo da oração, concordando com $1', de: 'das einzige Verb des Satzes, kongruent mit $1', mk: 'единствениот глагол во реченицата, се согласува со $1', ar: 'الفعل الوحيد في الجملة، يطابق $1' }],
  [/^(.+) is the clause's verb$/, { pt: '$1 é o verbo da oração', de: '$1 ist das Verb des Satzes', mk: '$1 е глаголот на реченицата', ar: '$1 هو فعل الجملة' }],
  [/^subject (.+): (\d)(?:st|nd|rd) person$/, { pt: 'sujeito $1: {person:2}', de: 'Subjekt $1: {person:2}', mk: 'подмет $1: {person:2}', ar: 'الفاعل $1: {person:2}' }],
  [/^subject: the only word that can be the subject of (.+)$/, { pt: 'sujeito: a única palavra que pode ser o sujeito de $1', de: 'Subjekt: das einzige Wort, das Subjekt von $1 sein kann', mk: 'подмет: единствениот збор што може да биде подмет на $1', ar: 'الفاعل: الكلمة الوحيدة التي يمكن أن تكون فاعل $1' }],
  [/^the final (.+): not nominative$/, { pt: 'a vogal final $1: não é nominativo', de: 'der Endvokal $1: kein Nominativ', mk: 'крајниот вокал $1: не е номинатив', ar: 'الحركة الأخيرة $1: ليس مرفوعًا' }],
  [/^the final (.+): nominative$/, { pt: 'a vogal final $1: nominativo', de: 'der Endvokal $1: Nominativ', mk: 'крајниот вокал $1: номинатив', ar: 'الحركة الأخيرة $1: مرفوع' }],
  [/^after (.+) in construct \(iḍāfa\): genitive$/, { pt: 'depois de $1 em estado construto (iḍāfa): genitivo', de: 'nach $1 in der Genitivverbindung (iḍāfa): Genitiv', mk: 'по $1 во конструкција (iḍāfa): генитив', ar: 'بعد $1 في الإضافة: مجرور' }],
  [/^verbal sentence: the subject \(fā[ʿʕ]il\) of the verb (.+)$/, { pt: 'frase verbal: o sujeito (fāʿil) do verbo $1', de: 'Verbalsatz: das Subjekt (fāʿil) des Verbs $1', mk: 'глаголска реченица: подметот (fāʿil) на глаголот $1', ar: 'جملة فعلية: فاعل الفعل $1' }],
  [/^verbal sentence: the object \(maf[ʿʕ]ūl bihi\) of the verb (.+)$/, { pt: 'frase verbal: o objeto (mafʿūl bihi) do verbo $1', de: 'Verbalsatz: das Objekt (mafʿūl bihi) des Verbs $1', mk: 'глаголска реченица: објектот (mafʿūl bihi) на глаголот $1', ar: 'جملة فعلية: المفعول به للفعل $1' }],
  [/^relative clause: agrees with (.+) in gender and number$/, { pt: 'oração relativa: concorda com $1 em gênero e número', de: 'Relativsatz: kongruiert mit $1 in Genus und Numerus', mk: 'релативна реченица: се согласува со $1 по род и број', ar: 'جملة الصلة: يطابق $1 في الجنس والعدد' }],
  [/^relative clause: (.+) cannot follow an article, so this is the pronoun$/, { pt: 'oração relativa: $1 não pode vir depois de um artigo, então isto é o pronome', de: 'Relativsatz: $1 kann nicht auf einen Artikel folgen, also ist dies das Pronomen', mk: 'релативна реченица: $1 не може да следи по член, значи ова е заменката', ar: 'جملة الصلة: لا يأتي $1 بعد أداة تعريف، فهذا هو الضمير' }],
  [/^relative clause: agrees with (.+)$/, { pt: 'oração relativa: concorda com $1', de: 'Relativsatz: kongruiert mit $1', mk: 'релативна реченица: се согласува со $1', ar: 'جملة الصلة: يطابق $1' }],
  [/^agrees with (.+)$/, { pt: 'concorda com $1', de: 'kongruiert mit $1', mk: 'се согласува со $1', ar: 'يطابق $1' }],
  [/^word order: case cannot tell the subject apart, so the first candidate, (.+), is the subject of (.+)$/, { pt: 'ordem das palavras: o caso não distingue o sujeito, então o primeiro candidato, $1, é o sujeito de $2', de: 'Wortstellung: der Kasus unterscheidet das Subjekt nicht, also ist der erste Kandidat, $1, das Subjekt von $2', mk: 'ред на зборовите: падежот не го разликува подметот, па првиот кандидат, $1, е подмет на $2', ar: 'ترتيب الكلمات: لا تميّز الحالةُ الفاعلَ، فالمرشّح الأول $1 هو فاعل $2' }],
  [/^word order: (.+) comes first, so it is the subject of (.+)$/, { pt: 'ordem das palavras: $1 vem primeiro, então é o sujeito de $2', de: 'Wortstellung: $1 steht zuerst, also ist es das Subjekt von $2', mk: 'ред на зборовите: $1 доаѓа прв, па е подмет на $2', ar: 'ترتيب الكلمات: $1 يأتي أولًا، فهو فاعل $2' }],
  [/^reference: refers to (.+) \(the nearest earlier noun of its gender and number\)$/, { pt: 'referência: refere-se a $1 (o substantivo anterior mais próximo do mesmo gênero e número)', de: 'Bezug: bezieht sich auf $1 (das nächste vorangehende Nomen mit seinem Genus und Numerus)', mk: 'упатување: се однесува на $1 (најблиската претходна именка од ист род и број)', ar: 'الإحالة: يعود إلى $1 (أقرب اسم سابق من جنسه وعدده)' }],
  [/^expression: (.+) — (.+)$/, { pt: 'expressão: $1 — $2', de: 'Ausdruck: $1 — $2', mk: 'израз: $1 — $2', ar: 'تعبير: $1 — $2' }],
  [/^lexicon: read as (.+) \(spelling variant\)$/, { pt: 'dicionário: lido como $1 (variante de grafia)', de: 'Wörterbuch: gelesen als $1 (Schreibvariante)', mk: 'речник: прочитано како $1 (правописна варијанта)', ar: 'المعجم: قُرئ $1 (صيغة إملائية أخرى)' }],
  [/^clause: (.+) is this subordinate clause's finite verb$/, { pt: 'oração: $1 é o verbo finito desta oração subordinada', de: 'Satz: $1 ist das finite Verb dieses Nebensatzes', mk: 'реченица: $1 е личниот глагол на оваа зависна реченица', ar: 'الجملة: $1 هو الفعل المتصرّف في هذه الجملة التابعة' }],
  [/^clause: the finite verb is (.+); the end of the clause holds its infinitive or participle$/, { pt: 'oração: o verbo finito é $1; o fim da oração traz seu infinitivo ou particípio', de: 'Satz: das finite Verb ist $1; am Satzende steht sein Infinitiv oder Partizip', mk: 'реченица: личниот глагол е $1; на крајот на реченицата е неговиот инфинитив или партицип', ar: 'الجملة: الفعل المتصرّف هو $1؛ وفي آخر الجملة مصدره أو اسم مفعوله' }],
  [/^clause: (.+) is the subject, so this is not nominative$/, { pt: 'oração: $1 é o sujeito, então isto não é nominativo', de: 'Satz: $1 ist das Subjekt, also ist dies kein Nominativ', mk: 'реченица: $1 е подметот, па ова не е номинатив', ar: 'الجملة: $1 هو الفاعل، فهذا ليس مرفوعًا' }],
  [/^clause: the subject (.+) is (singular|plural)$/, { pt: 'oração: o sujeito $1 está no {num:2}', de: 'Satz: das Subjekt $1 steht im {num:2}', mk: 'реченица: подметот $1 е во {num:2}', ar: 'الجملة: الفاعل $1 {num:2}' }],
  [/^clause: the subject here is (.+)$/, { pt: 'oração: o sujeito aqui é {persons:1}', de: 'Satz: das Subjekt ist hier {persons:1}', mk: 'реченица: подметот тука е {persons:1}', ar: 'الجملة: الفاعل هنا {persons:1}' }],
  [/^clause: the subject of (.+) \((\d)(sg|pl)\)$/, { pt: 'oração: o sujeito de $1 ($2$3)', de: 'Satz: das Subjekt von $1 ($2$3)', mk: 'реченица: подметот на $1 ($2$3)', ar: 'الجملة: فاعل $1 ($2$3)' }],
  [/^clause: the subject is (.+)$/, { pt: 'oração: o sujeito é $1', de: 'Satz: das Subjekt ist $1', mk: 'реченица: подметот е $1', ar: 'الجملة: الفاعل $1' }],
  [/^coordination: shares its case with (.+)$/, { pt: 'coordenação: tem o mesmo caso que $1', de: 'Koordination: teilt den Kasus mit $1', mk: 'координација: го дели падежот со $1', ar: 'العطف: يشارك $1 حالته' }],
  [/^separable verb: (.+) … (.+) \(one verb\)$/, { pt: 'verbo separável: $1 … $2 (um só verbo)', de: 'trennbares Verb: $1 … $2 (ein Verb)', mk: 'разделив глагол: $1 … $2 (еден глагол)', ar: 'فعل منفصل: $1 … $2 (فعل واحد)' }],
  [/^after the article (.+): its case$/, { pt: 'depois do artigo $1: o caso dele', de: 'nach dem Artikel $1: sein Kasus', mk: 'по членот $1: неговиот падеж', ar: 'بعد أداة التعريف $1: حالتها' }],
  [/^-지 before (.+): the verb it negates$/, { pt: '-지 antes de $1: o verbo que ele nega', de: '-지 vor $1: das Verb, das es verneint', mk: '-지 пред $1: глаголот што го негира', ar: '-지 قبل $1: الفعل الذي ينفيه' }],
  [/^(\S+) \+ noun after the verb: the indirect object$/, { pt: '$1 + substantivo depois do verbo: o objeto indireto', de: '$1 + Nomen nach dem Verb: das indirekte Objekt', mk: '$1 + именка по глаголот: индиректниот објект', ar: '$1 + اسم بعد الفعل: المفعول غير المباشر' }],
];

// reasons without words of the text
const FIXED = {
  'a closed-class word (Casus table)': { pt: 'uma palavra de classe fechada (tabela do Casus)', de: 'ein Wort einer geschlossenen Klasse (Casus-Tabelle)', mk: 'збор од затворена класа (табела на Casus)', ar: 'كلمة من فئة مغلقة (جدول Casus)' },
  'a common pronoun': { pt: 'um pronome comum', de: 'ein häufiges Pronomen', mk: 'честа заменка', ar: 'ضمير شائع' },
  'a coordinating word (Casus list)': { pt: 'uma palavra coordenativa (lista do Casus)', de: 'ein beiordnendes Wort (Casus-Liste)', mk: 'сврзувачки збор (листа на Casus)', ar: 'أداة عطف (قائمة Casus)' },
  'a full stop: the statement': { pt: 'um ponto final: a afirmação', de: 'ein Punkt: die Aussage', mk: 'точка: изјава', ar: 'نقطة: جملة خبرية' },
  'a personal pronoun, the subject': { pt: 'um pronome pessoal, o sujeito', de: 'ein Personalpronomen, das Subjekt', mk: 'лична заменка, подметот', ar: 'ضمير شخصي، الفاعل' },
  'a question mark: the question form': { pt: 'um ponto de interrogação: a forma interrogativa', de: 'ein Fragezeichen: die Frageform', mk: 'прашалник: прашална форма', ar: 'علامة استفهام: صيغة السؤال' },
  'a real reading wins over the letter name or interjection': { pt: 'uma leitura real vence o nome da letra ou a interjeição', de: 'eine echte Lesart geht dem Buchstabennamen oder der Interjektion vor', mk: 'вистинско читање има предност пред името на буквата или извикот', ar: 'القراءة الحقيقية تتقدّم على اسم الحرف أو أداة التعجّب' },
  'a real reading wins': { pt: 'uma leitura real vence', de: 'eine echte Lesart geht vor', mk: 'вистинско читање има предност', ar: 'القراءة الحقيقية تتقدّم' },
  'after a noun phrase, no article: the verb': { pt: 'depois de um sintagma nominal, sem artigo: o verbo', de: 'nach einer Nominalphrase, ohne Artikel: das Verb', mk: 'по именска синтагма, без член: глаголот', ar: 'بعد مركّب اسمي، دون أداة تعريف: الفعل' },
  'after an article: not a verb': { pt: 'depois de um artigo: não é verbo', de: 'nach einem Artikel: kein Verb', mk: 'по член: не е глагол', ar: 'بعد أداة تعريف: ليس فعلًا' },
  'an exclamation mark: a command or "let’s"': { pt: 'um ponto de exclamação: uma ordem ou "vamos"', de: 'ein Ausrufezeichen: ein Befehl oder „lass uns“', mk: 'извичник: наредба или „ајде“', ar: 'علامة تعجّب: أمر أو «هيا بنا»' },
  'before a noun: the article': { pt: 'antes de um substantivo: o artigo', de: 'vor einem Nomen: der Artikel', mk: 'пред именка: членот', ar: 'قبل اسم: أداة التعريف' },
  'before a verb: the object pronoun': { pt: 'antes de um verbo: o pronome objeto', de: 'vor einem Verb: das Objektpronomen', mk: 'пред глагол: заменката за објект', ar: 'قبل فعل: ضمير المفعول' },
  'before the verb: the subject': { pt: 'antes do verbo: o sujeito', de: 'vor dem Verb: das Subjekt', mk: 'пред глаголот: подметот', ar: 'قبل الفعل: الفاعل' },
  'after the verb, no preposition: the direct object': { pt: 'depois do verbo, sem preposição: o objeto direto', de: 'nach dem Verb, ohne Präposition: das direkte Objekt', mk: 'по глаголот, без предлог: директниот објект', ar: 'بعد الفعل، دون حرف جر: المفعول المباشر' },
  'after an intransitive verb with nothing before it: the subject': { pt: 'depois de um verbo intransitivo sem nada antes: o sujeito', de: 'nach einem intransitiven Verb, vor dem nichts steht: das Subjekt', mk: 'по непреоден глагол пред кој нема ништо: подметот', ar: 'بعد فعل لازم لا يسبقه شيء: الفاعل' },
  'את before a noun: the direct-object marker': { pt: 'את antes de um substantivo: a marca do objeto direto', de: 'את vor einem Nomen: die Markierung des direkten Objekts', mk: 'את пред именка: ознака за директен објект', ar: 'את قبل اسم: علامة المفعول به' },
  'after את: the direct object': { pt: 'depois de את: o objeto direto', de: 'nach את: das direkte Objekt', mk: 'по את: директниот објект', ar: 'بعد את: المفعول به' },
  'a subject pronoun: the subject, before or after the verb': { pt: 'um pronome sujeito: o sujeito, antes ou depois do verbo', de: 'ein Subjektpronomen: das Subjekt, vor oder nach dem Verb', mk: 'заменка за подмет: подметот, пред или по глаголот', ar: 'ضمير فاعل: هو الفاعل، قبل الفعل أو بعده' },
  'the object pronoun': { pt: 'o pronome objeto', de: 'das Objektpronomen', mk: 'заменката за објект', ar: 'ضمير المفعول' },
  'lhe/lhes: the indirect object': { pt: 'lhe/lhes: o objeto indireto', de: 'lhe/lhes: das indirekte Objekt', mk: 'lhe/lhes: индиректниот објект', ar: 'lhe/lhes: المفعول غير المباشر' },
  'between two numbers: a range, not a preposition': { pt: 'entre dois números: um intervalo, não uma preposição', de: 'zwischen zwei Zahlen: ein Bereich, keine Präposition', mk: 'меѓу два броја: распон, не предлог', ar: 'بين عددين: مدى، لا حرف جر' },
  'capitalised and not in the dictionary: a name': { pt: 'com maiúscula e fora do dicionário: um nome próprio', de: 'großgeschrieben und nicht im Wörterbuch: ein Name', mk: 'со голема буква и го нема во речникот: име', ar: 'بحرف كبير وليس في المعجم: اسم علم' },
  'clause: a subordinate clause ends with its finite verb': { pt: 'oração: uma oração subordinada termina com seu verbo finito', de: 'Satz: ein Nebensatz endet mit seinem finiten Verb', mk: 'реченица: зависната реченица завршува со личниот глагол', ar: 'الجملة: تنتهي الجملة التابعة بفعلها المتصرّف' },
  'clause: a subordinating conjunction opens this clause': { pt: 'oração: uma conjunção subordinativa abre esta oração', de: 'Satz: eine unterordnende Konjunktion leitet diesen Satz ein', mk: 'реченица: подредувачки сврзник ја отвора оваа реченица', ar: 'الجملة: أداة ربط تبعية تفتتح هذه الجملة' },
  'clause: infinitive with zu at the end of the clause': { pt: 'oração: infinitivo com zu no fim da oração', de: 'Satz: Infinitiv mit zu am Satzende', mk: 'реченица: инфинитив со zu на крајот на реченицата', ar: 'الجملة: مصدر مع zu في آخر الجملة' },
  'clause: nothing follows to govern, so not a preposition (a separable particle)': { pt: 'oração: nada vem depois para reger, então não é preposição (uma partícula separável)', de: 'Satz: es folgt nichts, das regiert werden kann, also keine Präposition (eine abtrennbare Partikel)', mk: 'реченица: по него нема ништо со што би управувал, па не е предлог (одвоива честичка)', ar: 'الجملة: لا يليه ما يعمل فيه، فليس حرف جر (أداة منفصلة)' },
  'clause: sein/werden/bleiben take no accusative': { pt: 'oração: sein/werden/bleiben não levam acusativo', de: 'Satz: sein/werden/bleiben nehmen keinen Akkusativ', mk: 'реченица: sein/werden/bleiben не земаат акузатив', ar: 'الجملة: الأفعال sein/werden/bleiben لا تأخذ منصوبًا' },
  'clause: the only verb of the clause is its finite verb': { pt: 'oração: o único verbo da oração é o seu verbo finito', de: 'Satz: das einzige Verb des Satzes ist sein finites Verb', mk: 'реченица: единствениот глагол во реченицата е нејзиниот личен глагол', ar: 'الجملة: الفعل الوحيد في الجملة هو فعلها المتصرّف' },
  'clause: zu before the infinitive that ends the clause': { pt: 'oração: zu antes do infinitivo que fecha a oração', de: 'Satz: zu vor dem Infinitiv am Satzende', mk: 'реченица: zu пред инфинитивот што ја завршува реченицата', ar: 'الجملة: zu قبل المصدر الذي يختم الجملة' },
  'clause: no ich/wir/du/ihr in this clause, so a finite verb here is 3rd person': { pt: 'oração: sem ich/wir/du/ihr nesta oração, então um verbo finito aqui está na 3ª pessoa', de: 'Satz: kein ich/wir/du/ihr in diesem Satz, also steht ein finites Verb hier in der 3. Person', mk: 'реченица: нема ich/wir/du/ihr во оваа реченица, па личниот глагол тука е во 3 лице', ar: 'الجملة: لا ich/wir/du/ihr في هذه الجملة، فالفعل المتصرّف هنا للغائب' },
  'government: it has taken its object, so it is the preposition': { pt: 'regência: já tem seu objeto, então é a preposição', de: 'Rektion: es hat sein Objekt, also ist es die Präposition', mk: 'рекција: веќе го има својот објект, значи е предлог', ar: 'العمل: أخذ معموله، فهو حرف جر' },
  'lexicon: attested form': { pt: 'dicionário: forma atestada', de: 'Wörterbuch: belegte Form', mk: 'речник: потврдена форма', ar: 'المعجم: صيغة موثّقة' },
  'no address in this sentence (no 2nd person, imperative or o), so no vocative': { pt: 'ninguém é chamado nesta frase (sem 2ª pessoa, imperativo ou o), então não há vocativo', de: 'keine Anrede in diesem Satz (keine 2. Person, kein Imperativ, kein o), also kein Vokativ', mk: 'нема обраќање во оваа реченица (нема 2 лице, императив или o), па нема вокатив', ar: 'لا نداء في هذه الجملة (لا مخاطَب ولا أمر ولا o)، فلا منادى' },
  'no particle after it, so the adverb': { pt: 'nenhuma partícula depois, então é o advérbio', de: 'keine Partikel danach, also das Adverb', mk: 'по него нема честичка, па е прилог', ar: 'لا أداة بعده، فهو الظرف' },
  'pin: chosen by the reader': { pt: 'fixado: escolhido por quem lê', de: 'festgelegt: von der Leserin oder dem Leser gewählt', mk: 'закачено: избрано од читателот', ar: 'مثبّت: اختاره القارئ' },
  'sentence start: a noun here would need its article': { pt: 'início da frase: um substantivo aqui precisaria do artigo', de: 'Satzanfang: ein Nomen bräuchte hier seinen Artikel', mk: 'почеток на реченица: именка тука би барала член', ar: 'بداية الجملة: الاسم هنا يحتاج إلى أداة تعريفه' },
  'the sentence ends in its verb': { pt: 'a frase termina no verbo', de: 'der Satz endet mit seinem Verb', mk: 'реченицата завршува со глаголот', ar: 'تنتهي الجملة بفعلها' },
  'the vowels written in the text': { pt: 'as vogais escritas no texto', de: 'die im Text geschriebenen Vokale', mk: 'самогласките напишани во текстот', ar: 'الحركات المكتوبة في النص' },
  '的 after it: possessor': { pt: '的 depois: possuidor', de: '的 danach: Besitzer', mk: '的 по него: сопственик', ar: '的 بعده: مالك' },
  'a pronoun: its readings with case': { pt: 'um pronome: suas leituras com caso', de: 'ein Pronomen: seine Lesarten mit Kasus', mk: 'заменка: нејзините читања со падеж', ar: 'ضمير: قراءاته ذات الحالة' },
  'inside a clause, so not an interjection': { pt: 'dentro de uma oração, então não é interjeição', de: 'innerhalb eines Satzes, also keine Interjektion', mk: 'внатре во реченица, па не е извик', ar: 'داخل جملة، فليس أداة تعجّب' },
  'the copula -DIr “is”': { pt: 'a cópula -DIr “é”', de: 'die Kopula -DIr „ist“', mk: 'копулата -DIr „е“', ar: 'الرابطة -DIr «يكون»' },
  'the copula 이다 "to be" after a noun': { pt: 'a cópula 이다 "ser" depois de um substantivo', de: 'die Kopula 이다 „sein“ nach einem Nomen', mk: 'копулата 이다 „е“ по именка', ar: 'الرابطة 이다 «يكون» بعد اسم' },
};

/** the reason in the interface language `lang`; English, and any reason no rule knows, as it is */
export function reasonText(reason, lang) {
  if (!lang || lang === 'en' || typeof reason !== 'string') return reason;
  const fixed = FIXED[reason]?.[lang];
  if (fixed) return fixed;
  for (const [re, out] of RULES) {
    const m = reason.match(re);
    if (!m || !out[lang]) continue;
    return out[lang]
      .replace(/\{case:(\d)\}/g, (_, k) => CASES[lang][m[k]] ?? m[k])
      .replace(/\{num:(\d)\}/g, (_, k) => NUMS[lang][m[k]] ?? m[k])
      .replace(/\{person:(\d)\}/g, (_, k) => PERSON[lang](m[k]))
      .replace(/\{persons:(\d)\}/g, (_, k) => m[k].replace(/(\d)(?:st|nd|rd) person/g, (__, n) => PERSON[lang](n)).split(' or ').join(OR[lang]))
      .replace(/\$(\d)/g, (_, k) => m[k] ?? '');
  }
  return reason;
}
