/** FNV-1a, 32-bit, as 8 hex digits. */
export function textHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Debounced writer over an injected storage (spec §9). A storage that throws
 * (private window, quota) turns persistence off silently: the reader still reads.
 */
export function createAutosave({ storage, key, delay = 300, schedule = setTimeout, cancel = clearTimeout }) {
  let timer = null;
  let latest = null;

  function write() {
    timer = null;
    if (latest === null) return;
    try { storage.setItem(key, JSON.stringify(latest)); } catch { /* persistence off */ }
    latest = null;
  }

  return {
    save(obj) {
      latest = obj;
      if (timer !== null) cancel(timer);
      timer = schedule(write, delay);
    },
    flush() { if (timer !== null) cancel(timer); write(); },
    pending() { return latest !== null; },
    loaded() {
      try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
  };
}

/** A saved object is applied only to the exact text it was saved for. */
export function restore(saved, text) {
  if (!saved || typeof saved !== 'object' || saved.text !== text) return null;
  return saved;
}
