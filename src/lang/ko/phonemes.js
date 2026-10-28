/*
 * Korean for the Piper kss voice (CC BY-NC-SA; Allan 2026-10-21: NC is fine). The voice was trained on espeak-ng's
 * Korean IPA. The browser has no espeak, and hangul is not said as spelled (같이 [가치]), so the Conversation build
 * computes each line's sounds once (tools/ko_sounds.py: pronounced hangul → espeak-ng) and the course carries them.
 * Text from elsewhere has none: the caller falls back to the browser's own voice and says why.
 */
export function phonemeIds(text, map, { ipa = false } = {}) {
  if (!ipa) throw new Error('Korean needs the sounds the course carries (none for this text)');
  const ids = [map['^'][0], map._[0]];
  for (const ch of text) if (map[ch]) ids.push(map[ch][0], map._[0]);
  ids.push(map.$[0]);
  return ids;
}
