import type { Attribute, DigimonDatabase, Generation } from './schema';

export interface SearchEntry {
  slug: string;
  name: string;
  nameLower: string;
  number: number;
  generation: Generation;
  attribute: Attribute;
}

export interface SearchHit {
  slug: string;
  score: number;
}

export function buildSearchIndex(db: DigimonDatabase): SearchEntry[] {
  return Object.values(db.digimon)
    .sort((a, b) => a.number - b.number)
    .map((d) => ({
      slug: d.slug,
      name: d.name,
      nameLower: d.name.toLowerCase(),
      number: d.number,
      generation: d.generation,
      attribute: d.attribute,
    }));
}

/** Rank: exact > prefix > word-boundary > substring > slug substring; "#123" or bare number = dex lookup. */
export function search(index: SearchEntry[], query: string, limit = 12): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const numMatch = q.match(/^#?(\d{1,3})$/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    return index.filter((e) => e.number === n).map((e) => ({ slug: e.slug, score: 100 }));
  }

  const hits: SearchHit[] = [];
  for (const entry of index) {
    let score: number | null = null;
    if (entry.nameLower === q) score = 100;
    else if (entry.nameLower.startsWith(q)) score = 80;
    else if (entry.nameLower.includes(' ' + q) || entry.nameLower.includes('(' + q)) score = 60;
    else if (entry.nameLower.includes(q)) score = 40;
    else if (entry.slug.includes(q.replace(/\s+/g, '-'))) score = 20;
    if (score !== null) hits.push({ slug: entry.slug, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

export type SpecialFacet = 'item' | 'jogress' | 'bond' | 'ridable';

export interface FilterCriteria {
  generations?: ReadonlySet<Generation>;
  attributes?: ReadonlySet<Attribute>;
  special?: ReadonlySet<SpecialFacet>;
}

export function hasActiveCriteria(f: FilterCriteria): boolean {
  return Boolean(f.generations?.size || f.attributes?.size || f.special?.size);
}

/** OR within a facet, AND across facets. Empty facet = no constraint. */
export function filterSlugs(db: DigimonDatabase, f: FilterCriteria): Set<string> {
  const result = new Set<string>();
  for (const d of Object.values(db.digimon)) {
    if (f.generations?.size && !f.generations.has(d.generation)) continue;
    if (f.attributes?.size && !f.attributes.has(d.attribute)) continue;
    if (f.special?.size) {
      const cond = d.evolutionCondition;
      const matches =
        (f.special.has('item') && Boolean(cond.requiredItem)) ||
        (f.special.has('jogress') && Boolean(cond.jogressPartners)) ||
        (f.special.has('bond') && Boolean(cond.agentSkills)) ||
        (f.special.has('ridable') && d.ridable);
      if (!matches) continue;
    }
    result.add(d.slug);
  }
  return result;
}
