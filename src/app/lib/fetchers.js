async function getJSON(fetchImpl, url) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export function makeFetchShard(fetchImpl, base = '/data') {
  // shard names are Greek letters for Greek; the path is encoded for the server, decoded by it
  return (name) => getJSON(fetchImpl, `${base}/forms/${name}.json`);
}

export function makeFetchFile(fetchImpl, base = '/data') {
  return (name) => getJSON(fetchImpl, `${base}/${name}`);
}

/** the extra data files a language ships, as its manifest names them (German: expressions and the files beside
 * them, flagged by `expressions`; others: `files`); null when it ships none, so nothing is requested in vain */
export function fileFetcherFor(manifest, fetchImpl, base = '/data') {
  const listed = new Set(manifest?.files ?? []);
  if (!manifest?.expressions && !listed.size) return null;
  const fetchFile = makeFetchFile(fetchImpl, base);
  return (name) => (manifest.expressions || listed.has(name) ? fetchFile(name) : Promise.resolve(null));
}

export function loadManifest(fetchImpl, base = '/data') {
  return getJSON(fetchImpl, `${base}/manifest.json`);
}

export function loadLemmas(fetchImpl, base = '/data') {
  return getJSON(fetchImpl, `${base}/lemmas.json`);
}

/** null when the language has no file (Portuguese until Task 8 of the core plan is built). */
/** null when the language has no IPA file yet. */
export async function loadIpa(fetchImpl, base = '/data') {
  try {
    return await getJSON(fetchImpl, `${base}/ipa.json`);
  } catch {
    return null;
  }
}

export async function loadGlosses(fetchImpl, base = '/data', lang = 'en') {
  try {
    return await getJSON(fetchImpl, `${base}/glosses.${lang}.json`);
  } catch {
    return null;
  }
}
