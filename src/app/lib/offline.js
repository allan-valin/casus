/*
 * Offline dictionaries (Allan, 2026-10-19: "an option to download the dict offline … a download manager to remove
 * languages"). A language's data files go into a Cache Storage cache of their own (casus-data-<code>); the service
 * worker (public/sw.js) answers from it when the network does not. Live Wiktionary answers live in localStorage
 * under casus.live.<code>.<word> and can be cleared here too.
 */
const SIDE = ['manifest.json', 'lemmas.json', 'glosses.en.json', 'glosses.pt.json', 'ipa.json', 'government.json', 'codes.json',
  'drills.json', 'frequency.json', 'phrases.json', 'sounds.json', 'bins.json', 'learn.json', 'expressions.json', 'compounds.json', 'valency.json'];

export const cacheName = (code) => `casus-data-${code}`;

/** every file of a language, relative to its data folder */
export function filesOf(manifest) {
  const files = new Set(SIDE);
  for (const f of manifest?.files ?? []) files.add(f);
  for (const name of Object.keys(manifest?.shards ?? {})) files.add(`forms/${encodeURIComponent(name)}.json`);
  for (let n = 0; n < (manifest?.paradigms?.buckets ?? 0); n += 1) files.add(`paradigms/${n}.json`);
  return [...files];
}

export async function downloadLanguage({ code, base, fetchImpl, caches, onProgress = () => {}, parallel = 6 }) {
  const manifest = await (await fetchImpl(`${base}/manifest.json`)).json();
  const files = filesOf(manifest);
  const cache = await caches.open(cacheName(code));
  let done = 0;
  let stored = 0;
  const queue = [...files];
  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      const url = `${base}/${f}`;
      try {
        const res = await fetchImpl(url);
        if (res.ok) { await cache.put(url, res.clone ? res.clone() : res); stored += 1; }
      } catch { /* a file that fails is fetched online later */ }
      done += 1;
      onProgress(done, files.length);
    }
  }
  await Promise.all(Array.from({ length: parallel }, worker));
  return stored;
}

export async function removeLanguage({ code, caches }) {
  return caches.delete(cacheName(code));
}

/** bytes kept for a language (0 when not downloaded) */
export async function downloadedSize({ code, caches }) {
  if (caches.has && !(await caches.has(cacheName(code)))) return 0;
  const cache = await caches.open(cacheName(code));
  const keys = await cache.keys();
  let bytes = 0;
  for (const k of keys) {
    const res = await cache.match(k.url ?? k);
    const len = Number(res?.headers?.get?.('content-length'));
    bytes += Number.isFinite(len) && len > 0 ? len : 1;
  }
  return bytes;
}

const livePrefix = (code) => `casus.live.${code}.`;
export function liveEntries(storage, code) {
  let n = 0;
  for (let i = 0; i < (storage?.length ?? 0); i += 1) if (storage.key(i)?.startsWith(livePrefix(code))) n += 1;
  return n;
}
export function clearLive(storage, code) {
  const doomed = [];
  for (let i = 0; i < (storage?.length ?? 0); i += 1) { const k = storage.key(i); if (k?.startsWith(livePrefix(code))) doomed.push(k); }
  for (const k of doomed) storage.removeItem(k);
  return doomed.length;
}
