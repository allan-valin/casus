/*
 * Progression after Duolingo (Allan, 2026-10-20: "give extra lesson a % and every exercise EXP for level up (that
 * does nothing, just cosmetic), also achievements"): XP for every answer in Learn and the drills, levels further apart
 * as they rise, a streak of days practised, and achievements. All of it lives in this browser (and in the progress
 * file the Learn tab saves); it unlocks nothing.
 */
export const KEY = 'casus:progression';
export const XP = { right: 10, wrong: 1, lesson: 50 };

/** level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000, 1500… */
export function levelOf(xp) {
  let n = 1;
  while (50 * (n + 1) * n <= xp) n += 1;
  return { level: n, from: 50 * n * (n - 1), to: 50 * (n + 1) * n };
}

const dayOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const prevDay = (key) => { const [y, m, d] = key.split('-').map(Number); return dayOf(new Date(y, m - 1, d - 1)); };

function streakFrom(days, today) {
  // today not yet practised: the streak is yesterday's, still alive
  let k = days[today] ? today : prevDay(today);
  let n = 0;
  while (days[k]) { n += 1; k = prevDay(k); }
  return n;
}

const fresh = () => ({ xp: 0, answers: 0, right: 0, row: 0, best: 0, lessonsDone: 0, days: {}, kinds: [], langs: [], unlocked: {} });

// icon, then a test of the state (s: the state, streak: days in a row); names and descriptions are in i18n
// (ach.<id>, ach.<id>.d)
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', test: (s) => s.right >= 1 },
  { id: 'xp100', icon: '⭐', test: (s) => s.xp >= 100 },
  { id: 'xp1000', icon: '🌟', test: (s) => s.xp >= 1000 },
  { id: 'xp10000', icon: '💫', test: (s) => s.xp >= 10000 },
  { id: 'xp50000', icon: '🏛️', test: (s) => s.xp >= 50000 },
  { id: 'row10', icon: '🎯', test: (s) => s.best >= 10 },
  { id: 'row50', icon: '🏹', test: (s) => s.best >= 50 },
  { id: 'row200', icon: '🦅', test: (s) => s.best >= 200 },
  { id: 'streak3', icon: '🔥', test: (s, streak) => streak >= 3 },
  { id: 'streak7', icon: '📅', test: (s, streak) => streak >= 7 },
  { id: 'streak30', icon: '🗓️', test: (s, streak) => streak >= 30 },
  { id: 'streak100', icon: '🌋', test: (s, streak) => streak >= 100 },
  { id: 'lesson1', icon: '📗', test: (s) => s.lessonsDone >= 1 },
  { id: 'lesson10', icon: '📚', test: (s) => s.lessonsDone >= 10 },
  { id: 'lesson50', icon: '🎓', test: (s) => s.lessonsDone >= 50 },
  { id: 'lesson200', icon: '📜', test: (s) => s.lessonsDone >= 200 },
  { id: 'drills5', icon: '🧩', test: (s) => s.kinds.filter((k) => k.startsWith('drill:')).length >= 5 },
  { id: 'drills12', icon: '🧠', test: (s) => s.kinds.filter((k) => k.startsWith('drill:')).length >= 12 },
  { id: 'langs3', icon: '🌍', test: (s) => s.langs.length >= 3 },
  { id: 'langs8', icon: '🗺️', test: (s) => s.langs.length >= 8 },
  { id: 'answers1000', icon: '✍️', test: (s) => s.answers >= 1000 },
  { id: 'day500', icon: '⚡', test: (s, streak, today) => (s.days[today] ?? 0) >= 500 },
];

export function createProgression(storage, now = () => new Date()) {
  let state = fresh();
  try { const raw = storage?.getItem(KEY); if (raw) state = { ...fresh(), ...JSON.parse(raw) }; } catch { /* none */ }
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(state)); } catch { /* not kept */ } };
  const today = () => dayOf(now());

  function check() {
    const got = [];
    const st = streakFrom(state.days, today());
    for (const a of ACHIEVEMENTS) if (!state.unlocked[a.id] && a.test(state, st, today())) { state.unlocked[a.id] = today(); got.push(a.id); }
    return got;
  }

  return {
    get state() { return state; },
    streak: () => streakFrom(state.days, today()),
    level: () => levelOf(state.xp),
    /** one answer: { correct, lang, kind: 'learn' | 'drill:<name>', lessonDone } → { xp, levelUp, unlocked } */
    award({ correct, lang, kind = 'learn', lessonDone = false }) {
      const before = levelOf(state.xp).level;
      const xp = (correct ? XP.right : XP.wrong) + (lessonDone ? XP.lesson : 0);
      state.xp += xp;
      state.answers += 1;
      if (correct) { state.right += 1; state.row += 1; state.best = Math.max(state.best, state.row); } else state.row = 0;
      if (lessonDone) state.lessonsDone += 1;
      state.days[today()] = (state.days[today()] ?? 0) + xp;
      if (lang && !state.langs.includes(lang)) state.langs.push(lang);
      if (kind && !state.kinds.includes(kind)) state.kinds.push(kind);
      const unlocked = check();
      save();
      const after = levelOf(state.xp).level;
      return { xp, levelUp: after > before ? after : null, unlocked };
    },
    /** a progress file's progression: the larger of each count, every day and achievement of both */
    merge(other) {
      if (!other || typeof other !== 'object') return;
      for (const k of ['xp', 'answers', 'right', 'best', 'lessonsDone']) state[k] = Math.max(state[k] ?? 0, other[k] ?? 0);
      for (const [d, v] of Object.entries(other.days ?? {})) state.days[d] = Math.max(state.days[d] ?? 0, v);
      for (const k of ['kinds', 'langs']) state[k] = [...new Set([...(state[k] ?? []), ...(other[k] ?? [])])];
      state.unlocked = { ...(other.unlocked ?? {}), ...state.unlocked };
      check();
      save();
    },
  };
}

const qKey = (item) => {
  const s = `${item.prompt ?? ''}|${(item.furi ?? []).map(([t]) => t).join('')}|${item.answer ?? ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
};

/** a lesson's record after one answer: { right, total } as before, plus the questions answered right (short keys) and
 * how many the lesson has (`of`); done: this answer finished the lesson */
export function lessonAnswer(rec, item, correct, of) {
  const r = { right: 0, total: 0, ok: [], ...(rec ?? {}) };
  const was = completion(r) === 100;
  const ok = new Set(r.ok ?? []);
  if (correct) ok.add(qKey(item));
  const next = { ...r, right: r.right + (correct ? 1 : 0), total: r.total + 1, ok: [...ok], of: Math.max(r.of ?? 0, of ?? 0) || undefined };
  return { rec: next, done: !was && completion(next) === 100 };
}

/** the lesson's % done, or null before anything is known */
export function completion(rec) {
  if (!rec?.of || !rec.ok) return null;
  // (1% as soon as anything is right; 100% only when everything is)
  return rec.ok.length >= rec.of ? 100 : rec.ok.length ? Math.max(1, Math.floor((100 * rec.ok.length) / rec.of)) : 0;
}
