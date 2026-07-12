import type { DigimonDatabase } from './schema';

export interface EvolutionGraph {
  db: DigimonDatabase;
  /** Stable order: ascending dex number. */
  slugs: readonly string[];
  /** Forward adjacency (evolvesTo). */
  out: ReadonlyMap<string, readonly string[]>;
  /** Reverse adjacency (evolvesFrom). */
  inn: ReadonlyMap<string, readonly string[]>;
}

export function buildGraph(db: DigimonDatabase): EvolutionGraph {
  const slugs = Object.keys(db.digimon).sort(
    (a, b) => db.digimon[a].number - db.digimon[b].number,
  );
  const out = new Map<string, readonly string[]>();
  const inn = new Map<string, readonly string[]>();
  for (const slug of slugs) {
    out.set(slug, db.digimon[slug].evolvesTo);
    inn.set(slug, db.digimon[slug].evolvesFrom);
  }
  return { db, slugs, out, inn };
}

export const edgeKey = (from: string, to: string): string => `${from}->${to}`;

function reach(adj: ReadonlyMap<string, readonly string[]>, start: string): Set<string> {
  // Cycle-safe BFS; `start` is excluded from the result even when it is
  // self-reachable through a 2-cycle (e.g. omnimon <-> omnimon-x-antibody).
  const visited = new Set<string>([start]);
  const result = new Set<string>();
  const queue = [start];
  while (queue.length) {
    for (const next of adj.get(queue.shift()!) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        result.add(next);
        queue.push(next);
      }
    }
  }
  return result;
}

/** All nodes that can reach `slug` via forward edges (self excluded). */
export const ancestors = (g: EvolutionGraph, slug: string): Set<string> => reach(g.inn, slug);

/** All nodes reachable from `slug` via forward edges (self excluded). */
export const descendants = (g: EvolutionGraph, slug: string): Set<string> => reach(g.out, slug);

export interface Lineage {
  focus: string;
  /** ancestors ∪ {focus} ∪ descendants */
  nodes: Set<string>;
  /** Induced forward edges on `nodes` (includes alternative routes and mode cycles). */
  edges: Array<readonly [string, string]>;
}

export function lineage(g: EvolutionGraph, slug: string): Lineage {
  const nodes = ancestors(g, slug);
  for (const d of descendants(g, slug)) nodes.add(d);
  nodes.add(slug);
  const edges: Array<readonly [string, string]> = [];
  for (const from of nodes) {
    for (const to of g.out.get(from) ?? []) {
      if (nodes.has(to)) edges.push([from, to] as const);
    }
  }
  return { focus: slug, nodes, edges };
}
