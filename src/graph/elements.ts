import type { ElementDefinition } from 'cytoscape';
import type { AppData } from '../data/appData';
import { thumbUrl } from '../data/load';
import { classifyForwardEdge, type ForwardStepClass } from '../data/route';
import { edgeKey } from '../data/graph';
import type { Generation } from '../data/schema';

// Tier index used to detect tier-skip edges (rendered as arcs so they don't
// shoot straight through intermediate columns). Mirrors the layout script.
const TIER: Partial<Record<Generation, number>> = {
  'In-Training I': 0,
  'In-Training II': 1,
  'Rookie': 2,
  'Champion': 3,
  'Armor': 3,
  'Ultimate': 4,
  'Mega': 5,
  'Mega +': 6,
};

const attrClass = (attribute: string): string =>
  `attr-${attribute.toLowerCase().replace(/\s+/g, '-')}`;

export function buildElements(data: AppData): ElementDefinition[] {
  const { graph, layout } = data;
  const elements: ElementDefinition[] = [];

  for (const slug of graph.slugs) {
    const d = graph.db.digimon[slug];
    const classes = [attrClass(d.attribute)];
    if (d.generation === 'Armor') classes.push('gen-armor');
    if (d.generation === 'Hybrid') classes.push('gen-hybrid');
    elements.push({
      group: 'nodes',
      data: { id: slug, name: d.name, thumb: thumbUrl(slug) },
      position: { ...layout.positions[slug] },
      classes: classes.join(' '),
    });
  }

  // floating generation column headers + hybrid lane label (non-interactive)
  layout.columns.forEach((column, i) => {
    elements.push({
      group: 'nodes',
      data: { id: `__col-${i}`, name: column.generations.join(' / ') },
      position: { x: column.x, y: -170 },
      classes: 'col-label',
      selectable: false,
    });
  });
  elements.push({
    group: 'nodes',
    data: { id: '__col-hybrid', name: layout.hybridLane.label },
    position: { x: layout.hybridLane.x, y: layout.hybridLane.y - 140 },
    classes: 'col-label',
    selectable: false,
  });

  for (const from of graph.slugs) {
    for (const to of graph.out.get(from) ?? []) {
      const classes: string[] = [];
      const cls: ForwardStepClass = classifyForwardEdge(graph, from, to);
      if (cls === 'jogress') classes.push('e-jogress');
      else if (cls === 'item') classes.push('e-item');
      else if (graph.db.digimon[to].evolutionCondition.agentSkills) classes.push('e-bond');

      const isTwoCycle = (graph.out.get(to) ?? []).includes(from);
      const fromTier = TIER[graph.db.digimon[from].generation];
      const toTier = TIER[graph.db.digimon[to].generation];
      const isTierSkip =
        fromTier !== undefined && toTier !== undefined && Math.abs(toTier - fromTier) > 1;
      if (isTwoCycle || isTierSkip) classes.push('parallel');

      elements.push({
        group: 'edges',
        data: { id: edgeKey(from, to), source: from, target: to },
        classes: classes.join(' '),
      });
    }
  }

  return elements;
}
