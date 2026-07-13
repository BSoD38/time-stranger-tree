import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { appData } from '../data/appData';
import type { Orientation } from '../graph/orient';
import { findRoutes, type Route } from '../data/route';
import type { Attribute, Generation, StatLevel } from '../data/schema';
import type { SpecialFacet } from '../data/search';
import type { SortKey as CodexSortKey } from '../codex/codexRows';

// Display preferences persist across sessions (localStorage). Orientation
// defaults to rows — the many-members-per-stage spread reads best sideways;
// portrait screens can switch to columns. Focus defaults to hiding the rest of
// the graph so the focused lineage / route stands alone.
const PREFS_KEY = 'tst:prefs';
interface Prefs {
  orientation: Orientation;
  hideOthers: boolean;
}
const DEFAULT_PREFS: Prefs = { orientation: 'rows', hideOthers: true };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<Prefs> & { focusHides?: boolean };
    return {
      orientation: p.orientation === 'columns' ? 'columns' : 'rows',
      // `focusHides` is the pre-generalisation key — read it as a fallback
      hideOthers: (p.hideOthers ?? p.focusHides) !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / disabled storage — preference just won't persist */
  }
}

export interface RouteState {
  from: string | null;
  to: string | null;
  maxAgentRank: number | null;
  /** Prefer routes with no jogress/DNA step, falling back to jogress only when
   *  there's no other way. Off by default. Session-only (not URL-persisted). */
  avoidJogress: boolean;
  routes: Route[] | null;
  active: number;
  activeStep: number | null;
}

const emptyRoute: RouteState = {
  from: null,
  to: null,
  maxAgentRank: null,
  avoidJogress: false,
  routes: null,
  active: 0,
  activeStep: null,
};

/** Codex table controls, held here (not in the component) so sort / filters /
 *  level survive switching to the Tree and back — the Codex unmounts each time. */
export interface CodexState {
  query: string;
  generations: ReadonlySet<Generation>;
  attributes: ReadonlySet<Attribute>;
  level: StatLevel;
  sortKey: CodexSortKey;
  sortDir: 'asc' | 'desc';
  // Advanced facets (see codex/codexFilter). The special-skill facet has two
  // sub-facets — `skillElements` (element/effect keys) and `skillTypes`
  // (magic/physical) — combined same-skill. `resist` / `weak` hold namespaced
  // resistance keys (`el:*`) — a key lives in at most one of the two.
  skillElements: ReadonlySet<string>;
  skillTypes: ReadonlySet<string>;
  resist: ReadonlySet<string>;
  weak: ReadonlySet<string>;
  // Trait facets (item / jogress / bond / ridable) — the same set the Tree filter
  // offers, mirrored into the Field Guide's advanced filters. OR within.
  special: ReadonlySet<SpecialFacet>;
}

const emptyCodex: CodexState = {
  query: '',
  generations: new Set(),
  attributes: new Set(),
  level: 'lv99',
  sortKey: 'number',
  sortDir: 'asc',
  skillElements: new Set(),
  skillTypes: new Set(),
  resist: new Set(),
  weak: new Set(),
  special: new Set(),
};

/** Top-level surface: the evolution graph, or the flat Codex table. */
export type AppView = 'graph' | 'codex';

export interface AppState {
  ready: boolean;
  view: AppView;
  selected: string | null;
  focus: string | null;
  // Tree filters: attribute + trait only. Generation is the graph's spatial axis,
  // so it isn't a tree filter (the Codex keeps its own generation filter, codex.*).
  attributes: ReadonlySet<Attribute>;
  special: ReadonlySet<SpecialFacet>;
  filtersOpen: boolean;
  route: RouteState;
  routeOpen: boolean;
  orientation: Orientation;
  /** Isolate mode: hide (vs dim) everything outside the focused lineage / route. */
  hideOthers: boolean;
  settingsOpen: boolean;
  codex: CodexState;

  setReady(): void;
  patchCodex(patch: Partial<CodexState>): void;
  setView(view: AppView): void;
  /** Codex → Tree: select a Digimon and show it in the graph. Deliberately does
   *  NOT focus — the detail panel then offers "Focus lineage" so the pick can be
   *  isolated on demand (rather than arriving pre-focused). */
  openInTree(slug: string): void;
  select(slug: string | null): void;
  setFocus(slug: string | null): void;
  setOrientation(value: Orientation): void;
  setHideOthers(value: boolean): void;
  setSettingsOpen(open: boolean): void;
  toggleAttribute(value: Attribute): void;
  toggleSpecial(value: SpecialFacet): void;
  clearFilters(): void;
  setFiltersOpen(open: boolean): void;
  openRoute(partial?: Partial<Pick<RouteState, 'from' | 'to'>>): void;
  closeRoute(): void;
  setRouteEndpoint(which: 'from' | 'to', slug: string | null): void;
  swapRoute(): void;
  setMaxAgentRank(value: number | null): void;
  setAvoidJogress(value: boolean): void;
  setActiveRoute(index: number): void;
  setActiveStep(index: number | null): void;
}

/** Immutable set toggle: returns a new set with `value` added or removed. */
export function toggled<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function computeRoutes(route: RouteState): RouteState {
  if (!route.from || !route.to) return { ...route, routes: null, active: 0, activeStep: null };
  const routes = findRoutes(appData().graph, route.from, route.to, {
    k: 3,
    maxAgentRank: route.maxAgentRank ?? undefined,
    avoidJogress: route.avoidJogress,
  });
  return { ...route, routes, active: 0, activeStep: null };
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ready: false,
    view: 'graph',
    selected: null,
    focus: null,
    attributes: new Set<Attribute>(),
    special: new Set<SpecialFacet>(),
    filtersOpen: false,
    route: emptyRoute,
    routeOpen: false,
    ...loadPrefs(),
    settingsOpen: false,
    codex: emptyCodex,

    setReady: () => set({ ready: true }),
    patchCodex: (patch) => set({ codex: { ...get().codex, ...patch } }),
    // Codex is a graph-independent surface: entering it leaves the isolating
    // graph modes (focus / route) so the URL and the visible view never disagree.
    // `selected` is preserved so returning to the Tree lands where you left it.
    setView: (view) => set(view === 'codex' ? { view, focus: null, routeOpen: false } : { view }),
    openInTree: (slug) =>
      set({ view: 'graph', selected: slug, focus: null, routeOpen: false }),
    select: (slug) => set({ selected: slug }),
    // Focus and the route planner are mutually exclusive views (as the URL model
    // already assumes): a route can devolve out of a lineage, which can't be shown
    // inside a focus that isolates — and compacts — only that lineage. Entering
    // focus closes any open route.
    setFocus: (slug) => set(slug ? { focus: slug, routeOpen: false } : { focus: null }),
    setOrientation: (value) => {
      set({ orientation: value });
      savePrefs({ orientation: value, hideOthers: get().hideOthers });
    },
    setHideOthers: (value) => {
      set({ hideOthers: value });
      savePrefs({ orientation: get().orientation, hideOthers: value });
    },
    setSettingsOpen: (open) => set({ settingsOpen: open }),
    toggleAttribute: (value) => set({ attributes: toggled(get().attributes, value) }),
    toggleSpecial: (value) => set({ special: toggled(get().special, value) }),
    clearFilters: () => set({ attributes: new Set(), special: new Set() }),
    setFiltersOpen: (open) => set({ filtersOpen: open }),

    openRoute: (partial) =>
      set({
        routeOpen: true,
        focus: null, // route and focus are mutually exclusive (see setFocus)
        route: computeRoutes({ ...get().route, ...partial }),
      }),
    closeRoute: () => set({ routeOpen: false }),
    setRouteEndpoint: (which, slug) =>
      set({ route: computeRoutes({ ...get().route, [which]: slug }) }),
    // Reverse the journey: exchange endpoints and re-solve. Reuses the same
    // compute path as setRouteEndpoint, so the URL (#/route/from/to) follows.
    swapRoute: () => {
      const { from, to } = get().route;
      set({ route: computeRoutes({ ...get().route, from: to, to: from }) });
    },
    setMaxAgentRank: (value) =>
      set({ route: computeRoutes({ ...get().route, maxAgentRank: value }) }),
    setAvoidJogress: (value) =>
      set({ route: computeRoutes({ ...get().route, avoidJogress: value }) }),
    setActiveRoute: (index) =>
      set({ route: { ...get().route, active: index, activeStep: null } }),
    setActiveStep: (index) => set({ route: { ...get().route, activeStep: index } }),
  })),
);
