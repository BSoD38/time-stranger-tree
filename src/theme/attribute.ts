import type { Attribute } from '../data/schema';

/** Single source of truth for attribute colors — consumed by the cytoscape
 *  stylesheet AND injected as CSS custom properties on boot. */
export const ATTRIBUTE_COLORS: Record<Attribute, string> = {
  'Vaccine': '#4da3ff',
  'Data': '#45d483',
  'Virus': '#b06cff',
  'Free': '#f5c542',
  'Variable': '#ff7ab0',
  'Unknown': '#9aa5b1',
  'No Data': '#5c6773',
};

export const THEME = {
  bg: '#0a0e14',
  surface: '#111826',
  surface2: '#1a2332',
  border: '#233046',
  text: '#e6edf3',
  textDim: '#8b98a9',
  accent: '#00e5c3',
  accent2: '#3d9aff',
  edge: '#3a4a63',
  routeEvolve: '#00e5c3',
  routeDevolve: '#8b98a9',
  jogress: '#e86bff',
  item: '#f5a623',
  bond: '#35d5e5',
} as const;

export const attrVar = (attribute: Attribute): string =>
  `--attr-${attribute.toLowerCase().replace(/\s+/g, '-')}`;

export function injectThemeVars(): void {
  const root = document.documentElement;
  for (const [attribute, color] of Object.entries(ATTRIBUTE_COLORS)) {
    root.style.setProperty(attrVar(attribute as Attribute), color);
  }
}
