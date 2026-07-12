import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { appData } from '../data/appData';
import { findRoutes, type Route } from '../data/route';
import type { Attribute, Generation } from '../data/schema';
import type { SpecialFacet } from '../data/search';

export interface RouteState {
  from: string | null;
  to: string | null;
  maxAgentRank: number | null;
  routes: Route[] | null;
  active: number;
  activeStep: number | null;
}

const emptyRoute: RouteState = {
  from: null,
  to: null,
  maxAgentRank: null,
  routes: null,
  active: 0,
  activeStep: null,
};

export interface AppState {
  ready: boolean;
  selected: string | null;
  focus: string | null;
  generations: ReadonlySet<Generation>;
  attributes: ReadonlySet<Attribute>;
  special: ReadonlySet<SpecialFacet>;
  filtersOpen: boolean;
  route: RouteState;
  routeOpen: boolean;

  setReady(): void;
  select(slug: string | null): void;
  setFocus(slug: string | null): void;
  toggleGeneration(value: Generation): void;
  toggleAttribute(value: Attribute): void;
  toggleSpecial(value: SpecialFacet): void;
  clearFilters(): void;
  setFiltersOpen(open: boolean): void;
  openRoute(partial?: Partial<Pick<RouteState, 'from' | 'to'>>): void;
  closeRoute(): void;
  setRouteEndpoint(which: 'from' | 'to', slug: string | null): void;
  setMaxAgentRank(value: number | null): void;
  setActiveRoute(index: number): void;
  setActiveStep(index: number | null): void;
}

function toggled<T>(set: ReadonlySet<T>, value: T): Set<T> {
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
  });
  return { ...route, routes, active: 0, activeStep: null };
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ready: false,
    selected: null,
    focus: null,
    generations: new Set<Generation>(),
    attributes: new Set<Attribute>(),
    special: new Set<SpecialFacet>(),
    filtersOpen: false,
    route: emptyRoute,
    routeOpen: false,

    setReady: () => set({ ready: true }),
    select: (slug) => set({ selected: slug }),
    setFocus: (slug) => set({ focus: slug }),
    toggleGeneration: (value) => set({ generations: toggled(get().generations, value) }),
    toggleAttribute: (value) => set({ attributes: toggled(get().attributes, value) }),
    toggleSpecial: (value) => set({ special: toggled(get().special, value) }),
    clearFilters: () =>
      set({ generations: new Set(), attributes: new Set(), special: new Set() }),
    setFiltersOpen: (open) => set({ filtersOpen: open }),

    openRoute: (partial) =>
      set({
        routeOpen: true,
        route: computeRoutes({ ...get().route, ...partial }),
      }),
    closeRoute: () => set({ routeOpen: false }),
    setRouteEndpoint: (which, slug) =>
      set({ route: computeRoutes({ ...get().route, [which]: slug }) }),
    setMaxAgentRank: (value) =>
      set({ route: computeRoutes({ ...get().route, maxAgentRank: value }) }),
    setActiveRoute: (index) =>
      set({ route: { ...get().route, active: index, activeStep: null } }),
    setActiveStep: (index) => set({ route: { ...get().route, activeStep: index } }),
  })),
);
