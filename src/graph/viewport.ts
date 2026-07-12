import type { Core } from 'cytoscape';
import { appData } from '../data/appData';
import { lineage } from '../data/graph';
import { focusPos, minimizeBandCrossings } from './crossing';
import { genAxis, genLabelPos, orient, spreadAxis, type Orientation } from './orient';

/**
 * Re-place every node for a new orientation without a rebuild. Digimon nodes
 * carry their base coordinates (`bx`/`by`) and simply transpose; generation
 * labels re-derive their off-band position (and swap alignment via `label-rows`)
 * from the generation coordinate they carry.
 */
export function reorientGraph(cy: Core, orientation: Orientation): void {
  cy.batch(() => {
    cy.nodes().forEach((n) => {
      if (n.hasClass('col-label')) {
        n.position(genLabelPos(n.data('gen') as number, orientation));
        n[orientation === 'rows' ? 'addClass' : 'removeClass']('label-rows');
      } else {
        n.position(orient({ x: n.data('bx') as number, y: n.data('by') as number }, orientation));
      }
    });
  });
}

/**
 * Compact the focused lineage: keep each member in its own generation band (so
 * the evolution stages still read as bands), but re-pack members within a band
 * tightly and centered, AND collapse the empty stage gaps by re-indexing the
 * present generations to consecutive bands. Only lineage nodes move; everything
 * else is hidden in this mode. Stage order (base generation coordinate) is
 * preserved; within a band, members are re-sequenced to minimise the link
 * crossings on screen, seeded by — and never regressing past — the base order.
 */
export function compactFocus(cy: Core, focusSlug: string, orientation: Orientation): void {
  const { graph, layout } = appData();
  const lin = lineage(graph, focusSlug);
  const byGen = new Map<number, string[]>();
  for (const slug of lin.nodes) {
    const base = layout.positions[slug];
    if (!base) continue;
    (byGen.get(base.x) ?? byGen.set(base.x, []).get(base.x)!).push(slug);
  }
  const gens = [...byGen.keys()].sort((a, b) => a - b);
  // Seed each band with the stable base spread order, then reorder to cut crossings.
  for (const g of gens) byGen.get(g)!.sort((a, b) => layout.positions[a].y - layout.positions[b].y);
  const ordered = minimizeBandCrossings(gens, byGen, lin.edges, (s) => layout.positions[s].x);
  cy.batch(() => {
    gens.forEach((genX, band) => {
      const slugs = ordered.get(genX)!;
      slugs.forEach((slug, i) => {
        cy.$id(slug).position(orient(focusPos(band, i, slugs.length), orientation));
      });
    });
  });
}

/**
 * A readable opening slab rather than a fit-all sliver: center the short
 * (generation) axis so the bands are balanced, and pin the long (member-spread)
 * axis to its start so the first members of each band are in view. Works for
 * either orientation.
 *
 * layout.bounds is in the base frame (x = generation extent, y = spread extent);
 * both orientations reuse those extents, just on swapped screen axes.
 */
export function resetView(cy: Core, orientation: Orientation, animate = false): void {
  const { bounds } = appData().layout;
  const level = 0.3;
  const gen = genAxis(orientation);
  const spread = spreadAxis(orientation);
  const genSize = gen === 'x' ? cy.width() : cy.height();
  const genCenter = (bounds.minX + bounds.maxX) / 2;
  const pan = {
    [gen]: genSize / 2 - genCenter * level,
    [spread]: 80 - bounds.minY * level,
  } as { x: number; y: number };
  if (animate) {
    cy.animate({ pan, zoom: level, duration: 350, easing: 'ease-out-cubic' });
  } else {
    cy.zoom(level);
    cy.pan(pan);
  }
}
