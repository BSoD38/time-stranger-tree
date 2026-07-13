import { useEffect, useMemo, useRef, useState } from 'react';
import { appData } from '../data/appData';
import { useStore } from '../state/store';
import { Sprite } from '../ui/Sprite';
import styles from './HiddenBranches.module.css';

/**
 * Floating focus-mode control listing the branches pruned out of the current
 * lineage, with a way to bring any of them — or all of them — back. It exists
 * only while a lineage is focused *and* at least one branch is hidden, so it
 * doubles as the "your view is filtered" indicator; restoring the last branch
 * unmounts it. The graph's own exclude affordances (the panel's Hide branch
 * action and the evolution-list toggles) feed this list.
 */
export function HiddenBranches() {
  const focus = useStore((s) => s.focus);
  const excluded = useStore((s) => s.lineageExcluded);
  const restore = useStore((s) => s.restoreToLineage);
  const clearAll = useStore((s) => s.clearLineageExclusions);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Stable dex order so the list doesn't reshuffle as branches are added.
  const items = useMemo(() => {
    const db = appData().db;
    return [...excluded].sort(
      (a, b) => (db.digimon[a]?.number ?? 0) - (db.digimon[b]?.number ?? 0),
    );
  }, [excluded]);

  // Close on outside pointer / Escape. Escape is captured here so it closes the
  // popover without also unwinding focus via the global key handler.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  const count = excluded.size;
  if (!focus || count === 0) return null;

  const label = `${count} branch${count === 1 ? '' : 'es'} hidden`;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={open ? `${styles.trigger} ${styles.triggerOpen}` : styles.trigger}
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        title={`${label} — click to restore`}
      >
        <span className={styles.glyph} aria-hidden="true">
          ⊘
        </span>
        <span className={styles.count}>{count}</span>
        <span className={styles.triggerText}>hidden</span>
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.pop} role="group" aria-label="Hidden branches">
          <div className={styles.popHead}>
            <span className={styles.popTitle}>Hidden branches</span>
            <button
              type="button"
              className={styles.showAll}
              onClick={() => {
                clearAll();
                setOpen(false);
              }}
            >
              Show all
            </button>
          </div>
          <ul className={styles.list}>
            {items.map((slug) => {
              const name = appData().db.digimon[slug]?.name ?? slug;
              return (
                <li key={slug}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => restore(slug)}
                    title={`Restore ${name}`}
                    aria-label={`Restore ${name}`}
                  >
                    <Sprite slug={slug} size={24} />
                    <span className={styles.itemName}>{name}</span>
                    <span className={styles.restore} aria-hidden="true">
                      ↺
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
