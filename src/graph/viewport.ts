import type { Core } from 'cytoscape';
import { appData } from '../data/appData';
import { lineage } from '../data/graph';
import { genAxis, genLabelPos, orient, spreadAxis, type Orientation } from './orient';

// Compacted-lineage spacing: members within a band (vs the full graph's ~104),
// and the gap between consecutive stage bands (vs the full graph's 460).
const FOCUS_PITCH = 88;
const FOCUS_BAND_PITCH = 210;

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
 * else is hidden in this mode. Original order (base spread coordinate) and stage
 * order (base generation coordinate) are both preserved, keeping crossings low.
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
  cy.batch(() => {
    gens.forEach((genX, band) => {
      const slugs = byGen.get(genX)!.sort((a, b) => layout.positions[a].y - layout.positions[b].y);
      const start = -((slugs.length - 1) / 2) * FOCUS_PITCH;
      const g = band * FOCUS_BAND_PITCH;
      slugs.forEach((slug, i) => {
        cy.$id(slug).position(orient({ x: g, y: start + i * FOCUS_PITCH }, orientation));
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
