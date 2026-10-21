# Conversation practice German — de · en (neutral), de · ar, de · mk — unit plan A1 to C2 (DRAFT, after Allan's reviews of 2026-10-21)

Story bible: `tools/conversation/de/story-bible.yml` (Leipzig; Frau Becker the landlady, Jonas the neighbour, Herr
Schulz at the offices, Dr. Meier, Dr. Wagner, Lena, Herr Yilmaz, Frau Krüger, Prof. Hartmann at the VHS, Trainerin
Petra at the Sportverein). Written by AI (Claude); change anything.

**Three audiences, one course** (unit format: `tracks` for whole units, `for` for narrator notes):
- **E — neutral English** (for international offices): an international student; odd units she, even units he. The
  narrator keeps the curious note, never "back home".
- **A — Arabic**: a Syrian couple. She (odd units) came through family reunification with their small child,
  married through the families, Muslim, no German when she arrived (spouses of Blue Card holders need no A1 first);
  he (even units) is an engineer with a Blue Card. Her units come first in A1 so the course hooks her: the Kita, the
  paediatrician, the playground.
- **M — Macedonian**: an older couple (about 60) whose son lives in Leipzig with his German wife and their child.
  They hold Bulgarian (EU) passports, as many Macedonians do, so they come and stay without a visa; they want to talk
  to the in-laws, the neighbours, the grandchild's world. Odd units she, even units he.

A row is **core** (one scene for everyone, the protagonist's lines neutral) or has **E / A / M** versions of the same
slot. Shape as before: 30 units per level, L L T up to B2, 10–20 new items, grammar spread over about two units,
**Reviewed** on the doubling schedule, **no yearly amounts** (rules and where to check). Words: A1–A2 items outside
the top 1,000 lemmas only when the scene needs them, marked `rare: true` (tools/conversation_freq.mjs).

Scenes also come from *deutschweh* (2019, Schreibwerkstatt der Hochschule Fulda), foreign students' texts Allan
co-wrote — used as story seeds, never quoted or named.

## A1 — arrival (present, sein/haben, articles, accusative, modal verbs, W-questions)

| # | Kind | Title | Scene: core, or E / A / M | New (examples) | Grammar | Reviewed | Notes |
|---|---|---|---|---|---|---|---|
| 01 | L | Guten Tag | core: Frau Becker at the door | Guten Tag, Entschuldigung, ich verstehe nicht, danke | sein, Sie | — | Sie and a handshake |
| 02 | L | Die Kita | A: dropping the child at the Kita, first day / M: grandparents pick the grandchild up / E: the flat has no kitchen, not even a sink | A/M: Kita, Erzieherin, abholen, Tschüss, bis morgen · E: Küche, Spüle, Anschluss | articles | 01 all | A/M: the Kita is how parents meet; E: a landlord's kitchen is his to repair, so many offer none |
| 03 | T | Der Körper | core: a check at the doctor's | Kopf, Arm, Bauch, tut weh | possessive mein | 02 all; 01 danke | — |
| 04 | L | Die Anmeldung | core: Bürgeramt, Herr Schulz asks your religion | Termin, Formular, Wohnungsgeberbestätigung (rare), Religion | W-questions | 03 all; 02 abholen; 01 Sie | M: EU citizens just register, no visa; the religion box decides church tax |
| 05 | L | Der Kinderarzt | A: the paediatrician, the yellow check-up booklet / M: the grandchild has a fever, the parents are at work / E: the supermarket, Pfand | A/M: Kinderarzt, Fieber, Termin, U-Heft · E: Pfand, Tüte, mit Karte | accusative | 04 all; 03 Bauch; 01 verstehe nicht | A: check-ups are fixed by age; E: pork and gelatine on labels |
| 06 | T | Das Wetter | core: winter — grey from nine to three, then night; three jackets outside, an overheated room inside; the wet floor from melting snow; rare rain, but wind, so nobody carries an umbrella | kalt, grau, dunkel, Jacke, ausziehen, Heizung, windig | adjectives (predicative) | 05 all; 04 Termin; 02 Kita | summer comes later (A2-12): sun up at four, down at ten, heat and no air conditioning |
| 07 | L | Sonntag | core: everything is closed — on holidays too | geschlossen, Ruhe, Bäckerei, Feiertag | modal können | 06 all; 05 Fieber; 03 tut weh | the bakery opens for a few hours |
| 08 | L | Der Bus | core: ticket, app, a stroller on the bus | Fahrkarte, Haltestelle, umsteigen, Kinderwagen | separable verbs (basic) | 07 all; 06 Jacke; 04 Formular | — |
| 09 | T | Farben und Licht | core: buying a lamp for the dark flat | Lampe, hell, warmes Licht | adjectives | 08 all; 07 Sonntag; 05 Termin | — |
| 10 | L | Jonas | core: the neighbour, du at once | du, Hallo, wie geht's, mein Englisch ist besser | du vs Sie | 09 all; 08 Bus; 06 kalt | in Leipzig or Berlin people switch to English when you hesitate — keep going in German; in small towns they say "you speak so well!" |
| 11 | L | Der erste Tag | E: the first lecture / A: him: the first day at the firm; her: the Integrationskurs / M: the son's flat, the in-laws come for coffee | E: Vorlesung, Hörsaal · A: Kollege, Kurs · M: Schwiegereltern, Kaffee und Kuchen | modal müssen | 10 all; 09 hell; 07 können | — |
| 12 | T | Tiere | core: the dog on the tram, the playground pigeons | Hund, Katze, Vogel, an der Leine | plural | 11 all; 10 du; 08 Fahrkarte | — |
| 13 | L | Die Mensa / der Spielplatz | E: the Mensa: six queues at six coffee machines, someone pushes in / A/M: the playground — another mother starts talking | E: Schlange, ich war zuerst da · A/M: Spielplatz, Schaukel, wie alt ist er? | negation kein | 12 all; 11 Kurs; 09 Farben | E: one queue at home, one per machine here; A: halal food at the Mensa and at Kita lunch |
| 14 | L | Der Müll | core: Frau Becker explains the bins | gelbe Tonne, Biomüll, Restmüll, Glas | imperative Sie | 13 all; 12 plural; 10 Jonas | strict sorting |
| 15 | T | Zahlen und Formen | core: measuring a room | Meter, Ecke, breit, lang | numbers | 14 all; 13 Spielplatz; 11 müssen | — |
| 16 | L | Die Bank | core: an account; the clerk has no idea and is in a hurry | Konto, Karte, unterschreiben, welche Unterlagen? | modal wollen | 15 all; 14 Müll; 12 Hund | come with every document |
| 17 | L | Stoßlüften | core: windows wide open in winter | lüften, Heizung, Fenster kippen | imperative | 16 all; 15 Meter; 13 Schlange | M: промаја |
| 18 | T | Essen und Kochen | core: cooking for guests | Herd, kochen, salzig | accusative articles | 17 all; 16 Konto; 14 imperative | — |
| 19 | L | Der Wochenmarkt | core: Saturday market | Kilo, frisch, Stück | numbers | 18 all; 17 lüften; 15 numbers | — |
| 20 | L | Die Woche | core: a week of appointments | Montag…, heute, morgen, keine Zeit | time words | 19 all; 18 Herd; 16 wollen | — |
| 21 | T | Pflanzen | core: the courtyard garden | Baum, Blume, gießen | dative (introduced) | 20 all; 19 Markt; 17 Heizung | — |
| 22 | L | Wie spät ist es? | E: the 8:00 lecture — Germans seated at 7:50 / A/M: the Kita closes at 16:30, sharp | halb drei, Viertel nach, Verspätung, pünktlich | time | 21 all; 20 Woche; 18 kochen | five minutes late needs a sorry |
| 23 | L | Ruhezeit | core: noise after 22:00 | leise, Nachbar, Entschuldigung | modal dürfen | 22 all; 21 Pflanzen; 19 frisch | A: late visits are normal at home |
| 24 | T | Der Himmel | core: stars over the Völkerschlachtdenkmal | Stern, Mond, Planet | prepositions in/an/auf | 23 all; 22 Uhrzeit; 20 morgen | — |
| 25 | L | In der Straßenbahn | core: a man insults you on the tram; someone stands by you | Lassen Sie mich in Ruhe!, Hilfe, Polizei, 110 | imperative | 24 all; 23 Ruhe; 21 gießen | what to say and do — expected on day one, sadly; more in B1-23 |
| 26 | L | Händedruck | core: a colleague / another parent introduces herself | Hand geben, sich vorstellen | reflexive (fixed) | 25 all; 24 Himmel; 22 halb drei | A: across genders, and declining politely |
| 27 | T | Haus und Material | core: why German flats are cold or warm | Holz, Stein, Glas, Dämmung | adjectives | 26 all; 25 Hilfe; 23 dürfen | — |
| 28 | L | Meine Familie | core: a video call home, Frau Becker listens | Mutter, Bruder, Kinder, Enkel | possessives | 27 all; 26 vorstellen; 24 Stern | M: Enkel |
| 29 | L | Die Heizung ist kaputt | core: calling the Hausverwaltung | kaputt, Handwerker, Termin | modal + infinitive | 28 all; 27 Holz; 25 Polizei | — |
| 30 | T | Sport und Verein | core: the Sportverein trial; review | Verein, Training, Mitglied (review mostly) | all A1 | 29 all; everything of A1 | clubs are how Germans meet; A: women's swimming hours exist |

## A2 — settling in (Perfekt, dative, weil/dass, comparison, reflexive)

| # | Kind | Title | Scene: core, or E / A / M | New (examples) | Grammar | Reviewed | Notes |
|---|---|---|---|---|---|---|---|
| 01 | L | Was hast du gemacht? | core: Monday small talk | ich habe…, ich bin gegangen | Perfekt | A1-30 all; A1-28 Familie; A1-26 Hand | — |
| 02 | L | Aufenthalt | E: student visa at the Ausländerbehörde / A: family reunification, his Blue Card / M: EU citizens: no visa, just registration | Aufenthaltstitel, Visum, Familiennachzug, Freizügigkeit | Perfekt | 01 all; A1-29 Termin; A1-04 Formular | E: types: study, work, au pair, asylum; M: Bulgarian passport; check the current rules |
| 03 | T | Herz und Gesundheit | core: Dr. Wagner | Blutdruck, Herz, gesund | dative pronouns | 02 all; 01 Perfekt; A1-03 body | — |
| 04 | L | Wie finanziert man das? | E: blocked account (the BAföG maximum × 12), a guarantor, or income / A: his salary covers the family / M: their pension, travel health insurance | Sperrkonto, Verpflichtungserklärung, Einkommen, Reisekrankenversicherung | weil | 03 all; 02 Visum; A1-16 Konto | never the figures — where to check them |
| 05 | L | Krankenversicherung | E: the student rate (same at every public insurer, ends around 30); private = waiting periods, paying first, an excess, no way back during studies / A: the family is insured with him / M: what their insurance covers here | gesetzlich, privat, Studententarif, mitversichert, Wartezeit | dative | 04 all; 03 Herz; A1-11 Tag | — |
| 06 | T | Wasser | core: Leipzig's lakes; ice, steam | See, Eis, Dampf, schmelzen | Perfekt with sein | 05 all; 04 Einkommen; 02 Titel | — |
| 07 | L | Bayern ist nicht Deutschland | core: the Lederhosen picture; then "is it hot for you too?" | Klischee, Lederhose, Sachsen, Vorurteil | comparison | 06 all; 05 Versicherung; 01 Perfekt | clichés both ways |
| 08 | L | Elternabend | A: the Kita parents' evening / M: the grandchild's Kita party / E: the uni buddy programme | A/M: Elternabend, Laternenfest, mitbringen · E: Buddy, Tutorium | nouns -ung | 07 all; 06 Wasser; 04 weil | A: bringing food to the party, asking about pork |
| 09 | T | Strom | core: the electricity contract | Strom, Zähler, Anbieter | dass | 08 all; 07 Klischee; 05 dative | — |
| 10 | L | Herr Yilmaz | core: the neighbour on the 2nd floor | seit wann…?, schon lange | seit + dative | 09 all; 08 Elternabend; 06 Eis | a bridge figure |
| 11 | L | Feste | core: Ramadan, Orthodox Easter, Christmas at the Kita / office | fasten, Feiertag, frei nehmen | weil | 10 all; 09 Strom; 07 Bayern | A: Ramadan; M: the Orthodox Easter date |
| 12 | T | Der Sommer | core: sun up at four, down at ten; a heat wave and no air conditioning or fan anywhere | Hitze, Ventilator, schwitzen, hell | comparison | 11 all; 10 seit; 08 nouns | blackout curtains |
| 13 | L | Ich mag… | core: food and music with Lena | mögen, lieber, am liebsten | comparison | 12 all; 11 Feste; 09 dass | — |
| 14 | L | Der Weihnachtsmarkt | core: Glühwein, crowds | ohne Alkohol, Bratwurst | wenn | 13 all; 12 Hitze; 10 Yilmaz | A: alcohol-free |
| 15 | T | Geld und Prozent | core: a sale, a discount | Rabatt, Prozent, Hälfte | numbers | 14 all; 13 lieber; 11 fasten | — |
| 16 | L | Kindergeld und Elterngeld | A: applying for Kindergeld at the Familienkasse / M: the son explains what they get / E: a classmate with a baby | Kindergeld, Antrag, Familienkasse | Präteritum war/hatte | 15 all; 14 Markt; 12 Sommer | rules and where to apply, no amounts |
| 17 | L | Ein Ausflug nach Dresden | core: the train | Gleis, umsteigen, Verspätung | directional prepositions | 16 all; 15 Prozent; 13 mögen | the Bahn is late too |
| 18 | T | Geografie | core: Germany's regions and rivers | Elbe, Gebirge, Osten/Westen | genitive basics | 17 all; 16 Antrag; 14 wenn | — |
| 19 | L | Das Fahrrad | core: a used bike, a child seat | gebraucht, Bremse, Kindersitz | adjective endings | 18 all; 17 Gleis; 15 Rabatt | — |
| 20 | L | Ausgehen | E: a club night / A: a women's café evening / M: a Balkan evening at a restaurant | E: Türsteher, tanzen · A: Frauencafé · M: Livemusik | reflexive | 19 all; 18 Elbe; 16 war | E: the door policy |
| 21 | T | Die Wende 1989 | core: the Monday demonstrations | Demonstration, Mauer, friedlich | Präteritum | 20 all; 19 Fahrrad; 17 Dresden | — |
| 22 | L | Begegnungen | E: a date, who pays / A: a German neighbour invites her for coffee / M: the in-laws invite them | E: getrennt zahlen · A/M: Einladung, mitbringen | modal sollen | 21 all; 20 ausgehen; 18 Osten | splitting the bill; what to bring |
| 23 | L | Die Uni / die Schule | E: exams, Prüfungsordnung, Lehrfreiheit, a grade you can challenge / A/M: school registration for the older cousin | Klausur, Modul, Einschulung, Schulpflicht | Perfekt irregular | 22 all; 21 Wende; 19 Bremse | E: rules per degree programme |
| 24 | T | Musik | core: Bach, the Thomanerchor, techno | Chor, Konzert | dative verbs | 23 all; 22 Einladung; 20 tanzen | — |
| 25 | L | Schweigen | core: strangers don't talk; silence in a seminar or a waiting room | Smalltalk, schweigen, zuhören | indirect questions | 24 all; 23 Klausur; 21 Mauer | silence is often listening |
| 26 | L | Der Sportverein | core: joining, the Vereinsabend | Mitgliedsbeitrag, Mannschaft | um … zu | 25 all; 24 Musik; 22 sollen | — |
| 27 | T | Sprichwörter | core: Frau Becker's sayings | Ende gut, alles gut | relative (intro) | 26 all; 25 Smalltalk; 23 Schule | — |
| 28 | L | Heimweh | core: alone in the Mensa / at the playground / at the in-laws' table; calling home | vermissen, Heimweh, einsam | reflexive dative | 27 all; 26 Verein; 24 Chor | loneliness is normal at first |
| 29 | L | Die VHS | core: signing up for an evening course | Kurs, Anmeldung | zu-infinitive | 28 all; 27 Sprichwörter; 25 schweigen | — |
| 30 | T | Witze | core: German humour, explained; summer party review | Pointe (review mostly) | all A2 | 29 all; everything of A2 | — |

## B1 — friends (Präteritum, Konjunktiv II, relative clauses, passive)

| # | Kind | Title | Situation | New (examples) | Grammar | Reviewed | Clash |
|---|---|---|---|---|---|---|---|
| 01 | L | Jonas' WG | the WG kitchen | Mitbewohner, Putzplan | relative clauses | A2-30 all; A2-29 VHS; A2-26 Verein | the cleaning rota |
| 02 | L | Meinungen | climate, cars | ich finde, dass…, meiner Meinung nach | dass | 01 all; A2-28 Heimweh; A2-25 silence | both: direct disagreement |
| 03 | T | Die Zelle | the VHS biology evening | Zelle, Kern, teilen | passive (werden) | 02 all; 01 WG; A2-03 Herz | — |
| 04 | L | Fußball | RB Leipzig | Spiel, Tor, Fan | Präteritum | 03 all; 02 Meinung; A2-21 Wende | — |
| 05 | L | Wenn ich reich wäre | dreams over beer and tea | wäre, hätte, würde | Konjunktiv II | 04 all; 03 Zelle; 01 Putzplan | ar: tea, not beer |
| 06 | T | Energie | the heating bill, solar | Energie, sparen, Solaranlage | passive | 05 all; 04 Tor; 02 finde | — |
| 07 | L | Der Brief vom Anwalt | an Abmahnung for filesharing; Jonas's cousin had one | Abmahnung, Urheberrecht, Unterlassungserklärung, eigener Anwalt, verhandeln | passive | 06 all; 05 wäre; 03 passive | both: P2P sharing costs money; don't pay or sign at once — a lawyer of your own often costs less than the demand and negotiates it down (no amounts) |
| 08 | L | Nein heißt nein | Jonas offers once only | „Nein, danke" heißt nein | indirect questions | 07 all; 06 Energie; 04 Präteritum | ar: the offer is not repeated |
| 09 | T | Erdbeben und Vulkane | the Eifel, why Germany is quiet | Vulkan, Erdbeben, Platte | Präteritum | 08 all; 07 Abmahnung; 05 würde | — |
| 10 | L | Kein Bürgergeld für Studis | the engineer loses a minijob | Bürgergeld, Studierende, Wohngeld, Studentenwerk | weil/obwohl | 09 all; 08 nein; 06 sparen | ar: students have no right to unemployment aid — what helps instead; mk: the nurse's Arbeitslosengeld via insurance; E/A only; M: the son explains the Rente and what EU pensioners may claim |
| 11 | L | Familie zu Besuch | parents from Bitola / Aleppo | Gästezimmer, zeigen | two-part conjunctions | 10 all; 09 Vulkan; 07 Anwalt | both: hosting expectations |
| 12 | T | Statistik | polls on TV | Umfrage, Durchschnitt | Konjunktiv II polite | 11 all; 10 Bürgergeld; 08 indirect | — |
| 13 | L | Die Weihnachtsfeier | the office party | Wichteln, Rede | genitive | 12 all; 11 Besuch; 09 Erdbeben | — |
| 14 | L | Das Du | Dr. Meier offers du | Wollen wir uns duzen? | address | 13 all; 12 Umfrage; 10 obwohl | both: when du is right |
| 15 | T | Glück | what makes people happy | Glück, zufrieden | relative pronouns in cases | 14 all; 13 Wichteln; 11 Gäste | — |
| 16 | L | Beschweren | a faulty phone | Garantie, umtauschen, Quittung | passive | 15 all; 14 duzen; 12 Durchschnitt | — |
| 17 | L | Wohnungssuche | WG-Casting, housing shortage | Besichtigung, Kaution, Schufa | relative with prepositions | 16 all; 15 Glück; 13 Rede | both: discrimination on the housing market; Kaltmiete vs Warmmiete — what Nebenkosten include; the student Wohnheim is pushed first but is not always the cheapest |
| 18 | T | Freiheit | free speech, the Grundgesetz | Grundgesetz, Würde, Recht | Konjunktiv II past | 17 all; 16 Garantie; 14 du | — |
| 19 | L | Ein Freund aus der Unterkunft | A: a Syrian friend who came as a refugee — the Landratsamt, no German course before recognition, greetings that faded after Christmas, a falafel stand at the Stadtfest, a prayer room / M: neighbours from western North Macedonia, many with Bulgarian passports, came as EU citizens; others under the Western Balkans rule / E: a classmate who came as a refugee | Unterkunft, Landratsamt, Anerkennung, EU-Bürger, Westbalkanregelung | separable past | 18 all; 17 Kaution; 15 zufrieden | several paths into the same country; check current rules |
| 20 | L | Beziehung | moving in together? | zusammenziehen, Eltern vorstellen | als/wenn | 19 all; 18 Freiheit; 16 umtauschen | both: families and partners |
| 21 | T | Kunst | the Bildermuseum | Gemälde, Eindruck | relative | 20 all; 19 Umzug; 17 Schufa | — |
| 22 | L | Ehrenamt | volunteering at the Tafel; a German volunteer who opens doors at offices for newcomers | freiwillig, Tafel, begleiten, Termin | um … zu | 21 all; 20 Beziehung; 18 Würde | both: one helpful person changes everything |
| 23 | L | Politik | elections, carefully | wählen, Partei | Konjunktiv II | 22 all; 21 Kunst; 19 Kartons | both: politics with care; the AfD and why some places are risky for immigrants — where right-wing violence is known, and where victims get help (Opferberatung) |
| 24 | T | Literatur | Goethe in Auerbachs Keller | Gedicht, Vers | future I | 23 all; 22 Tafel; 20 zusammen | — |
| 25 | L | Minijob oder Werkstudent? | E: a job beside studies / A: him: a second job? her: a minijob while the child is at the Kita / M: helping in the son's friend's café | Minijob, Werkstudent, Steuerklasse, Arbeitstage, halber Tag, Stundenlohn | imperative du | 24 all; 23 Partei; 21 Gemälde | E: international students: a yearly limit of full or half days (140/280 since 2024 — check); more than four hours is a full day; a mandatory internship doesn't count; full time in the semester break; paid by the hour, finish fast and you may be sent home; a minijob brings no health insurance; a second job is taxed in class VI |
| 26 | L | Silvester | fireworks, resolutions | Feuerwerk, Vorsätze | future I | 25 all; 24 Goethe; 22 freiwillig | — |
| 27 | T | Dialekte | Saxon in Leipzig | „nu", Gaffee | indirect speech (intro) | 26 all; 25 Streit; 23 wählen | — |
| 28 | L | Turnier | the Verein's tournament | Turnier, Schiedsrichter | Präteritum | 27 all; 26 Silvester; 24 Vers | — |
| 29 | L | Ost und West | Leipzig's history, salaries, the Soli argument at a barbecue | Ossi/Wessi, Vorurteil, Solidaritätszuschlag | passive past | 28 all; 27 Saxon; 25 mediate | both: Germany's own divides; the Soli was paid in East and West alike, today mostly by high earners and companies — check the current rule; and the newer north–south gap: most big companies and the higher wages are in the south and west |
| 30 | T | Ironie | Jonas's dry humour; New Year review | na toll!, sehr witzig (review mostly) | all B1 | 29 all; everything of B1 | — |

## B2 — work (formal register, nominal style, Konjunktiv I, passive forms)

M versions of the work units (the Macedonian couple are retired): 04 the son's recognition story told to them; 05 → the
EU pension and health cover when staying longer; 10/11 → helping the son's in-laws with a family firm; 13 → caring for the
grandchild while the parents work; 17 → reading the son's payslip with him; 22 → a neighbour's contract story; 25 →
the Seniorentreff board; 28/29 → the grandchild's school start (Einschulung).

| # | Kind | Title | Situation | New (examples) | Grammar | Reviewed | Clash |
|---|---|---|---|---|---|---|---|
| 01 | L | Feedbackgespräch | annual review | Stärken, Ziel | nominal style | B1-30 all; B1-29 Ost/West; B1-26 Silvester | both: direct criticism |
| 02 | L | Das geht so nicht | the boss is direct | sachlich, nicht persönlich | modal particles | 01 all; B1-28 Turnier; B1-25 Streit | both: read as anger |
| 03 | T | Gene | heredity | Gen, Merkmal, vererben | passive with modal | 02 all; 01 Feedback; B1-03 Zelle | — |
| 04 | L | Anerkennung | recognising the degree / nursing licence; meanwhile working in a club cloakroom | Anerkennungsverfahren, Berufserlaubnis, überqualifiziert | passive past | 03 all; 02 sachlich; B1-22 Ehrenamt | mk: nursing licence; ar: engineering degree; both: graduates in jobs far below their training |
| 05 | L | Vom Studium zur Arbeit | changing the residence title | Aufenthaltserlaubnis zur Arbeitssuche, Blaue Karte | Konjunktiv I | 04 all; 03 Gene; B1-10 Bürgergeld | ar: switch titles before naturalisation is possible; mk: — |
| 06 | T | Chemie | acids in the kitchen | Säure, Base | adjectival participles | 05 all; 04 Anerkennung; 02 particles | — |
| 07 | L | Das Meeting | running a meeting | Tagesordnung, Protokoll | passive with modal | 06 all; 05 Blaue Karte; 03 vererben | — |
| 08 | L | E-Mail-Deutsch | formal letters | Sehr geehrte…, MfG | formal letters | 07 all; 06 Säure; 04 Berufserlaubnis | — |
| 09 | T | Das Weltall | the planetarium | Lichtjahr, Umlaufbahn | nominalisation | 08 all; 07 Protokoll; 05 Konjunktiv I | — |
| 10 | L | Bewerbung | the cover letter | hiermit bewerbe ich mich | nominalisation | 09 all; 08 MfG; 06 participles | both: modest vs self-promoting |
| 11 | L | Vorstellungsgespräch | Frau Krüger asks | Lücke, Motivation | indirect speech | 10 all; 09 Weltall; 07 meeting | — |
| 12 | T | Wahrscheinlichkeit | weather and lottery | Zufall, Wahrscheinlichkeit | Konjunktiv II past | 11 all; 10 Bewerbung; 08 letters | — |
| 13 | L | Kündigen | giving notice | Kündigungsfrist, Arbeitszeugnis | formal requests | 12 all; 11 interview; 09 Lichtjahr | — |
| 14 | L | Teilzeit und Kita | family and work | Elternzeit, Kitaplatz | infinitive groups | 13 all; 12 Zufall; 10 hiermit | ar: family roles; mk: grandparents far away |
| 15 | T | Wahrheit | fake news | Behauptung, Beweis, Quelle | concessive clauses | 14 all; 13 Kündigung; 11 Lücke | — |
| 16 | L | Konflikt im Team | a blocked project | Lösung, Kompromiss | concessive | 15 all; 14 Kita; 12 probability | — |
| 17 | L | Die Lohnabrechnung | reading the payslip line by line | brutto, netto, Lohnsteuer, Soli, Kirchensteuer, Kranken-, Pflege-, Renten-, Arbeitslosenversicherung, Arbeitgeberanteil | genitive prepositions | 16 all; 15 Quelle; 13 Zeugnis | both: from a third to almost half goes before you see it; the employer pays its share on top (no amounts) |
| 18 | T | Integration | the debate, from inside | Teilhabe, Vorurteil | connectors | 17 all; 16 Konflikt; 14 Elternzeit | both: racism and how to answer it |
| 19 | L | Präsentation | a project talk | zunächst, zusammenfassend | connectors | 18 all; 17 Lohnabrechnung; 15 Wahrheit | — |
| 20 | L | Betriebsrat | rights at work | Überstunden, Urlaubstage | passive of state | 19 all; 18 Integration; 16 Kompromiss | —; Urlaub: holidays scale with your working days (five a week → 20, three → 12); single days are fine; a Brückentag costs a holiday day; holidays are quiet like Sundays |
| 21 | T | Religion | faith in a secular city; the church tax line on the payslip | Glaube, Kirchensteuer, Kirchenaustritt, Moschee | Konjunktiv I | 20 all; 19 talk; 17 Lohnabrechnung | both: only members of churches that levy it pay (Catholic, Protestant, some Jewish communities); mosques and almost all Orthodox churches do not; leaving is a formal step |
| 22 | L | Der neue Chef | a new owner; you sign "I acknowledge the change" and the contract becomes a minijob; wages late; months later the Krankenkasse sends a bill | Betriebsübergang, Kenntnisnahme, unterschreiben, Nachzahlung, Ratenzahlung, Arbeitsgericht | nominal style | 21 all; 20 Betriebsrat; 18 Teilhabe | both: never sign what you have not read; ask the insurer for a payment plan (Allan's own case) |
| 23 | L | Konferenz | small talk at a conference | oder?, ne? | question tags | 22 all; 21 Kirchensteuer; 19 zunächst | — |
| 24 | T | Wohnungsnot | rents, the housing crisis | Mietpreisbremse, Warteliste | passive forms | 23 all; 22 Frist; 20 Überstunden | — |
| 25 | L | Der Vereinsvorstand | elected to the club board | Vorstand, Kasse, Sitzung | formal speech | 24 all; 23 Konferenz; 21 Glaube | Verein democracy |
| 26 | L | Hochzeit | Jonas and Lena marry | Standesamt, Trauzeuge | genitive | 25 all; 24 Mietpreis; 22 Arbeitsrecht | both: a German wedding vs at home |
| 27 | T | Medien | public broadcasting, the Rundfunkbeitrag | Rundfunkbeitrag, Nachrichten | nominal style | 26 all; 25 Vorstand; 23 tags | everyone pays it |
| 28 | L | Abschied | leaving party at the old job | Ausstand, Dank | formal speech | 27 all; 26 Hochzeit; 24 Wohnungsnot | —; and on your own birthday you bring the cake for everyone yourself |
| 29 | L | Der neue Job | first week | Einarbeitung | relative with prepositions | 28 all; 27 Medien; 25 Kasse | — |
| 30 | T | Zukunft | staying or going back; review | (review mostly) | all B2 | 29 all; everything of B2 | — |

## C1 — life in depth (all daily life; VHS and Sportverein as threads)

| # | Title | Situation | New (examples) | Grammar | Reviewed | Clash |
|---|---|---|---|---|---|---|
| 01 | VHS: Debattierkurs | arguing a point | einerseits…andererseits | extended attributes | B2-30 all; B2-29 Job; B2-26 Hochzeit | — |
| 02 | Niederlassungserlaubnis | permanent residence: the rules | Voraussetzungen, Rentenpunkte, B1-Nachweis | nominal style | 01 all; B2-28 Abschied; B2-05 Blaue Karte | check the current rules; the Leben-in-Deutschland test |
| 03 | Einbürgerung | what is needed; the test | Einbürgerungstest, Staatsangehörigkeit | Konjunktiv I | 02 all; 01 Debatte; B2-24 Miete | ar: a study permit doesn't let you apply; mk: dual citizenship?; the test: a fixed pool of 300 general questions plus 10 for your federal state |
| 04 | Der Mietvertrag | a contract clause dispute | Klausel, Schönheitsreparaturen | modal subjective | 03 all; 02 Niederlassung; B2-22 Arbeitsrecht | —; a Wohnheim reads "subletting is not allowed" as "no guest may sleep over" |
| 05 | Das Auto | buying, TÜV | TÜV, Zulassung, Versicherung | passive forms | 04 all; 03 Test; B2-20 Betriebsrat | — |
| 06 | Unfall | police report | Unfallbericht, Zeuge | Konjunktiv I | 05 all; 04 Klausel; B2-17 Lohnabrechnung | — |
| 07 | Die Schwiegereltern | first visit to Lena's parents (for the cast) | Schwiegermutter, Kaffee und Kuchen | particles | 06 all; 05 TÜV; B2-14 Kita | both: German family visits |
| 08 | Saisonfinale | the club's last match | Abstieg, Aufstieg | modal subjective | 07 all; 06 Unfall; 03 Test | — |
| 09 | Beim Facharzt | referral, waiting time | Überweisung, Wartezeit | nominal style | 08 all; 07 Kuchen; 04 Mietvertrag | public vs private insurance |
| 10 | Trauerfall | a funeral; condolences | Beileid, Trauerfeier | formal set phrases | 09 all; 08 Saison; 05 Zulassung | both: mourning customs differ |
| 11 | Datenschutz | GDPR, a data request | Auskunft, Einwilligung | passive with modal | 10 all; 09 Facharzt; 06 Zeuge | —; "we can't, because of the GDPR" — the answer to every suggestion |
| 12 | Schulwahl | after year 4: Gymnasium or Oberschule? (A/M: their child or grandchild; E: a colleague's) | Gymnasialempfehlung, Oberschule, Elterngespräch | extended attributes | 11 all; 10 Beileid; 07 Schwiegereltern | the early sorting surprises most newcomers |
| 13 | Ehrenamt im Verein | coaching kids | Jugendtrainer, Verantwortung | infinitive constructions | 12 all; 11 DSGVO; 08 Abstieg | — |
| 14 | Kommunalwahl | voting rights for EU citizens / non-citizens | Wahlrecht, Kommune | Konjunktiv I | 13 all; 12 Elternabend; 09 Überweisung | mk/ar: who may vote |
| 15 | Demonstration | a march against racism | Kundgebung, Zivilcourage | particles | 14 all; 13 Trainer; 10 Trauer | — |
| 16 | Psychische Gesundheit | therapy, waiting lists | Therapieplatz, Burnout | modal subjective | 15 all; 14 Wahl; 11 Einwilligung | both: taboo at home |
| 17 | Bauen oder mieten? | the bank, a mortgage | Kredit, Zinsen, Eigenkapital | nominal style | 16 all; 15 Demo; 12 Klassenfahrt | —; buying a house: own capital, the land transfer tax, notary and agent, cheaper in the east and the countryside — no figures |
| 18 | VHS: Philosophie | Kant over coffee | Pflicht, Aufklärung | extended attributes | 17 all; 16 Therapie; 13 Ehrenamt | — |
| 19 | Nachbarschaftsstreit | the hedge, the Schlichter | Schlichtung, Grundstück | concessive | 18 all; 17 Kredit; 14 Kommune | — |
| 20 | Geburt | birth, the Hebamme | Hebamme, Elterngeld | passive forms | 19 all; 18 Kant; 15 Zivilcourage | — |
| 21 | Zweisprachig | raising a child in two languages | Muttersprache, mischen | particles | 20 all; 19 Hecke; 16 Burnout | — |
| 22 | Erbschaft | inheritance, the notary | Notar, Testament | Konjunktiv I | 21 all; 20 Hebamme; 17 Zinsen | — |
| 23 | Eine Beschwerde | taking a discrimination case further: the Antidiskriminierungsstelle, a written complaint (the first-day version is A1-25) | Diskriminierung, Beschwerde, Beratungsstelle | modal subjective | 22 all; 21 zweisprachig; 18 Pflicht | — |
| 24 | Vereinsjubiläum | 100 years of the club | Jubiläum, Festrede | formal speech | 23 all; 22 Notar; 19 Schlichtung | — |
| 25 | Selbstbestimmung | a friend's story about women's rights at home and here | Gleichberechtigung, Selbstbestimmung, Opfer, Schuld | nominal style | 24 all; 23 Meldestelle; 20 Elterngeld | both: handled with care; where to get help in Germany |
| 26 | Behördenwiderspruch | appealing a decision | Widerspruch, fristgerecht | formal letters | 25 all; 24 Jubiläum; 21 mischen | — |
| 27 | Besuch aus der Heimat | showing Leipzig to the family | Stadtführung, erklären | particles | 26 all; 25 Urlaub; 22 Testament | both: two cultures at one table |
| 28 | Ein Vortrag | you speak at the VHS | Vortrag, Folien | extended attributes | 27 all; 26 Widerspruch; 23 Rassismus | — |
| 29 | VHS-Prüfung | the course exam | bestehen | nominal style | 28 all; 27 Besuch; 24 Festrede | — |
| 30 | Fünf Jahre Leipzig | review | (review mostly) | all C1 | everything of C1 | — |

## C2 — mastery (register, irony, idioms, dialect, rhetoric)

| # | Title | Situation | New (examples) | Grammar | Reviewed | Clash |
|---|---|---|---|---|---|---|
| 01 | Die Festrede | toast at a wedding | liebe Gäste | rhetoric | C1-30 all; C1-28 Vortrag; C1-24 Jubiläum | — |
| 02 | Ironie im Büro | understatement | nicht schlecht = very good | particles in irony | 01 all; C1-29 Prüfung; C1-26 Widerspruch | — |
| 03 | Fernsehinterview | the club on MDR | Stellungnahme | register | 02 all; 01 Rede; C1-23 Rassismus | — |
| 04 | Gehaltsverhandlung | firmly | Gegenangebot | Konjunktiv II rhetoric | 03 all; 02 Ironie; C1-21 zweisprachig | — |
| 05 | Sächsisch verstehen | the Saxon grandpa | Dialektwörter | dialect | 04 all; 03 Interview; C1-19 Hecke | — |
| 06 | Kabarett | political cabaret | Pointe, Satire | wordplay | 05 all; 04 Verhandlung; C1-17 Kredit | — |
| 07 | Brief an den Bürgermeister | a formal complaint | Sehr geehrter Herr Oberbürgermeister | formal register | 06 all; 05 Sächsisch; C1-15 Demo | — |
| 08 | Lesekreis | a novel discussed | Figur, Erzähler | literary language | 07 all; 06 Kabarett; C1-13 Trainer | — |
| 09 | Redewendungen | idioms at the right moment | Da steppt der Bär | idioms | 08 all; 07 Brief; C1-11 Datenschutz | — |
| 10 | Vor Gericht | a small-claims hearing | Klage, Vergleich | legal register | 09 all; 08 Roman; C1-09 Facharzt | — |
| 11 | Das Familienunternehmen | Herr Yilmaz's shop passes on | Nachfolge, Übergabe | nominal style | 10 all; 09 idioms; C1-07 Schwiegereltern | — |
| 12 | Ein Vortrag an der Uni | the engineer / the nurse lectures | Fachsprache | academic register | 11 all; 10 Gericht; C1-05 TÜV | — |
| 13 | Kinder erziehen | rules, screens, grandparents | Grenzen, Medienzeit | particles | 12 all; 11 Nachfolge; C1-20 Geburt | both: discipline differs |
| 14 | Geschichte mit Sorgfalt | Stolpersteine, remembrance | Gedenken, Verantwortung | register | 13 all; 12 Vortrag; C1-18 Kant | — |
| 15 | Vereinsvorsitz | you chair the club | Satzung, Antrag | formal procedure | 14 all; 13 Erziehung; C1-24 Jubiläum | — |
| 16 | Kulturelles Missverständnis | a joke that went wrong | Fettnäpfchen | idioms | 15 all; 14 Gedenken; C1-27 Besuch | both |
| 17 | Journalistin fragt | about migrants in Leipzig | Klischee, Erfahrung | register | 16 all; 15 Vorsitz; C1-23 Rassismus | — |
| 18 | Arzt-Gespräch | a diagnosis in detail | zweite Meinung | medical register | 17 all; 16 Fettnäpfchen; C1-16 Therapie | — |
| 19 | Ferienhaus teilen | costs among friends | Kostenaufteilung | Konjunktiv II | 18 all; 17 Journalistin; C1-25 Urlaub | — |
| 20 | Ein Freund in der Krise | listening and helping | für dich da sein | particles | 19 all; 18 Diagnose; C1-16 Burnout | — |
| 21 | Heimatbesuch | back in Bitola / in Syria's diaspora | Heimat, fremd geworden | register shifts | 20 all; 19 Ferienhaus; C1-27 Besuch | both: reverse culture shock |
| 22 | Heimat — was ist das? | the debate | Zugehörigkeit | abstract nouns | 21 all; 20 Krise; 14 Gedenken | — |
| 23 | Stadtrat | speaking at a council meeting | Antrag, Bürgerfragestunde | rhetoric | 22 all; 21 Heimat; C1-14 Wahl | — |
| 24 | Sprache am Arbeitsplatz | correcting register politely | du/Sie im Team | register | 23 all; 22 Zugehörigkeit; 12 Vortrag | — |
| 25 | Ein Gedicht | reading Rilke aloud | Reim, Rhythmus | poetic language | 24 all; 23 Stadtrat; 08 Lesekreis | — |
| 26 | Die Erbschaft von Frau Becker | the flat changes hands | Nachlass | legal register | 25 all; 24 Sprache; 10 Gericht | — |
| 27 | Bleiben oder gehen | the big decision | Abwägung | Konjunktiv | 26 all; 25 Rilke; 21 Heimatbesuch | — |
| 28 | Abschied von Frau Becker | her farewell | Sie werden mir fehlen | set phrases | 27 all; 26 Nachlass; 22 Heimat | — |
| 29 | Die Rede zum Jubiläum | ten years in Germany | Rückblick | rhetoric | 28 all; 27 bleiben; 01 Festrede | — |
| 30 | Zehn Jahre | review: the whole story | (review only) | all C2 | everything | — |

**Language check:** the proofreader on German (LanguageTool) and on the Macedonian and Arabic narrator lines.
