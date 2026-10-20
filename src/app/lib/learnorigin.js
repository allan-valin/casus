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
  out.push({ id: 'made', topics: machine });
  return out.filter((s) => s.topics.length);
}
