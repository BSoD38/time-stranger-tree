// Light/dark chrome theme. Persisted, system-default, applied via a data-theme
// attribute on <html> (tokens.css overrides only on [data-theme='light']).
// The graph viewport stays dark in both — see --graph-bg.
export type Theme = 'light' | 'dark';

const KEY = 'tst.theme';
const listeners = new Set<(t: Theme) => void>();
let current: Theme = 'dark';

function systemPref(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Run before first paint (also mirrored by an inline script in index.html). */
export function initTheme(): Theme {
  const stored = localStorage.getItem(KEY) as Theme | null;
  current = stored === 'light' || stored === 'dark' ? stored : systemPref();
  document.documentElement.setAttribute('data-theme', current);
  return current;
}

export function getTheme(): Theme {
  return current;
}

export function setTheme(theme: Theme): void {
  current = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(KEY, theme);
  listeners.forEach((l) => l(theme));
}

export function toggleTheme(): void {
  setTheme(current === 'dark' ? 'light' : 'dark');
}

export function subscribeTheme(listener: (t: Theme) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
