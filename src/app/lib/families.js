/* Language families for the language list behind the gear (Allan, 2026-10-22: every language of all three sites, in
 * collapsible family groups — the sites keep their own order; this only groups the menu). Linguistic families; the
 * small ones stay separate rather than being lumped by region. */
export const FAMILIES = [
  { id: 'romance', codes: ['la', 'pt', 'es', 'fr', 'it', 'ro'],
    name: { en: 'Latin and Romance', pt: 'Latim e românicas', de: 'Latein und romanische Sprachen', mk: 'Латински и романски', ar: 'اللاتينية واللغات الرومانسية' } },
  { id: 'germanic', codes: ['de', 'en', 'nl', 'sv', 'is'],
    name: { en: 'Germanic', pt: 'Germânicas', de: 'Germanische Sprachen', mk: 'Германски', ar: 'اللغات الجرمانية' } },
  { id: 'slavic', codes: ['ru', 'uk', 'pl', 'cs', 'sh', 'mk'],
    name: { en: 'Slavic', pt: 'Eslavas', de: 'Slawische Sprachen', mk: 'Словенски', ar: 'اللغات السلافية' } },
  { id: 'hellenic', codes: ['grc', 'el'],
    name: { en: 'Greek', pt: 'Grego', de: 'Griechisch', mk: 'Грчки', ar: 'اليونانية' } },
  { id: 'baltic', codes: ['lt'],
    name: { en: 'Baltic', pt: 'Bálticas', de: 'Baltische Sprachen', mk: 'Балтички', ar: 'اللغات البلطيقية' } },
  { id: 'indoiranian', codes: ['sa', 'hi', 'bn', 'fa'],
    name: { en: 'Indo-Iranian', pt: 'Indo-iranianas', de: 'Indoiranische Sprachen', mk: 'Индоирански', ar: 'اللغات الهندية الإيرانية' } },
  { id: 'uralic', codes: ['fi', 'hu'],
    name: { en: 'Uralic', pt: 'Urálicas', de: 'Uralische Sprachen', mk: 'Уралски', ar: 'اللغات الأورالية' } },
  { id: 'turkic', codes: ['tr'],
    name: { en: 'Turkic', pt: 'Túrquicas', de: 'Turksprachen', mk: 'Туркиски', ar: 'اللغات التركية' } },
  { id: 'semitic', codes: ['ar'],
    name: { en: 'Semitic', pt: 'Semíticas', de: 'Semitische Sprachen', mk: 'Семитски', ar: 'اللغات السامية' } },
  { id: 'japonic', codes: ['ja'],
    name: { en: 'Japonic', pt: 'Japônicas', de: 'Japonische Sprachen', mk: 'Јапонски', ar: 'اللغات اليابانية' } },
  { id: 'koreanic', codes: ['ko'],
    name: { en: 'Koreanic', pt: 'Coreânicas', de: 'Koreanische Sprachen', mk: 'Корејски', ar: 'اللغات الكورية' } },
  { id: 'sinitic', codes: ['zh'],
    name: { en: 'Chinese (Sinitic)', pt: 'Chinesas (siníticas)', de: 'Sinitische Sprachen', mk: 'Кинески (синитски)', ar: 'اللغات الصينية' } },
  { id: 'austronesian', codes: ['id', 'tl'],
    name: { en: 'Austronesian', pt: 'Austronésias', de: 'Austronesische Sprachen', mk: 'Австронезиски', ar: 'اللغات الأسترونيسية' } },
  { id: 'austroasiatic', codes: ['vi'],
    name: { en: 'Austroasiatic', pt: 'Austroasiáticas', de: 'Austroasiatische Sprachen', mk: 'Австроазиски', ar: 'اللغات الأسترو آسيوية' } },
  { id: 'bantu', codes: ['sw'],
    name: { en: 'Bantu (Niger–Congo)', pt: 'Bantas (nígero-congolesas)', de: 'Bantusprachen', mk: 'Банту', ar: 'لغات البانتو' } },
];

export const familyOf = (code) => FAMILIES.find((f) => f.codes.includes(code)) ?? null;
