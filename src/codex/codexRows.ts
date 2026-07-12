import type { Attribute, DigimonDatabase, Generation, StatKey, StatLevel } from '../data/schema';
import { ATTRIBUTE_KEYS, GENERATION_KEYS, STAT_KEYS } from '../data/schema';

/** A flat, presentation-ready row for the Codex table — stats pre-summed. */
export interface CodexRow {
  slug: string;
  number: number;
  name: string;
  generation: Generation;
  attribute: Attribute;
  stats: Record<StatLevel, Record<StatKey, number>>;
  total: Record<StatLevel, number>;
}

export type SortKey = 'number' | 'name' | 'generation' | 'attribute' | 'total' | StatKey;

/** Non-numeric columns sort ascending by default; power columns sort strongest-first. */
export function defaultDir(key: SortKey): 'asc' | 'desc' {
  return key === 'number' || key === 'name' || key === 'generation' || key === 'attribute'
    ? 'asc'
    : 'desc';
}

export function buildCodexRows(db: DigimonDatabase): CodexRow[] {
  return Object.values(db.digimon)
    .map((d): CodexRow => {
      const lv1 = {} as Record<StatKey, number>;
      const lv99 = {} as Record<StatKey, number>;
      let total1 = 0;
      let total99 = 0;
      for (const key of STAT_KEYS) {
        lv1[key] = d.stats[key].lv1;
        lv99[key] = d.stats[key].lv99;
        total1 += lv1[key];
        total99 += lv99[key];
      }
      return {
        slug: d.slug,
        number: d.number,
        name: d.name,
        generation: d.generation,
        attribute: d.attribute,
        stats: { lv1, lv99 },
        total: { lv1: total1, lv99: total99 },
      };
    })
    .sort((a, b) => a.number - b.number);
}

/** The largest stat total across all rows at a level — normalizes the total bar. */
export function maxTotal(rows: CodexRow[], level: StatLevel): number {
  return rows.reduce((max, r) => Math.max(max, r.total[level]), 1);
}

const GEN_ORDER = new Map(GENERATION_KEYS.map((g, i) => [g, i]));
const ATTR_ORDER = new Map(ATTRIBUTE_KEYS.map((a, i) => [a, i]));

/**
 * Compare two rows on the active column, at the active level, in direction `dir`
 * (1 asc, -1 desc). Generation and attribute sort by their canonical game order
 * (not alphabetically). `dir` applies to the active column only; ties always
 * fall back to ascending dex number, so equal-value rows keep a stable order
 * whichever way the column is sorted.
 */
export function compareRows(
  a: CodexRow,
  b: CodexRow,
  key: SortKey,
  level: StatLevel,
  dir: 1 | -1 = 1,
): number {
  let delta: number;
  switch (key) {
    case 'number':
      delta = a.number - b.number;
      break;
    case 'name':
      delta = a.name.localeCompare(b.name);
      break;
    case 'generation':
      delta = (GEN_ORDER.get(a.generation) ?? 0) - (GEN_ORDER.get(b.generation) ?? 0);
      break;
    case 'attribute':
      delta = (ATTR_ORDER.get(a.attribute) ?? 0) - (ATTR_ORDER.get(b.attribute) ?? 0);
      break;
    case 'total':
      delta = a.total[level] - b.total[level];
      break;
    default:
      delta = a.stats[level][key] - b.stats[level][key];
  }
  return delta !== 0 ? delta * dir : a.number - b.number;
}
