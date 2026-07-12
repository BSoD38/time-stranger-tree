import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useMediaQuery } from './ui/useMediaQuery';
import { useSheetDrag } from './ui/useSheetDrag';

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
        <BrandMark size={56} animated />
      </div>
      <h1 className={styles.splashTitle}>
        Time Stranger <span>Tree</span>
      </h1>
      {children}
    </div>
  );
}

type PanelMode = 'dock' | 'drawer' | 'sheet';

/**
 * Hosts the detail / route / empty panel. On desktop the panel is docked in the
 * flex row and displaces the graph (master–detail). Below 1024px the graph stays
 * full-bleed and the panel floats over it: a right-hand drawer on tablets, a
 * bottom sheet on phones. The same panel components render in every mode — only
 * the container and its dismiss affordances change.
 */
function PanelHost({
  mode,
  open,
  onClose,
  children,
}: {
  mode: PanelMode;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Retain the last content so the slide-out animation isn't blank while the
  // store has already cleared the selection.
  const [content, setContent] = useState<React.ReactNode>(children);
  useEffect(() => {
    if (open) setContent(children);
  }, [open, children]);
  // Clear any drag-applied inline transform when (re)opening so the CSS
  // open-state class can slide the sheet back into view.
  useEffect(() => {
    if (open && hostRef.current) {
      hostRef.current.style.transform = '';
      hostRef.current.style.transition = '';
    }
  }, [open]);

  const drag = useSheetDrag(hostRef, { enabled: mode === 'sheet', onClose });

  // Docked: the panel is a normal flex child; no overlay chrome.
  if (mode === 'dock') return <>{children}</>;

  return (
    <div
      ref={hostRef}
      className={styles.panelHost}
      data-mode={mode}
      data-open={open}
      aria-hidden={!open}
    >
      {mode === 'sheet' && (
        <button type="button" className={styles.grip} aria-label="Close panel" {...drag}>
          <span className={styles.gripBar} />
        </button>
      )}
      {content}
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

  // Layout mode is breakpoint-driven: docked ≥1024, drawer 640–1023, sheet <640.
  const overlay = useMediaQuery('(max-width: 1023px)');
  const compact = useMediaQuery('(max-width: 639px)');
  const panelMode: PanelMode = !overlay ? 'dock' : compact ? 'sheet' : 'drawer';

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

  // Dismiss whatever the overlay panel is currently showing.
  const closePanel = useCallback(() => {
    const store = useStore.getState();
    if (store.routeOpen) exitRoute();
    else store.select(null);
  }, []);

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

  // The idle "welcome" panel only earns its keep as a docked column; when the
  // graph is full-bleed it stays out of the way until the user picks something.
  const panelContent = routeOpen ? (
    <RoutePlanner />
  ) : selected ? (
    // key by slug so switching Digimon replays the panel's entrance (and the
    // stat bars re-fill) rather than swapping content in place
    <DetailPanel key={selected} slug={selected} />
  ) : panelMode === 'dock' ? (
    <EmptyPanel />
  ) : null;

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
        <div className={styles.search}>
          <SearchBox />
        </div>
        <div className={styles.viewActions}>
          <SegButton active={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>
            Filters
          </SegButton>
          <SegButton active={routeOpen} onClick={() => (routeOpen ? exitRoute() : openRoute())}>
            Route
          </SegButton>
          {focus && (
            <SegButton active onClick={exitFocus} title="Exit focus (Esc)">
              ◈ <span className={styles.focusFull}>Focused — exit</span>
              <span className={styles.focusShort}>Exit</span>
            </SegButton>
          )}
        </div>
        <div className={styles.sysActions}>
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
        <PanelHost mode={panelMode} open={routeOpen || Boolean(selected)} onClose={closePanel}>
          {panelContent}
        </PanelHost>
      </div>
    </div>
  );
}
