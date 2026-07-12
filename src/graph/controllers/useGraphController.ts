import { useEffect } from 'react';
import { appData } from '../../data/appData';
import { edgeKey, lineage } from '../../data/graph';
import { filterSlugs, hasActiveCriteria } from '../../data/search';
import { useStore, type AppState } from '../../state/store';
import { getCy } from '../cyInstance';

const APPEARANCE_CLASSES =
  'sel dim-soft dim-hard dim-filter lineage-glow route-dim route-glow route-glow-devolve route-node route-step-active';

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
  const { graph, db } = { graph: appData().graph, db: appData().db };

  cy.batch(() => {
    cy.elements().removeClass(APPEARANCE_CLASSES);

    // focus layer: hard-dim everything outside the lineage
    if (state.focus) {
      const lin = lineage(graph, state.focus);
      cy.nodes().forEach((n) => {
        if (!lin.nodes.has(n.id())) n.addClass('dim-hard');
      });
      cy.edges().forEach((e) => {
        if (!lin.nodes.has(e.source().id()) || !lin.nodes.has(e.target().id())) {
          e.addClass('dim-hard');
        }
      });
    } else if (state.selected) {
      // soft lineage highlight only outside focus mode
      const lin = lineage(graph, state.selected);
      cy.nodes().forEach((n) => {
        if (!lin.nodes.has(n.id())) n.addClass('dim-soft');
      });
      cy.edges().forEach((e) => {
        const inside = lin.nodes.has(e.source().id()) && lin.nodes.has(e.target().id());
        e.addClass(inside ? 'lineage-glow' : 'dim-soft');
      });
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

    // route layer: route elements at full strength, everything else dimmer
    const route = state.routeOpen ? state.route.routes?.[state.route.active] : undefined;
    if (route && route.steps.length) {
      cy.elements().addClass('route-dim');
      route.steps.forEach((step, i) => {
        // a dedigivolve step from u to v travels the forward edge v->u
        const id =
          step.kind === 'digivolve' ? edgeKey(step.from, step.to) : edgeKey(step.to, step.from);
        const edge = cy.$id(id);
        edge.removeClass('route-dim');
        edge.addClass(step.kind === 'digivolve' ? 'route-glow' : 'route-glow-devolve');
        if (i === state.route.activeStep) edge.addClass('route-step-active');
        cy.$id(step.from).removeClass('route-dim').addClass('route-node');
        cy.$id(step.to).removeClass('route-dim').addClass('route-node');
      });
    }

    if (state.selected) cy.$id(state.selected).addClass('sel');
  });
}

export function useGraphController(): void {
  useEffect(() => {
    const unsubscribers = [
      // appearance: any of these slices changes → one full recompute
      useStore.subscribe(
        (s) => [s.selected, s.focus, s.generations, s.attributes, s.special, s.route, s.routeOpen] as const,
        () => recompute(useStore.getState()),
        { equalityFn: (a, b) => a.every((v, i) => v === b[i]) },
      ),

      // viewport: pan to new selection
      useStore.subscribe(
        (s) => s.selected,
        (selected) => {
          const cy = getCy();
          if (!cy || !selected) return;
          const node = cy.$id(selected);
          if (!node.length) return;
          const zoom = cy.zoom() < 0.4 ? { level: 0.8, position: node.position() } : undefined;
          cy.animate(zoom ? { zoom, duration: 300 } : { center: { eles: node }, duration: 300 });
        },
      ),

      // viewport: fit the active route's path when it changes
      useStore.subscribe(
        (s) => (s.routeOpen ? s.route.routes?.[s.route.active] : undefined),
        (route) => {
          const cy = getCy();
          if (!cy || !route || !route.steps.length) return;
          const slugs = new Set([route.from, ...route.steps.map((s) => s.to)]);
          const eles = cy.nodes().filter((n) => slugs.has(n.id()));
          cy.animate({ fit: { eles, padding: 80 }, duration: 350 });
        },
      ),

      // viewport: fit lineage when entering/retargeting focus
      useStore.subscribe(
        (s) => s.focus,
        (focus) => {
          const cy = getCy();
          if (!cy) return;
          if (!focus) {
            // back to a readable overview around the selection, not a fit-all sliver
            const selected = useStore.getState().selected;
            const anchor = selected ? cy.$id(selected) : null;
            if (anchor?.length) {
              cy.animate({ zoom: { level: 0.6, position: anchor.position() }, duration: 350 });
            } else {
              cy.animate({ zoom: { level: 0.3, position: { x: 1400, y: 1600 } }, duration: 350 });
            }
            return;
          }
          const lin = lineage(appData().graph, focus);
          const eles = cy.nodes().filter((n) => lin.nodes.has(n.id()));
          cy.animate({ fit: { eles, padding: 60 }, duration: 350 });
        },
      ),
    ];
    recompute(useStore.getState());
    return () => unsubscribers.forEach((u) => u());
  }, []);
}
