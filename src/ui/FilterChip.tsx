import type { CSSProperties, ReactNode } from 'react';
import styles from './FilterChip.module.css';

/** A labelled row of filter chips — one facet group (Gen, Attribute, Trait…). */
export function FilterChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <span className={`label ${styles.groupLabel}`}>{label}</span>
      {children}
    </div>
  );
}

/**
 * A pill filter toggle shared by the graph FilterBar and the Codex. Distinct from
 * the display-only ui/Chip badge: this carries pressed state (aria-pressed) and an
 * inactive → active transition. `color` tints the hover / active borders and fill;
 * `dot` adds a leading swatch of that colour (attribute chips).
 */
export function FilterChip({
  active,
  onClick,
  color,
  dot = false,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  dot?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? styles.chipActive : styles.chip}
      style={color ? ({ '--chip-color': color } as CSSProperties) : undefined}
      aria-pressed={active}
      title={title}
      onClick={onClick}
    >
      {dot && color && <span className={styles.dot} style={{ background: color }} />}
      {children}
    </button>
  );
}
