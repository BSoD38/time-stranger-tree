import { useEffect } from 'react';
import { appData } from '../../data/appData';
import { descendants, edgeKey, lineage } from '../../data/graph';
import { filterSlugs, hasActiveCriteria } from '../../data/search';
import { useStore, type AppState } from '../../state/store';
import { getCy } from '../cyInstance';
import { compactFilter, compactFocus, compactRoute, reorientGraph, resetView } from '../viewport';
import type { Core } from 'cytoscape';

const APPEARANCE_CLASSES =
  'sel dim-soft dim-hard dim-filter hidden lineage-next lineage-prev lineage-prev-thin filter-mute route-dim route-glow route-glow-devolve route-node route-step-active';

const prefersReduce = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * One-shot "lock-on" when a Digimon is selected: its underlay glow blooms and
 * settles, in the character's own signature colour (the .sel underlay uses
 * data(accent)). Purely acknowledgement — no layout, no lasting state.
 */
let lastPulsed: string | null = null;
function clearPulse(cy: ReturnType<typeof getCy>): void {
  if (!cy || !lastPulsed) return;
  const prev = cy.$id(lastPulsed);
  if (prev.length) {
    prev.stop();
    prev.removeStyle('underlay-padding underlay-opacity');
  }
  lastPulsed = null;
}
function pulseSelection(slug: string): void {
  const cy = getCy();
  if (!cy || prefersReduce()) return;
  clearPulse(cy); // kill any lingering glow on the previously-selected node
  const node = cy.$id(slug);
  if (!node.length || node.hasClass('col-label')) return;
  lastPulsed = slug;
  node
    .animate({ style: { 'underlay-padding': 22, 'underlay-opacity': 0.5 } }, {
      duration: 150,
      easing: 'ease-out-quad',
    })
    .animate({ style: { 'underlay-padding': 10, 'underlay-opacity': 0.3 } }, {
      duration: 480,
      easing: 'ease-out-cubic',
      complete: () => node.removeStyle('underlay-padding underlay-opacity'),
    });
}

// Marching-ants flow along the live (hovered) route step, throttled to ~30fps
// so a single dashed edge redraw never competes with interaction. Only runs
// while a step is active and motion is allowed.
let flowRAF = 0;
let flowOffset = 0;
let flowLast = 0;
function manageRouteFlow(): void {
  if (flowRAF) {
    cancelAnimationFrame(flowRAF);
    flowRAF = 0;
  }
  const cy = getCy();
  if (!cy || prefersReduce()) return;
  const edges = cy.edges('.route-step-active');
  if (!edges.length) return;
  const tick = (t: number) => {
    if (t - flowLast >= 33) {
      flowLast = t;
      flowOffset -= 1.4;
      edges.style('line-dash-offset', flowOffset);
    }
    flowRAF = requestAnimationFrame(tick);
  };
  flowRAF = requestAnimationFrame(tick);
}

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

    // filter layer. In the normal tree view a filter isolates: non-matches are
    // hidden outright (frameGraph then re-packs the matches). Inside focus /
    // route that mode already owns the layout, so filters only grey out
    // (dim-filter, weaker than dim-hard by stylesheet order). Generation
    // watermarks are never touched — they label the stages in every mode.
    const criteria = { attributes: state.attributes, special: state.special };
    if (hasActiveCriteria(criteria)) {
      const matching = filterSlugs(db, criteria);
      const isolating = Boolean(state.focus) || state.routeOpen;
      const outside = isolating ? 'dim-filter' : 'hidden';
      cy.nodes().forEach((n) => {
        if (!n.hasClass('col-label') && !matching.has(n.id())) n.addClass(outside);
      });
      // A highlighted lineage arrow touching a greyed-out node should fade with
      // it, not stay loud. (Only the lineage highlight — route glow is left be,
      // and non-focus context edges are already dimmed by their own layer.)
      if (isolating) {
        cy.edges('.lineage-next, .lineage-prev').forEach((e) => {
          if (!matching.has(e.source().id()) || !matching.has(e.target().id())) {
            e.addClass('filter-mute');
          }
        });
      }
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
 *   • filtered (normal view)  → compact the matches into their bands, framed
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

  if (route && route.steps.length) {
    // Route mirrors focus: "hide others" compacts the path into a tight
    // staircase, "dim others" leaves it in place within the full graph.
    if (state.hideOthers) compactRoute(cy, route, o);
    else reorientGraph(cy, o);
    fitEles(cy, new Set([route.from, ...route.steps.map((s) => s.to)]), 80, animate);
    return;
  }

  reorientGraph(cy, o);

  // Route planner open but no path to frame — no endpoints yet, no route at the
  // chosen agent rank, or from === to (0 steps). Show the whole tree, exactly as
  // when the planner first opens, so the user keeps their bearings. Without this
  // we'd fall through to the selection anchor below and pan the viewport onto a
  // stale position, parking the graph in empty space.
  if (state.routeOpen) {
    resetView(cy, o, animate);
    return;
  }

  // Normal tree view: an active filter isolates + re-packs the matches, mirroring
  // focus.
  const criteria = { attributes: state.attributes, special: state.special };
  if (hasActiveCriteria(criteria)) {
    const matching = filterSlugs(appData().db, criteria);
    compactFilter(cy, matching, o);
    fitEles(cy, matching, 60, animate);
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
          [s.selected, s.focus, s.hideOthers, s.attributes, s.special, s.route, s.routeOpen] as const,
        () => {
          recompute(useStore.getState());
          manageRouteFlow(); // (re)bind the flow to the current active-step edge
        },
        { equalityFn: (a, b) => a.every((v, i) => v === b[i]) },
      ),

      // lock-on pulse when a new Digimon is selected (runs after the appearance
      // subscription above has stamped .sel, so the accent underlay is present)
      useStore.subscribe(
        (s) => s.selected,
        (selected) => {
          if (selected) pulseSelection(selected);
          else clearPulse(getCy());
        },
      ),

      // viewport: pan to a new selection (only when not (re)framing for focus)
      useStore.subscribe(
        (s) => s.selected,
        (selected) => {
          const cy = getCy();
          if (!cy || !selected || useStore.getState().focus) return;
          const node = cy.$id(selected);
          if (!node.length) return;
          // Cancel any in-flight viewport animation first: cy.animate() queues by
          // default, so without this a quick second pick would tour through the
          // previous target(s) instead of heading straight to the newest one.
          cy.stop();
          // Always recentre the node; zoom in only if we're currently too far out
          // to read it. Deriving the pan from the node's model position (rather
          // than `center: { eles }` / `zoom: { position }`) means the target is
          // immune to the selection pulse's animating underlay, AND the zoom-in
          // case actually recentres instead of zooming in place (the old bug).
          const z = cy.zoom() < 0.4 ? 0.8 : cy.zoom();
          const p = node.position();
          const pan = { x: cy.width() / 2 - p.x * z, y: cy.height() / 2 - p.y * z };
          cy.animate({ zoom: z, pan, duration: 300, easing: 'ease-out-cubic' });
        },
      ),

      // layout + viewport: recompute positions and framing together. Filter
      // criteria are here too — in the normal view they isolate + re-pack.
      useStore.subscribe(
        (s) =>
          [
            s.focus,
            s.hideOthers,
            s.orientation,
            s.attributes,
            s.special,
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
    manageRouteFlow();
    // a deep-linked focus or route is set before we subscribe — frame it once on mount
    const cy = getCy();
    const s0 = useStore.getState();
    if (cy && (s0.focus || s0.routeOpen)) frameGraph(cy, false);
    return () => {
      unsubscribers.forEach((u) => u());
      if (flowRAF) {
        cancelAnimationFrame(flowRAF);
        flowRAF = 0;
      }
      lastPulsed = null;
    };
  }, []);
}
