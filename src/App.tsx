import { useCallback, useEffect, useState } from 'react';
import styles from './App.module.css';
import { initAppData } from './data/appData';
import { loadDatabase, prefetchThumbnails } from './data/load';
import { FilterBar } from './filters/FilterBar';
import { GraphCanvas } from './graph/GraphCanvas';
import { Celebration } from './route/Celebration';
import { DetailPanel } from './panel/DetailPanel';
import { EmptyPanel } from './panel/EmptyPanel';
import { RoutePlanner } from './route/RoutePlanner';
import { SearchBox } from './search/SearchBox';
import { SettingsMenu } from './settings/SettingsMenu';
import { useStore } from './state/store';
import { exitFocus, exitRoute, initUrlSync } from './state/urlSync';
import { ATTRIBUTE_COLORS, injectThemeVars } from './theme/attribute';
import { ATTRIBUTE_KEYS } from './data/schema';
import { useChromaticAccent } from './theme/useChromaticAccent';
import { BrandMark } from './ui/BrandMark';
import { SegButton } from './ui/SegButton';
import { ThemeToggle } from './ui/ThemeToggle';

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

function Splash({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.splash}>
      <div className={styles.splashMark}>
        <BrandMark size={56} />
      </div>
      <h1 className={styles.splashTitle}>
        Time Stranger <span>Tree</span>
      </h1>
      {children}
    </div>
  );
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
  const [attempt, setAttempt] = useState(0);

  useChromaticAccent();

  useEffect(() => {
    injectThemeVars();
    const controller = new AbortController();
    setError(null);
    loadDatabase(controller.signal)
      .then((db) => {
        initAppData(db);
        useStore.getState().setReady();
        initUrlSync();
        prefetchThumbnails(Object.keys(db.digimon));
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('Failed to load Digimon database:', err);
          setError(String(err));
        }
      });
    return () => controller.abort();
  }, [attempt]);

  useGlobalKeys();

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (error) {
    return (
      <Splash>
        <div className={styles.error}>
          <p className={styles.errorMsg}>
            Couldn&rsquo;t reach the Digital World. Check your connection, then try again.
          </p>
          <button className={styles.retry} onClick={retry}>
            Try again
          </button>
        </div>
      </Splash>
    );
  }
  if (!ready) {
    return (
      <Splash>
        <div className={styles.loadingBar} role="status" aria-label="Loading the Digital World" />
      </Splash>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark}>
            <BrandMark size={22} />
          </span>
          <h1 className={styles.title}>
            Time Stranger <span className={styles.titleAccent}>Tree</span>
          </h1>
        </div>
        <SearchBox />
        <div className={styles.topActions}>
          <SegButton active={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
            Filters
          </SegButton>
          <SegButton active={routeOpen} onClick={() => (routeOpen ? exitRoute() : openRoute())}>
            Route
          </SegButton>
          {focus && (
            <SegButton active onClick={exitFocus} title="Exit focus (Esc)">
              ◈ Focused — exit
            </SegButton>
          )}
          <SettingsMenu />
          <ThemeToggle />
        </div>
      </header>
      {filtersOpen && <FilterBar />}
      <div className={styles.body}>
        <main className={styles.canvas}>
          <GraphCanvas />
          <Celebration />
          <div className={styles.legend}>
            <span className={styles.legendTitle}>Attribute</span>
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
        {routeOpen ? <RoutePlanner /> : selected ? <DetailPanel slug={selected} /> : <EmptyPanel />}
      </div>
    </div>
  );
}
