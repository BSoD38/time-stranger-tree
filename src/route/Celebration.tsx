import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { appData } from '../data/appData';
import { useStore } from '../state/store';
import { nodeAccentHex } from '../theme/chroma';
import styles from './Celebration.module.css';

interface Burst {
  label: string;
  steps: number;
  color: string;
}

/** A small peak-moment flourish when a route is successfully plotted — in the
 *  destination Digimon's own signature colour. */
export function Celebration() {
  const routeOpen = useStore((s) => s.routeOpen);
  const from = useStore((s) => s.route.from);
  const to = useStore((s) => s.route.to);
  const routes = useStore((s) => s.route.routes);
  const active = useStore((s) => s.route.active);
  const [burst, setBurst] = useState<Burst | null>(null);
  const lastKey = useRef('');

  useEffect(() => {
    if (!routeOpen || !from || !to || !routes || !routes.length) {
      lastKey.current = '';
      return;
    }
    const route = routes[active];
    if (!route || !route.steps.length) return;
    const key = `${from}|${to}|${routes.length}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    setBurst({
      label: appData().db.digimon[to].name,
      steps: route.steps.length,
      color: nodeAccentHex(to),
    });
    const id = window.setTimeout(() => setBurst(null), 2400);
    return () => window.clearTimeout(id);
  }, [routeOpen, from, to, routes, active]);

  if (!burst) return null;

  return (
    <div className={styles.wrap} style={{ '--cel': burst.color } as CSSProperties}>
      <div className={styles.glow} />
      <div className={styles.toast} role="status">
        <span className={styles.star}>✦</span>
        Route to {burst.label} — {burst.steps} {burst.steps === 1 ? 'step' : 'steps'}
      </div>
    </div>
  );
}
