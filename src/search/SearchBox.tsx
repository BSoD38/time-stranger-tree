import { useEffect, useRef, useState } from 'react';
import { appData } from '../data/appData';
import { search } from '../data/search';
import { useStore } from '../state/store';
import { ATTRIBUTE_COLORS } from '../theme/attribute';
import { MonRow } from '../ui/MonRow';
import { useSearchNav } from './useSearchNav';
import styles from './SearchBox.module.css';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const select = useStore((s) => s.select);
  const setFocus = useStore((s) => s.setFocus);

  const hits = open && query ? search(appData().searchIndex, query) : [];

  // global shortcuts: '/' or Ctrl+K focus the search box
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement)?.tagName === 'INPUT';
      if ((event.key === '/' && !typing) || (event.key === 'k' && event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = (slug: string, alsoFocus: boolean) => {
    select(slug);
    if (alsoFocus) setFocus(slug);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const { highlighted, setHighlighted, onKeyDown } = useSearchNav(hits, {
    onPick: (hit, shiftKey) => pick(hit.slug, shiftKey), // Shift+Enter = focus lineage
    onClose: () => {
      setOpen(false);
      inputRef.current?.blur();
    },
  });

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        className={styles.input}
        placeholder="Search Digimon…  ( / )"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        spellCheck={false}
      />
      {open && query.trim() !== '' && hits.length === 0 && (
        <div className={styles.dropdown}>
          <div className={styles.noResults}>No Digimon match “{query.trim()}”.</div>
        </div>
      )}
      {open && hits.length > 0 && (
        <div className={styles.dropdown}>
          {hits.map((hit, i) => {
            const d = appData().db.digimon[hit.slug];
            return (
              <MonRow
                key={hit.slug}
                slug={hit.slug}
                size={24}
                active={i === highlighted}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(hit.slug, e.shiftKey);
                }}
                meta={
                  <>
                    <span
                      className={styles.attrDot}
                      style={{ background: ATTRIBUTE_COLORS[d.attribute] }}
                      title={d.attribute}
                      role="img"
                      aria-label={d.attribute}
                    />
                    {d.generation}
                  </>
                }
              />
            );
          })}
          <div className={styles.hint}>Enter: select · Shift+Enter: focus lineage</div>
        </div>
      )}
    </div>
  );
}
