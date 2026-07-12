import { useState } from 'react';
import { appData } from '../../data/appData';
import { STAT_KEYS, type Digimon } from '../../data/schema';
import styles from './StatBars.module.css';

export function StatBars({ digimon }: { digimon: Digimon }) {
  const [level, setLevel] = useState<'lv1' | 'lv99'>('lv99');
  const maxima = appData().statMaxima;

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
      {STAT_KEYS.map((stat) => {
        const value = digimon.stats[stat][level];
        // bars normalize against the global per-stat lv99 max so digimon are comparable
        const pct = Math.min(100, (value / maxima[stat]) * 100);
        return (
          <div key={stat} className={styles.row}>
            <span className={styles.stat}>{stat}</span>
            <div className={styles.track}>
              <div className={styles.bar} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.value}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}
