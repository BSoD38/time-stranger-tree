import { useEffect, useState } from 'react';
import styles from './App.module.css';
import { initAppData } from './data/appData';
import { loadDatabase } from './data/load';
import { FilterBar } from './filters/FilterBar';
import { GraphCanvas } from './graph/GraphCanvas';
import { DetailPanel } from './panel/DetailPanel';
import { RoutePlanner } from './route/RoutePlanner';
import { SearchBox } from './search/SearchBox';
import { useStore } from './state/store';
import { exitFocus, exitRoute, initUrlSync } from './state/urlSync';
import { ATTRIBUTE_COLORS, injectThemeVars } from './theme/attribute';
import { ATTRIBUTE_KEYS } from './data/schema';

function useGlobalKeys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      const store = useStore.getState();
      if (event.key === 'Escape') {
        if (store.focus) exitFocus();
        else if (store.routeOpen) exitRoute();
        else store.select(null);
      } else if (event.key === 'f' || event.key === 'F') {
        if (store.selected) store.setFocus(store.focus === store.selected ? null : store.selected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  const ready = useStore((s) => s.ready);
  const selected = useStore((s) => s.selected);
  const routeOpen = useStore((s) => s.routeOpen);
  const focus = useStore((s) => s.focus);
  const filtersOpen = useStore((s) => s.filtersOpen);
  const setFiltersOpen = useStore((s) => s.setFiltersOpen);
  const openRoute = useStore((s) => s.openRoute);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    injectThemeVars();
    const controller = new AbortController();
    loadDatabase(controller.signal)
      .then((db) => {
        initAppData(db);
        useStore.getState().setReady();
        initUrlSync();
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(String(err));
      });
    return () => controller.abort();
  }, []);

  useGlobalKeys();

  if (error) {
    return (
      <div className={styles.splash}>
        <h1>Time Stranger Tree</h1>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className={styles.splash}>
        <h1>Time Stranger Tree</h1>
        <p>Loading the Digital World…</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>
          Time Stranger <span className={styles.titleAccent}>Tree</span>
        </h1>
        <SearchBox />
        <div className={styles.topActions}>
          <button
            className={filtersOpen ? styles.topButtonActive : styles.topButton}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            Filters
          </button>
          <button
            className={routeOpen ? styles.topButtonActive : styles.topButton}
            onClick={() => (routeOpen ? exitRoute() : openRoute())}
          >
            Route
          </button>
          {focus && (
            <button className={styles.topButtonActive} onClick={exitFocus} title="Exit focus (Esc)">
              ◈ Focused — exit
            </button>
          )}
        </div>
      </header>
      {filtersOpen && <FilterBar />}
      <div className={styles.body}>
        <main className={styles.canvas}>
          <GraphCanvas />
          <div className={styles.legend}>
            {ATTRIBUTE_KEYS.map((attribute) => (
              <span key={attribute} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: ATTRIBUTE_COLORS[attribute] }}
                />
                {attribute}
              </span>
            ))}
          </div>
        </main>
        {routeOpen ? <RoutePlanner /> : selected ? <DetailPanel slug={selected} /> : null}
      </div>
    </div>
  );
}
