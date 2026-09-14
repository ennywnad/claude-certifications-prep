# Visual Study Guide v2

`../study-guide-v2.html` — a single self-contained page, exported from Claude Design.
GitHub Pages serves it as-is (no build step).

Live path once pushed:
`https://ennywnad.github.io/claude-certifications-prep/architect-foundations/study-guide-v2.html`

## What changed from v1

Same content, all of it — 86 worked questions, 34 decision principles, 48 traps,
9 build playbooks, the quick-reference tables. New shell around it:

- **Three-pane desktop layout** — section nav + domain filter on the left, reading
  pane in the middle, a context rail on the right that holds whatever you're
  inspecting (a principle, a pipeline stage's exact flags, a diagram block's trap).
  Below ~980px it collapses to a single scrolling column with the nav as a
  horizontal strip.
- **Triage flow** replaces the wall of principle text blocks: symptom on the left,
  the answer it forces on the right.
- **Task pipelines** replace the numbered step lists: each playbook is a stage grid;
  tapping a stage opens the full step plus the flags, paths and fields it touches.
- **Visual map redrawn and clickable** — 14 diagrams rebuilt as real layout instead
  of fixed-width SVG, so they reflow on a phone. Every block opens its detail in the
  rail; the loop, hook lifecycle, extraction and escalation diagrams step through.
- **Drill** — flashcards over the principles and traps, and a spot-the-trap mode that
  shows one option cold and asks for a verdict before revealing why.
- **Cross-links** — every question links out to the principle that decides it and the
  diagram behind it.
- **Confidence ratings** (Got it / Shaky / No idea) drive per-domain progress bars and
  a review queue. Stored in `localStorage` in that browser only — nothing is uploaded.

## Editing it

The page is compiled from the sources in this folder:

- `Study Guide v2.dc.html` — the app (template + logic)
- `guide-data.js` — all study content, lifted verbatim out of v1's `study-guide.html`
- `diagrams.js` — the interactive diagram specs (the only hand-authored new content)
- `support.js` — runtime

Editing content usually means editing `guide-data.js` (questions, principles, traps,
playbooks, reference rows) or `diagrams.js` (diagram nodes and their detail text), then
recompiling to the single file.
