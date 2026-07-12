import { useEffect, useState, type CSSProperties } from 'react';
import { appData } from '../../data/appData';
import { STAT_KEYS, type Digimon } from '../../data/schema';
import styles from './StatBars.module.css';

export function StatBars({ digimon }: { digimon: Digimon }) {
  const [level, setLevel] = useState<'lv1' | 'lv99'>('lv99');
  const maxima = appData().statMaxima;

  // Bars start empty on mount, then fill on the next frame so the grow-in
  // transition always fires (this section remounts each time it's expanded).
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div>
      <div className={styles.toggle}>
        <button
          className={level === 'lv1' ? styles.active : ''}
          onClick={() => setLevel('lv1')}
        >
          Lv. 1
        </button>
        <button
          className={level === 'lv99' ? styles.active : ''}
          onClick={() => setLevel('lv99')}
        >
          Lv. 99
        </button>
      </div>
      {STAT_KEYS.map((stat, i) => {
        const value = digimon.stats[stat][level];
        // bars normalize against the global per-stat lv99 max so digimon are comparable
        const fill = Math.min(1, value / maxima[stat]);
        return (
          <div key={stat} className={styles.row}>
            <span className={styles.stat}>{stat}</span>
            <div className={styles.track}>
              <div
                className={styles.bar}
                style={{ '--fill': grown ? fill : 0, '--i': i } as CSSProperties}
              />
            </div>
            <span className={styles.value}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}
