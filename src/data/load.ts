import type { DigimonDatabase } from './schema';

export class DataLoadError extends Error {}

export async function loadDatabase(signal?: AbortSignal): Promise<DigimonDatabase> {
  const res = await fetch('/digimon.json', { signal });
  if (!res.ok) throw new DataLoadError(`Failed to fetch digimon.json: HTTP ${res.status}`);
  const db = (await res.json()) as DigimonDatabase;
  if (db?.meta?.schemaVersion !== 1) {
    throw new DataLoadError(`Unsupported schemaVersion: ${db?.meta?.schemaVersion}`);
  }
  const count = Object.keys(db.digimon).length;
  if (db.meta.count !== count) {
    throw new DataLoadError(`meta.count ${db.meta.count} != ${count} records`);
  }
  return db;
}

/** Full-size 256px icon (detail-panel hero portrait). */
export const iconUrl = (slug: string): string => `/icons/${slug}.png`;

/** 128px webp thumbnail (graph nodes + small sprites). */
export const thumbUrl = (slug: string): string => `/thumbs/${slug}.webp`;

/**
 * Warm the browser cache with every node thumbnail (~4 MB total) so the graph
 * never pops in as you pan and reused sprites are instant everywhere. Runs on
 * idle with a rolling concurrency window; best-effort — failures are ignored.
 */
export function prefetchThumbnails(slugs: readonly string[], concurrency = 8): void {
  if (typeof window === 'undefined' || !slugs.length) return;
  const run = () => {
    let i = 0;
    const pump = () => {
      if (i >= slugs.length) return;
      const img = new Image();
      img.onload = img.onerror = pump; // advance the window as each settles
      img.src = thumbUrl(slugs[i++]);
    };
    for (let c = 0; c < Math.min(concurrency, slugs.length); c++) pump();
  };
  const idle = (window as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (idle) idle(run);
  else setTimeout(run, 300);
}
