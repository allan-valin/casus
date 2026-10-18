/*
 * "What is happening" — copied from Desembarque's review page (feedback E, 2026-10-18;
 * Allan, 2026-10-16: "after clicking there's no feedback, and you think nothing happened").
 * One line per action and its outcome; a busy flag while any request is unanswered (the
 * page draws a bar across the top); after four seconds of waiting, one line per busy spell
 * saying the machine is slow, said again only after a request has come back quickly.
 *
 * Every mutation is untracked: `pending += 1` compiles to a read-then-write, and a read inside
 * the effect that fires the first fetch would make that effect depend on the counter and re-run
 * (and re-fetch) each time it moves.
 */
import { untrack } from 'svelte';
export function createActivity({ now = () => Date.now(), schedule = (fn, ms) => setTimeout(fn, ms), cancel = (t) => clearTimeout(t), cap = 400, slowMs = 4000, slowText = () => 'the server is slow to answer; the data is coming, just later' } = {}) {
  const lines = $state([]);
  let pending = $state(0);
  let slowSpell = false;

  function stamp() {
    const d = new Date(now());
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
  }
  function say(msg, kind = '') {
    untrack(() => {
      lines.push({ at: stamp(), msg, kind });
      while (lines.length > cap) lines.shift();
    });
  }
  function wrap(fetchImpl) {
    return (url, opts) => {
      const t0 = now();
      untrack(() => { pending += 1; });
      const timer = schedule(() => {
        if (!slowSpell) { slowSpell = true; say(slowText(), 'slow'); }
      }, slowMs);
      const done = () => { cancel(timer); untrack(() => { pending -= 1; }); if (now() - t0 < 2000) slowSpell = false; };
      return Promise.resolve().then(() => fetchImpl(url, opts)).then(
        (r) => { done(); return r; },
        (e) => { done(); say(`failed: ${e?.message ?? e} (${url})`, 'err'); throw e; },
      );
    };
  }
  return {
    get lines() { return lines; },
    get busy() { return pending > 0; },
    say,
    wrap,
  };
}
