async function getJSON(fetchImpl, url) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export function makeFetchShard(fetchImpl, base = '/data') {
  return (name) => getJSON(fetchImpl, `${base}/forms/${name}.json`);
}

export function loadManifest(fetchImpl, base = '/data') {
  return getJSON(fetchImpl, `${base}/manifest.json`);
}

export function loadLemmas(fetchImpl, base = '/data') {
  return getJSON(fetchImpl, `${base}/lemmas.json`);
}

/** null when the language has no file (Portuguese until Task 8 of the core plan is built). */
export async function loadGlosses(fetchImpl, base = '/data', lang = 'en') {
  try {
    return await getJSON(fetchImpl, `${base}/glosses.${lang}.json`);
  } catch {
    return null;
  }
}
