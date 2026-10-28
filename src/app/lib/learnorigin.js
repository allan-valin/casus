/* The Learn list puts lessons from human sources first and the AI-written (✦) and generated (⚙) ones in their own
 * section at the bottom (Allan, 2026-10-20). A topic with both kinds appears in both, each with its own lessons. */
const made = (e) => !!(e.ai || e.generated);

export function byOrigin(topics) {
  const human = [], machine = [];
  for (const tp of topics ?? []) {
    const h = tp.lessons.filter((e) => !made(e)), m = tp.lessons.filter(made);
    if (h.length) human.push({ ...tp, lessons: h, key: `${tp.id}:h` });
    if (m.length) machine.push({ ...tp, lessons: m, key: `${tp.id}:m` });
  }
  return { human, made: machine };
}

const GROUPS = ['course', 'reader', 'school', 'university'];

/** the Learn list in sections: human lessons by kind of source (a topic's `group`; courses for learners when it has
 * none), then everything AI-written or generated; [{ id, topics }] in that order, empty ones left out */
export function learnSections(topics) {
  const { human, made: machine } = byOrigin(topics);
  const out = GROUPS.map((id) => ({ id, topics: human.filter((tp) => (GROUPS.includes(tp.group) ? tp.group : 'course') === id) }));
  // generated from data above, AI-written last, each its own section (Allan, 2026-10-28)
  const only = (keep, tag) => machine.map((tp) => ({ ...tp, lessons: tp.lessons.filter(keep), key: `${tp.id}:${tag}` })).filter((tp) => tp.lessons.length);
  out.push({ id: 'generated', topics: only((e) => !e.ai, 'g') });
  out.push({ id: 'ai', topics: only((e) => !!e.ai, 'a') });
  return out.filter((s) => s.topics.length);
}

/** the level as a sequence of numbered lessons, ignoring the sources' own headers (Allan, 2026-10-28). Lessons a
 * Conversation unit practises come in the order of the units, one group per unit (talkLinks: lesson id → units);
 * the rest follow in groups of four, human-written before generated before AI-written, each source in its own
 * order. [{ n, key, unit?, unitTitle?, lessons }] */
export function learnOrder(level, talkLinks = {}, size = 4) {
  const seen = new Set(), all = [];
  for (const tp of level?.topics ?? []) for (const e of tp.lessons) if (!seen.has(e.id)) { seen.add(e.id); all.push(e); }
  const unitOf = (e) => [...(talkLinks?.[e.id] ?? [])].sort((a, b) => String(a.unit).localeCompare(String(b.unit), 'en', { numeric: true }))[0];
  const groups = new Map();
  for (const e of all) {
    const u = unitOf(e);
    if (!u) continue;
    if (!groups.has(u.unit)) groups.set(u.unit, { unit: u.unit, unitTitle: u.title, lessons: [] });
    groups.get(u.unit).lessons.push(e);
  }
  const out = [...groups.values()].sort((a, b) => a.unit.localeCompare(b.unit, 'en', { numeric: true }));
  const rank = (e) => (e.ai ? 2 : e.generated ? 1 : 0);
  const rest = all.filter((e) => !unitOf(e)).map((e, i) => [e, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([e]) => e);
  for (let i = 0; i < rest.length; i += size) out.push({ lessons: rest.slice(i, i + size) });
  return out.map((g, i) => ({ ...g, n: i + 1, key: `order:${level?.id}:${i + 1}`, kind: 'order' }));
}
