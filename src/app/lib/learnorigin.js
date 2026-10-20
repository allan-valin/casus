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
