# Time Stranger Tree

An interactive evolution-tree explorer for **Digimon Story: Time Stranger** —
a real-time graph of the full 475-Digimon evolution network with search,
filters, lineage focus mode, and an evolution route planner.

`data/` (digimon.json + icons) is produced by the companion scraper repo
(`time-stranger-scraper`); see that repo's README for the database schema.
All game content belongs to Bandai Namco; this is a fan project.

## Usage

```sh
npm install
npm run dev       # start the app (auto-syncs data/ → public/ + thumbnails)
npm test          # data-layer test suite (route planner, graph, invariants)
npm run build     # production build to dist/
npm run layout    # recompute graph positions (ELK) — run after a re-scrape
```

After a re-scrape: overwrite `data/` with the scraper's output, then run
`npm run layout` (positions) — `npm run dev`/`build` re-sync thumbnails
automatically.

## Controls

- **Click** a Digimon: detail panel + soft lineage highlight. **Double-click / F**: isolate its full lineage (Esc or browser Back exits).
- **/** or **Ctrl+K**: search (Enter selects, Shift+Enter focuses the lineage).
- **Generation rail** (top of canvas): jump the viewport to any generation column; a live indicator tracks where you are.
- **Filters**: dim by generation, attribute, ridable/item/jogress/bond.
- **Route**: pick From/To → step-by-step evolution plan with every requirement
  (stats, items, Jogress partners), de-digivolve steps included; up to 3
  alternative routes. Deep-linkable: `#/d/{slug}`, `#/f/{slug}`,
  `#/route/{from}/{to}`.
- **Codex** (Tree/Codex switch, top-left): a sortable table of all 475 Digimon
  with dex number, generation, attribute and the seven stats + total (Lv.1/Lv.99).
  Filter by name/number, generation or attribute; click any row to jump into the
  Tree focused on that lineage. Deep-linkable: `#/codex`.
- **☾/☀** toggles the light/dark chrome theme (the graph viewport stays dark in both).

## Architecture notes

- React + Vite + TypeScript; Cytoscape.js canvas with precomputed ELK layout
  (`src/generated/layout.json`, committed).
- The evolution graph is **not a tree**: mode changes and X-Antibody forms make
  2-cycles. All traversals are cycle-safe.
- Route planner: Dijkstra + Yen K-shortest over a bidirected graph (forward
  digivolve arcs carry the target's conditions; de-digivolve arcs are free)
  with integer costs — devolve 100, evolve 105, item +150, jogress +200.
- The pure data layer (`src/data/`) has zero runtime dependencies and full
  vitest coverage, including a data-invariants suite that gates future
  scraper re-drops.

## Design system

**Colour comes from the Digimon, not the chrome.** The neutrals are a quiet warm
graphite/off-white stage (near-zero chroma, OKLCH); the accent is repainted with
the *selected* sprite's own signature hue, so the whole UI shifts as you explore.
One humanist family (Hanken Grotesk) carries everything, hierarchy by weight.

- **Chromatic engine** — `scripts/sync-data.mjs` extracts each sprite's dominant
  OKLCH hue+chroma at data-sync time (defeating the icons' chromatic-aberration
  glitch with a pre-blur) into `src/generated/colors.json`. At runtime
  `src/theme/chroma.ts` + `useChromaticAccent` set `--accent-h` / `--accent-c`
  on selection; the theme owns `--accent-l`, so the accent reads in both themes.
  The Cytoscape selection glow uses each node's `data(accent)` hex.
- **Themes** — `src/theme/theme.ts` toggles a `data-theme` attribute on `<html>`
  (persisted, system-default, anti-flash inline script in `index.html`).
  `tokens.css` overrides neutrals/accents on `[data-theme='light']`. The graph
  canvas is themed too — a near-black "night" viewport in dark, warm parchment
  in light (`--graph-bg`) — with bright node cards so sprites and their glow
  always lead. Cytoscape can't read CSS vars, so its two palettes live in
  `GRAPH_PALETTES` (`attribute.ts`) and `GraphCanvas` re-applies them via
  `cy.style()` on theme change; keep `--graph-bg` in step with the palette `bg`.
- **Tokens** — `src/theme/tokens.css` (`:root`). OKLCH neutrals + accent ramp,
  `--radius-*`, `--z-*`, `--shadow-dropdown|panel`, `--transition|-fast`, and one
  global `:focus-visible` ring. Prefer a token over a literal value. Attribute
  colours live in `src/theme/attribute.ts` (Cytoscape needs them in JS; injected
  as `--attr-*` on boot) — retuned for mutual separation, and never the *sole*
  channel (legend names, resistance markers, panel labels back them up).
- **`.label`** — global utility for the uppercase font-display group label.
  Apply as `className={\`label ${styles.x}\`}`; put only deltas in the module.
- **Primitives** — `src/ui/`. Presentational, prop-driven, no store coupling:
  - `MonRow` — the canonical "pick a Digimon" row (`inline` / `active` /
    `borderColor` variants; container may set `--row-hover`).
  - `SegButton` — segmented toolbar/action toggle (`size` `sm` | `md`).
  - `Panel` / `CloseButton`, `Chip`, `Collapse`, `BrandMark`, `ThemeToggle`.
