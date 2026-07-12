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
- **Filters**: dim by generation, attribute, ridable/item/jogress/bond.
- **Route**: pick From/To → step-by-step evolution plan with every requirement
  (stats, items, Jogress partners), de-digivolve steps included; up to 3
  alternative routes. Deep-linkable: `#/d/{slug}`, `#/f/{slug}`,
  `#/route/{from}/{to}`.

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
