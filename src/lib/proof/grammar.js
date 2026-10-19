/* Grammar from LanguageTool (open source, LGPL): the server on this computer first (tools/languagetool.sh, port
 * 8081), the free public API otherwise (no account; about 20 requests a minute, 20 KB each, and the text goes to
 * their servers). Allan, 2026-10-19: "both, local first". */
export const LT_CODE = { pt: 'pt-BR', de: 'de-DE', el: 'el-GR', ru: 'ru-RU', pl: 'pl-PL', ar: 'ar', ja: 'ja-JP', zh: 'zh-CN' };
export const LOCAL = 'http://localhost:8081/v2/check';
export const PUBLIC = 'https://api.languagetool.org/v2/check';

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

async function ask(url, text, language, fetchImpl, ms) {
  const body = new URLSearchParams({ text, language, enabledOnly: 'false', level: 'picky' });   // picky: the stricter rules (crase, style)
  const res = await withTimeout(fetchImpl(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }), ms);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

/** { engine: 'local' | 'public' | null, issues: [{ kind: 'grammar', offset, length, message, replacements, rule, category }] } */
export async function checkGrammar(text, code, { fetchImpl, localMs = 1500, publicMs = 15000, allowPublic = true } = {}) {
  const language = LT_CODE[code];
  if (!language || !text.trim()) return { engine: null, issues: [] };
  let engine = 'local';
  let json;
  try {
    json = await ask(LOCAL, text, language, fetchImpl, localMs);
  } catch {
    if (!allowPublic) return { engine: null, issues: [], error: 'local server not running' };
    engine = 'public';
    json = await ask(PUBLIC, text.slice(0, 20000), language, fetchImpl, publicMs);
  }
  const issues = (json.matches ?? []).map((m) => ({
    kind: 'grammar', offset: m.offset, length: m.length, message: m.message, short: m.shortMessage || '',
    replacements: (m.replacements ?? []).slice(0, 5).map((r) => r.value), rule: m.rule?.id ?? '', category: m.rule?.category?.name ?? '',
  }));
  return { engine, issues };
}
