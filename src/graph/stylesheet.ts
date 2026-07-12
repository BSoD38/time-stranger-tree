import { ATTRIBUTE_COLORS, THEME } from '../theme/attribute';
import { ATTRIBUTE_KEYS } from '../data/schema';

// @types/cytoscape lags behind real style properties (underlay-*,
// min-zoomed-font-size, line-dash-pattern...) — keep rules loosely typed and
// cast once at cytoscape() init.
interface StyleRule {
  selector: string;
  style: Record<string, unknown>;
}

const attrClass = (attribute: string): string =>
  `attr-${attribute.toLowerCase().replace(/\s+/g, '-')}`;

/**
 * Class-driven stylesheet — classes are stamped once at load; class selectors
 * are cached by cytoscape, unlike per-render function mappers.
 *
 * Dim layers (precedence encoded by stylesheet ORDER, later wins):
 *   .dim-filter (0.12) < .dim-soft (0.45 selection context) < .dim-hard (0.08 focus)
 *   < .route-dim < .route-glow < :selected
 */
export function buildStylesheet(): StyleRule[] {
  const styles: StyleRule[] = [
    {
      selector: 'node',
      style: {
        width: 56,
        height: 56,
        shape: 'round-rectangle',
        'corner-radius': 12,
        'background-color': THEME.surface2,
        'background-image': 'data(thumb)',
        'background-fit': 'contain',
        'background-opacity': 1,
        'border-width': 2,
        'border-color': THEME.border,
        label: 'data(name)',
        color: THEME.textDim,
        'font-family': 'Hanken Grotesk, system-ui, sans-serif',
        'font-size': 10,
        'font-weight': 600,
        'min-zoomed-font-size': 8,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 5,
        'text-background-color': THEME.bg,
        'text-background-opacity': 0.72,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
      },
    },
    // attribute-colored borders + placeholder fill
    ...ATTRIBUTE_KEYS.map((attribute) => ({
      selector: `node.${attrClass(attribute)}`,
      style: { 'border-color': ATTRIBUTE_COLORS[attribute] },
    })),
    {
      selector: 'node.gen-armor',
      style: { 'border-style': 'double', 'border-width': 4 },
    },
    {
      selector: 'node.gen-hybrid',
      style: { 'border-style': 'dashed' },
    },
    {
      selector: 'node.col-label',
      style: {
        'background-opacity': 0,
        'border-width': 0,
        width: 1,
        height: 1,
        label: 'data(name)',
        color: THEME.text,
        'text-opacity': 0.42,
        'font-family': 'Hanken Grotesk, system-ui, sans-serif',
        'font-size': 60,
        'font-weight': 800,
        'text-transform': 'uppercase',
        'min-zoomed-font-size': 0,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-background-opacity': 0,
        events: 'no',
      },
    },
    {
      // row orientation: labels sit in the left margin; text runs leftward so
      // long generation names never overlap their band's members
      selector: 'node.col-label.label-rows',
      style: {
        'font-size': 44,
        'text-halign': 'left',
        'text-valign': 'center',
        'text-margin-x': -8,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'curve-style': 'straight',
        'line-color': THEME.edge,
        'line-opacity': 0.5,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': THEME.edge,
        'arrow-scale': 0.95,
      },
    },
    {
      selector: 'edge.parallel',
      style: {
        'curve-style': 'bezier',
        'control-point-step-size': 28,
      },
    },
    {
      selector: 'edge.e-jogress',
      style: { 'line-color': THEME.jogress, 'target-arrow-color': THEME.jogress, 'line-style': 'dashed', 'line-opacity': 0.5 },
    },
    {
      selector: 'edge.e-item',
      style: { 'line-color': THEME.item, 'target-arrow-color': THEME.item, 'line-style': 'dashed', 'line-dash-pattern': [2, 4], 'line-opacity': 0.5 },
    },
    {
      selector: 'edge.e-bond',
      style: { 'line-color': THEME.bond, 'target-arrow-color': THEME.bond, 'line-style': 'dashed', 'line-opacity': 0.5 },
    },
    // --- dim/highlight layers, order = precedence ---
    { selector: 'node.dim-filter', style: { opacity: 0.12 } },
    { selector: 'edge.dim-filter', style: { 'line-opacity': 0.05, opacity: 0.3 } },
    { selector: 'node.dim-soft', style: { opacity: 0.45 } },
    { selector: 'edge.dim-soft', style: { 'line-opacity': 0.08 } },
    { selector: 'node.dim-hard', style: { opacity: 0.08 } },
    { selector: 'edge.dim-hard', style: { 'line-opacity': 0.02, opacity: 0.2 } },
    // focus "hide others" — remove non-lineage elements from the scene entirely
    { selector: '.hidden', style: { display: 'none' } },
    // lineage highlight, split by direction relative to the anchor Digimon:
    // where it evolves TO (next, amber) vs where it comes FROM (previous, cyan)
    {
      selector: 'edge.lineage-next',
      style: {
        'line-color': THEME.routeEvolve,
        'target-arrow-color': THEME.routeEvolve,
        'line-opacity': 1,
        width: 3,
        'z-index': 8,
      },
    },
    {
      selector: 'edge.lineage-prev',
      style: {
        'line-color': THEME.accent2,
        'target-arrow-color': THEME.accent2,
        'line-opacity': 1,
        width: 3,
        'z-index': 8,
      },
    },
    // in the isolated focus view, ancestry links read a touch thinner than
    // the descendant links (later rule → wins the width for prev edges)
    {
      selector: 'edge.lineage-prev-thin',
      style: { width: 2 },
    },
    { selector: 'node.route-dim', style: { opacity: 0.1 } },
    { selector: 'edge.route-dim', style: { 'line-opacity': 0.03 } },
    {
      selector: 'edge.route-glow',
      style: {
        'line-color': THEME.routeEvolve,
        'target-arrow-color': THEME.routeEvolve,
        'line-opacity': 1,
        width: 4,
        'z-index': 10,
        'line-style': 'solid',
      },
    },
    {
      selector: 'edge.route-glow-devolve',
      style: {
        'line-color': THEME.routeDevolve,
        'target-arrow-color': THEME.routeDevolve,
        'line-style': 'dashed',
        'line-opacity': 1,
        width: 4,
        'z-index': 10,
        'source-arrow-shape': 'triangle',
        'source-arrow-color': THEME.routeDevolve,
        'target-arrow-shape': 'none',
      },
    },
    {
      selector: 'node.route-node',
      style: { opacity: 1, 'z-index': 11 },
    },
    {
      selector: 'edge.route-step-active',
      style: { width: 7 },
    },
    {
      // custom class instead of :selected — the store is the single source of
      // truth for selection (native cy selection is disabled). Border + glow are
      // the *Digimon's own* signature colour (data(accent)), so the graph lights
      // up in the character's hue.
      selector: 'node.sel',
      style: {
        opacity: 1,
        'border-width': 3,
        'border-color': 'data(accent)',
        'underlay-color': 'data(accent)',
        'underlay-opacity': 0.3,
        'underlay-padding': 10,
        'z-index': 12,
        color: THEME.text,
        'text-opacity': 1,
      },
    },
  ];
  return styles;
}
