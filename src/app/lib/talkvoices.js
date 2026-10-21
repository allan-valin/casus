/* Conversation practice: one pitch per character voice (Allan, 2026-10-21: "alter pitch to make another
 * character"). The course's voices name Piper models; until each is downloadable, every character speaks with the
 * language's own voice tier at its own pitch: a voice's `pitch` if the story bible sets one, else higher for
 * female voices, and voices that would sound alike are spread apart. */
export function voicePitches(course) {
  const out = {};
  const chars = (course?.voices ?? []).filter((v) => v.role === 'character');
  // a pitch the story bible sets is kept exactly: the writer spread those voices by pitch and speed together
  // (Allan, 2026-10-22: pushing set pitches around made Sara and the protagonist sound alike in B1-20)
  for (const v of chars) if (v.pitch != null) out[v.id] = v.pitch;
  const used = Object.values(out);
  const near = (p) => used.some((u) => Math.abs(u - p) < 0.06);
  for (const v of chars) {
    if (v.pitch != null) continue;
    const base = v.gender === 'f' ? 1.25 : 1;
    let p = base;
    // nearest free pitch, alternating below and above, within a range that still sounds human; never loops forever
    for (let k = 1; near(p) && k <= 20; k += 1) p = Math.round((base + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 0.06) * 100) / 100;
    p = Math.min(1.6, Math.max(0.6, p));
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

/** how much slower a speaker talks (an older character: a voice's `speed` in the story bible), 1 by default */
export function speedOf(course, unit, speaker) {
  const id = speaker === 'protagonist' ? course?.protagonist?.[unit?.protagonist] : course?.cast?.[speaker]?.voice;
  return (course?.voices ?? []).find((v) => v.id === id)?.speed ?? 1;
}
