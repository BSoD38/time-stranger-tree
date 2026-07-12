import { Fragment, memo, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { appData } from '../data/appData';
import { ATTRIBUTE_KEYS, GENERATION_KEYS, STAT_KEYS, type StatLevel } from '../data/schema';
import { useSearchHotkey } from '../search/useSearchHotkey';
import { toggled, useStore } from '../state/store';
import { ATTRIBUTE_COLORS } from '../theme/attribute';
import { FilterChip, FilterChipGroup } from '../ui/FilterChip';
import { LevelToggle } from '../ui/LevelToggle';
import { Sprite } from '../ui/Sprite';
import { buildCodexRows, compareRows, defaultDir, maxTotal, type CodexRow, type SortKey } from './codexRows';
import styles from './CodexPage.module.css';

const STAT_TITLES: Record<string, string> = {
  HP: 'Hit Points',
  SP: 'Skill Points',
  ATK: 'Attack',
  DEF: 'Defense',
  INT: 'Intelligence',
  SPI: 'Spirit',
  SPD: 'Speed',
};

/**
 * One table row, memoized. Filtering only changes which rows are in the list (not
 * the row objects themselves), so with stable row identity and a stable `onOpen`
 * store action, rows whose `level` / `sortKey` / `fill` didn't change skip
 * re-rendering — keeping the unvirtualized 475-row table responsive on low-end
 * hardware while the user types in the filter.
 */
const CodexTableRow = memo(function CodexTableRow({
  row,
  level,
  sortKey,
  fill,
  onOpen,
}: {
  row: CodexRow;
  level: StatLevel;
  sortKey: SortKey;
  fill: number;
  onOpen: (slug: string) => void;
}) {
  return (
    <tr className={styles.row} onClick={() => onOpen(row.slug)}>
      <td className={`${styles.cell} ${styles.numeric} ${styles.stickyNum}`}>{row.number}</td>
      <td className={`${styles.cell} ${styles.stickyName}`}>
        <button
          type="button"
          className={styles.nameBtn}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(row.slug);
          }}
          title={`View ${row.name} in the Tree`}
        >
          <Sprite slug={row.slug} size={26} className={styles.sprite} />
          <span className={styles.nameText}>{row.name}</span>
        </button>
      </td>
      <td className={`${styles.cell} ${styles.gen} ${sortKey === 'generation' ? styles.sortedCell : ''}`}>
        {row.generation}
      </td>
      <td className={`${styles.cell} ${styles.attr} ${sortKey === 'attribute' ? styles.sortedCell : ''}`}>
        <span className={styles.attrDot} style={{ background: ATTRIBUTE_COLORS[row.attribute] }} />
        {row.attribute}
      </td>
      {STAT_KEYS.map((s) => (
        <td
          key={s}
          className={`${styles.cell} ${styles.numeric} ${sortKey === s ? styles.sortedCell : ''}`}
        >
          {row.stats[level][s]}
        </td>
      ))}
      <td
        className={`${styles.cell} ${styles.numeric} ${styles.totalCell} ${sortKey === 'total' ? styles.sortedCell : ''}`}
      >
        <span className={styles.totalVal}>{row.total[level]}</span>
        <span className={styles.totalTrack}>
          <span className={styles.totalFill} style={{ '--fill': fill } as CSSProperties} />
        </span>
      </td>
    </tr>
  );
});

export function CodexPage() {
  const enterTreeFocused = useStore((s) => s.enterTreeFocused);
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchHotkey(searchRef);

  const rows = useMemo(() => buildCodexRows(appData().db), []);
  const maxima = useMemo(
    () => ({ lv1: maxTotal(rows, 'lv1'), lv99: maxTotal(rows, 'lv99') }),
    [rows],
  );

  // Held in the store (not local state) so filters / sort / level persist across
  // switching to the Tree and back — the Codex unmounts each time.
  const patchCodex = useStore((s) => s.patchCodex);
  const { query, generations: gens, attributes: attrs, level, sortKey, sortDir } = useStore(
    (s) => s.codex,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // A leading '#' or an all-digits query is a dex-number lookup. Parse to an int
    // so leading zeros match ('007' → #7); a lone '#' (a number-in-progress)
    // matches everything rather than blanking the table.
    const digits = q.replace(/^#/, '');
    const numberQuery = /^\d+$/.test(digits) ? Number(digits) : null;
    const numberMode = numberQuery !== null || q.startsWith('#');
    const dir: 1 | -1 = sortDir === 'asc' ? 1 : -1;
    return rows
      .filter((r) => {
        if (gens.size && !gens.has(r.generation)) return false;
        if (attrs.size && !attrs.has(r.attribute)) return false;
        if (!q) return true;
        if (numberMode) return numberQuery === null || r.number === numberQuery;
        return r.name.toLowerCase().includes(q);
      })
      .sort((a, b) => compareRows(a, b, sortKey, level, dir));
  }, [rows, query, gens, attrs, sortKey, sortDir, level]);

  const filtering = query.trim() !== '' || gens.size > 0 || attrs.size > 0;
  const clearAll = () =>
    patchCodex({ query: '', generations: new Set(), attributes: new Set() });

  const onSort = (key: SortKey) => {
    if (key === sortKey) patchCodex({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
    else patchCodex({ sortKey: key, sortDir: defaultDir(key) });
  };

  const th = (key: SortKey, label: ReactNode, opts: { numeric?: boolean; sticky?: string; title?: string } = {}) => {
    const active = sortKey === key;
    const classes = [
      styles.th,
      opts.numeric ? styles.thNumeric : '',
      opts.sticky ?? '',
      active ? styles.thActive : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <th
        scope="col"
        className={classes}
        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        title={opts.title}
      >
        <button type="button" className={styles.sortBtn} onClick={() => onSort(key)}>
          <span>{label}</span>
          <span className={styles.arrow} aria-hidden="true">
            {active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
          </span>
        </button>
      </th>
    );
  };

  return (
    <section className={styles.page} aria-label="Codex — all Digimon">
      <div className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          <input
            ref={searchRef}
            className={styles.search}
            type="search"
            value={query}
            onChange={(e) => patchCodex({ query: e.target.value })}
            placeholder="Filter by name or #…"
            spellCheck={false}
            aria-label="Filter Digimon by name or number"
          />
          <LevelToggle value={level} onChange={(l) => patchCodex({ level: l })} />
          <div className={styles.tail}>
            <span className={styles.count}>
              <strong>{filtered.length}</strong> / {rows.length}
            </span>
            {filtering && (
              <button type="button" className={styles.clear} onClick={clearAll}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className={styles.filters}>
          <FilterChipGroup label="Gen">
            {GENERATION_KEYS.map((g) => (
              <FilterChip
                key={g}
                active={gens.has(g)}
                onClick={() => patchCodex({ generations: toggled(gens, g) })}
              >
                {g}
              </FilterChip>
            ))}
          </FilterChipGroup>
          <FilterChipGroup label="Attribute">
            {ATTRIBUTE_KEYS.map((a) => (
              <FilterChip
                key={a}
                active={attrs.has(a)}
                color={ATTRIBUTE_COLORS[a]}
                dot
                onClick={() => patchCodex({ attributes: toggled(attrs, a) })}
              >
                {a}
              </FilterChip>
            ))}
          </FilterChipGroup>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {th('number', '#', { numeric: true, sticky: styles.stickyNum, title: 'Dex number' })}
              {th('name', 'Digimon', { sticky: styles.stickyName })}
              {th('generation', 'Gen')}
              {th('attribute', 'Attribute')}
              {STAT_KEYS.map((s) => (
                <Fragment key={s}>{th(s, s, { numeric: true, title: STAT_TITLES[s] })}</Fragment>
              ))}
              {th('total', 'Total', { numeric: true, title: 'Sum of all seven stats' })}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <CodexTableRow
                key={r.slug}
                row={r}
                level={level}
                sortKey={sortKey}
                fill={r.total[level] / maxima[level]}
                onOpen={enterTreeFocused}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No Digimon match these filters.</p>
            <button type="button" className={styles.emptyClear} onClick={clearAll}>
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
