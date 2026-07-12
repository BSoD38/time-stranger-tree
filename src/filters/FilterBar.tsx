import { appData } from '../data/appData';
import { ATTRIBUTE_KEYS, GENERATION_KEYS } from '../data/schema';
import { filterSlugs, hasActiveCriteria, type SpecialFacet } from '../data/search';
import { useStore } from '../state/store';
import { ATTRIBUTE_COLORS } from '../theme/attribute';
import styles from './FilterBar.module.css';

const SPECIAL: Array<{ key: SpecialFacet; label: string; title: string }> = [
  { key: 'ridable', label: '🐎 Ridable', title: '189 ridable Digimon' },
  { key: 'item', label: '◆ Item', title: 'Requires an item to evolve into (18)' },
  { key: 'jogress', label: '⧉ Jogress', title: 'DNA/Jogress fusion (17)' },
  { key: 'bond', label: '❖ Bond', title: 'Bond form — Agent Skills requirement (11)' },
];

export function FilterBar() {
  const generations = useStore((s) => s.generations);
  const attributes = useStore((s) => s.attributes);
  const special = useStore((s) => s.special);
  const toggleGeneration = useStore((s) => s.toggleGeneration);
  const toggleAttribute = useStore((s) => s.toggleAttribute);
  const toggleSpecial = useStore((s) => s.toggleSpecial);
  const clearFilters = useStore((s) => s.clearFilters);

  const criteria = { generations, attributes, special };
  const active = hasActiveCriteria(criteria);
  const count = active ? filterSlugs(appData().db, criteria).size : 475;

  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        {GENERATION_KEYS.map((generation) => (
          <button
            key={generation}
            className={generations.has(generation) ? styles.chipActive : styles.chip}
            onClick={() => toggleGeneration(generation)}
          >
            {generation}
          </button>
        ))}
      </div>
      <div className={styles.group}>
        {ATTRIBUTE_KEYS.map((attribute) => (
          <button
            key={attribute}
            className={attributes.has(attribute) ? styles.chipActive : styles.chip}
            style={{ '--chip-color': ATTRIBUTE_COLORS[attribute] } as React.CSSProperties}
            onClick={() => toggleAttribute(attribute)}
          >
            {attribute}
          </button>
        ))}
      </div>
      <div className={styles.group}>
        {SPECIAL.map(({ key, label, title }) => (
          <button
            key={key}
            className={special.has(key) ? styles.chipActive : styles.chip}
            title={title}
            onClick={() => toggleSpecial(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.tail}>
        <span className={styles.count}>
          {count} / 475
        </span>
        {active && (
          <button className={styles.clear} onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
