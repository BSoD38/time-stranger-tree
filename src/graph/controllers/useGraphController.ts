import { useEffect } from 'react';
import { appData } from '../../data/appData';
import { descendants, edgeKey, lineage } from '../../data/graph';
import { filterSlugs, hasActiveCriteria } from '../../data/search';
import { useStore, type AppState } from '../../state/store';
import { getCy } from '../cyInstance';
import { compactFocus, reorientGraph, resetView } from '../viewport';
import type { Core } from 'cytoscape';

const APPEARANCE_CLASSES =
  'sel dim-soft dim-hard dim-filter hidden lineage-next lineage-prev lineage-prev-thin route-dim route-glow route-glow-devolve route-node route-step-active';

/**
 * Highlight the lineage of `anchor`: nodes/edges outside it get `outsideClass`
 * (hidden / dim-hard / dim-soft), while edges inside are coloured by direction —
 * `lineage-next` for edges leading away from the anchor toward its descendants
 * (evolves-to), `lineage-prev` for edges from its ancestors (evolves-from).
 */
function paintLineage(cy: Core, anchor: string, outsideClass: string, thinPrev = false): void {
  const graph = appData().graph;
  const lin = lineage(graph, anchor);
  const forward = descendants(graph, anchor); // reachable via evolves-to
  cy.nodes().forEach((n) => {
    if (!lin.nodes.has(n.id())) n.addClass(outsideClass);
  });
  cy.edges().forEach((e) => {
    const source = e.source().id();
    if (!lin.nodes.has(source) || !lin.nodes.has(e.target().id())) {
      e.addClass(outsideClass);
      return;
    }
    if (source === anchor || forward.has(source)) e.addClass('lineage-next');
    else e.addClass(thinPrev ? 'lineage-prev lineage-prev-thin' : 'lineage-prev');
  });
}

/**
 * Single appearance controller: recomputes every class layer in one batch on
 * any relevant state change. Precedence is encoded by stylesheet order
 * (dim-filter < dim-soft < dim-hard < route layers < .sel), so stacking
 * classes is safe — no cross-controller races, and a full pass over 475
 * nodes + 1120 edges is ~ms.
 */
function recompute(state: AppState): void {
  const cy = getCy();
  if (!cy) return;
  const db = appData().db;

  cy.batch(() => {
    cy.elements().removeClass(APPEARANCE_CLASSES);

    // focus layer: isolate the lineage. `hideOthers` removes everything else
    // outright (display:none); otherwise it's hard-dimmed to a faint context.
    // Inside the lineage, edges are coloured by direction relative to the anchor.
    if (state.focus) {
      // in the isolated (hide) focus view, de-emphasise the ancestry links a touch
      paintLineage(cy, state.focus, state.hideOthers ? 'hidden' : 'dim-hard', state.hideOthers);
    } else if (state.selected) {
      // soft lineage highlight only outside focus mode
      paintLineage(cy, state.selected, 'dim-soft');
    }

    // filter layer (dim-only; weaker than dim-hard by stylesheet order)
    const criteria = {
      generations: state.generations,
      attributes: state.attributes,
      special: state.special,
    };
    if (hasActiveCriteria(criteria)) {
      const matching = filterSlugs(db, criteria);
      cy.nodes().forEach((n) => {
        if (!matching.has(n.id())) n.addClass('dim-filter');
      });
    }

    // route layer: route elements at full strength, everything else either
    // hidden (display:none) or dimmed, per the `hideOthers` preference
    const route = state.routeOpen ? state.route.routes?.[state.route.active] : undefined;
    if (route && route.steps.length) {
      const outside = state.hideOthers ? 'hidden' : 'route-dim';
      cy.elements().addClass(outside);
      route.steps.forEach((step, i) => {
        // a dedigivolve step from u to v travels the forward edge v->u
        const id =
          step.kind === 'digivolve' ? edgeKey(step.from, step.to) : edgeKey(step.to, step.from);
        const edge = cy.$id(id);
        edge.removeClass(outside);
        edge.addClass(step.kind === 'digivolve' ? 'route-glow' : 'route-glow-devolve');
        if (i === state.route.activeStep) edge.addClass('route-step-active');
        cy.$id(step.from).removeClass(outside).addClass('route-node');
        cy.$id(step.to).removeClass(outside).addClass('route-node');
      });
    }

    if (state.selected) cy.$id(state.selected).addClass('sel');
  });
}

function fitEles(cy: Core, slugs: Set<string>, padding: number, animate: boolean): void {
  const eles = cy.nodes().filter((n) => slugs.has(n.id()));
  if (!eles.length) return;
  if (animate) cy.animate({ fit: { eles, padding }, duration: 350, easing: 'ease-out-cubic' });
  else cy.fit(eles, padding);
}

/**
 * Position + viewport are a function of orientation × focus × route, so they're
 * recomputed together whenever any of those change:
 *   • focused + "hide others" → compact the lineage tight and frame it
 *   • focused + "dim others"  → lineage in place (full graph), framed
 *   • route open              → frame the route path
 *   • otherwise               → anchor the selection, or the opening slab
 */
function frameGraph(cy: Core, animate = true): void {
  const state = useStore.getState();
  const o = state.orientation;
  const route = state.routeOpen ? state.route.routes?.[state.route.active] : undefined;

  if (state.focus) {
    if (state.hideOthers) compactFocus(cy, state.focus, o);
    else reorientGraph(cy, o);
    fitEles(cy, lineage(appData().graph, state.focus).nodes, 60, animate);
    return;
  }

  reorientGraph(cy, o);
  if (route && route.steps.length) {
    fitEles(cy, new Set([route.from, ...route.steps.map((s) => s.to)]), 80, animate);
    return;
  }
  const anchor = state.selected ? cy.$id(state.selected) : null;
  if (anchor?.length) {
    cy.animate({ zoom: { level: 0.6, position: anchor.position() }, duration: 350 });
  } else {
    resetView(cy, o, animate);
  }
}

export function useGraphController(): void {
  useEffect(() => {
    const unsubscribers = [
      // appearance: any of these slices changes → one full recompute
      useStore.subscribe(
        (s) =>
          [s.selected, s.focus, s.hideOthers, s.generations, s.attributes, s.special, s.route, s.routeOpen] as const,
        () => recompute(useStore.getState()),
        { equalityFn: (a, b) => a.every((v, i) => v === b[i]) },
      ),

      // viewport: pan to a new selection (only when not (re)framing for focus)
      useStore.subscribe(
        (s) => s.selected,
        (selected) => {
          const cy = getCy();
          if (!cy || !selected || useStore.getState().focus) return;
          const node = cy.$id(selected);
          if (!node.length) return;
          const zoom = cy.zoom() < 0.4 ? { level: 0.8, position: node.position() } : undefined;
          cy.animate(zoom ? { zoom, duration: 300 } : { center: { eles: node }, duration: 300 });
        },
      ),

      // layout + viewport: recompute positions and framing together
      useStore.subscribe(
        (s) =>
          [
            s.focus,
            s.hideOthers,
            s.orientation,
            s.routeOpen ? (s.route.routes?.[s.route.active] ?? null) : null,
          ] as const,
        () => {
          const cy = getCy();
          if (cy) frameGraph(cy);
        },
        { equalityFn: (a, b) => a.every((v, i) => v === b[i]) },
      ),
    ];
    recompute(useStore.getState());
    // deep-linked focus is set before we subscribe — frame it once on mount
    const cy = getCy();
    if (cy && useStore.getState().focus) frameGraph(cy, false);
    return () => unsubscribers.forEach((u) => u());
  }, []);
}
