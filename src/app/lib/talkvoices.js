/* Conversation practice: one pitch per character voice (Allan, 2026-10-21: "alter pitch to make another
 * character"). The course's voices name Piper models; until each is downloadable, every character speaks with the
 * language's own voice tier at its own pitch: a voice's `pitch` if the story bible sets one, else higher for
 * female voices, and voices that would sound alike are spread apart. */
export function voicePitches(course) {
  const out = {};
  const used = [];
  for (const v of course?.voices ?? []) {
    if (v.role !== 'character') continue;
    let p = v.pitch ?? (v.gender === 'f' ? 1.25 : 1);
    while (used.some((u) => Math.abs(u - p) < 0.06)) p = Math.round((p * 0.9) * 100) / 100;
    used.push(p);
    out[v.id] = p;
  }
  return out;
}

/** the pitch a speaker of a unit talks at: the protagonist's form, a cast member's voice, or 1 */
export function pitchOf(course, unit, speaker, pitches = voicePitches(course)) {
  const voice = speaker === 'protagonist' ? course?.protagonist?.[unit?.protagonist] : course?.cast?.[speaker]?.voice;
  return pitches[voice] ?? 1;
}
