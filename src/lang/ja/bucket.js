/* Shard key for Japanese: mirror of tools/casus_build/ja/bucket.py (fixture tests/fixtures/ja.buckets.json). */
export function bucket(form) {
  const cps = [...form].slice(0, 2).map((c) => c.codePointAt(0));
  const h = (cps[0] * 31 + (cps.length > 1 ? cps[1] : 0)) % 2048;
  return `b${String(h).padStart(4, '0')}`;
}
