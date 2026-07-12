import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import type { Orientation } from '../graph/orient';
import styles from './SettingsMenu.module.css';

interface Choice<T> {
  value: T;
  label: string;
}

function Segmented<T extends string | boolean>({
  label,
  hint,
  value,
  choices,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  choices: Choice<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.seg} role="group" aria-label={label}>
        {choices.map((c) => (
          <button
            key={String(c.value)}
            className={c.value === value ? styles.segActive : styles.segBtn}
            aria-pressed={c.value === value}
            onClick={() => onChange(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

/** Display preferences popover — layout orientation and isolate (focus/route) behaviour. */
export function SettingsMenu() {
  const open = useStore((s) => s.settingsOpen);
  const setOpen = useStore((s) => s.setSettingsOpen);
  const orientation = useStore((s) => s.orientation);
  const setOrientation = useStore((s) => s.setOrientation);
  const hideOthers = useStore((s) => s.hideOthers);
  const setHideOthers = useStore((s) => s.setHideOthers);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // capture Escape here so it closes the popover without also unwinding
    // focus/route via the global key handler
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
  }, [open, setOpen]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={open ? `${styles.trigger} ${styles.triggerOpen}` : styles.trigger}
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Display settings"
        title="Display settings"
      >
        <span className={styles.icon} aria-hidden="true">
          ⚙
        </span>
      </button>
      {open && (
        <div className={styles.pop}>
          <Segmented<Orientation>
            label="Layout"
            hint="Rows spreads members sideways; columns suits portrait screens."
            value={orientation}
            choices={[
              { value: 'rows', label: 'Rows' },
              { value: 'columns', label: 'Columns' },
            ]}
            onChange={setOrientation}
          />
          <Segmented<boolean>
            label="Focus & route"
            hint="How the rest of the tree behaves while a lineage is focused or a route is shown."
            value={hideOthers}
            choices={[
              { value: true, label: 'Hide others' },
              { value: false, label: 'Dim others' },
            ]}
            onChange={setHideOthers}
          />
        </div>
      )}
    </div>
  );
}
