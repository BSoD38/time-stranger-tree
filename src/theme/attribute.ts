import type { Attribute } from '../data/schema';

/** Single source of truth for attribute colors — consumed by the cytoscape
 *  stylesheet AND injected as CSS custom properties on boot. Retuned in OKLCH
 *  for maximal mutual separation (the graph pairs each with a shape badge so
 *  colour is never the sole channel). Tuned to read on the dark graph viewport
 *  and as dots/borders in either chrome theme. */
export const ATTRIBUTE_COLORS: Record<Attribute, string> = {
  'Vaccine': '#3496ef', // blue    L0.66 H250
  'Data': '#4cb86a', // green   L0.70 H150
  'Virus': '#ac5cd7', // violet  L0.62 H312
  'Free': '#d7ab28', // gold    L0.76 H88
  'Variable': '#ee5b9a', // pink    L0.68 H357
  'Unknown': '#8594a4', // slate   L0.66 H250
  'No Data': '#65707b', // d.slate L0.54 H250
};

/** Graph palette — a warm near-black "Digital World" viewport that stays dark
 *  in both chrome themes so sprites and their chromatic glow always lead. */
export const THEME = {
  bg: '#0c0907', // graph backdrop / label plate
  surface: '#191714',
  surface2: '#24211e', // node fill
  border: '#413c38', // node border / quiet edge
  text: '#f0eeeb',
  textDim: '#aeaaa5', // node labels
  edge: '#5a544e',
  accent: '#f5b845', // default brand amber (per-node glow overrides via data)
  accent2: '#45bcd6',
  routeEvolve: '#f5b845', // glowing evolve path
  routeDevolve: '#9ba6b1', // cool de-evolve path
  jogress: '#a867e7',
  item: '#f48d2f',
  bond: '#45bcd6',
} as const;

export const attrVar = (attribute: Attribute): string =>
  `--attr-${attribute.toLowerCase().replace(/\s+/g, '-')}`;

export function injectThemeVars(): void {
  const root = document.documentElement;
  for (const [attribute, color] of Object.entries(ATTRIBUTE_COLORS)) {
    root.style.setProperty(attrVar(attribute as Attribute), color);
  }
}
