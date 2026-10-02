# Drag-library spike (spec §12 Q2)

Fixture: the nine items of "Caesar · in Galliam · magnam · cum legione · venit · senatus · populus · que · Romanus"
rendered as 24 px-high pills in a wrapping flex container 420 px wide, with `in Galliam` and
`cum legione` each rendered as ONE pill holding two words (a glued chunk).

Measured with a headless Chromium driven by Playwright (`spikes/drag/measure.mjs`): the mouse
presses `venit`, moves to the front of the pool in 20 steps, and at every step the bounding
boxes of all pills are read; (a) = some pill other than the dragged one changed position before
the drop; (d) = no two non-dragged pills overlapped at any step; (b) = the chunk pill moved as
one element to the end; (c) = pills sit on more than one row before and after.

| criterion | svelte-dnd-action | sortablejs |
|---|---|---|
| (a) neighbours slide out of the way while dragging | yes (drag 1 and 2) | yes (drag 1 and 2) |
| (b) a glued two-word pill drags as one item | yes, `in Galliam` moved as one to the end | yes |
| (c) wrapping pool (items reflow across lines) | yes, 2 rows before and after | yes, 2 rows before and after |
| (d) no overlap at any frame | drag 1: none; drag 2 (chunk leaves row 1, pool re-wraps): a transient overlap inside the 150 ms flip | same: none on drag 1, transient on drag 2 |
| (e) keyboard reorder | built in (tab to item, space, arrows) | none |
| lines of code in the page | 19 (3 + a 16-line component) | 13, but imperative DOM; in the app it would need an action wrapper |

Measured 2026-10-02 in Chrome Headless Shell 153 (Playwright 1.x), 20 mouse steps per drag, boxes
read every 40 ms. Both drags ended in the same order on both pages:
`venit Caesar magnam cum legione senatus populus que Romanus in Galliam`.

Decision: DRAG_LIB = svelte-dnd-action, because the two tie on everything measured and it alone
has keyboard reorder and a Svelte-native API (the reflow animation is `animate:flip`, no DOM
bookkeeping). `sortablejs` is uninstalled. The transient overlap on re-wrap is the flip animation
itself and is the same for both; the app's pool keeps `flipDurationMs` short (150 ms).

Re-run: `npx vite spikes/drag --config spikes/drag/vite.config.js` in one shell, then
`npm install --no-save playwright && npx playwright install chromium && node spikes/drag/measure.mjs`.
