import { useEffect, useRef, useState } from 'react';
import { appData } from '../data/appData';
import { iconUrl } from '../data/load';
import { search } from '../data/search';
import { useStore } from '../state/store';
import { ATTRIBUTE_COLORS } from '../theme/attribute';
import styles from './SearchBox.module.css';

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
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

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!hits.length) {
      if (event.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, hits.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(hits[highlighted].slug, event.shiftKey); // Shift+Enter = focus lineage
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

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
      {open && hits.length > 0 && (
        <div className={styles.dropdown}>
          {hits.map((hit, i) => {
            const d = appData().db.digimon[hit.slug];
            return (
              <button
                key={hit.slug}
                className={i === highlighted ? styles.hitActive : styles.hit}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(hit.slug, e.shiftKey);
                }}
              >
                <img src={iconUrl(hit.slug)} alt="" width={24} height={24} loading="lazy" />
                <span className={styles.hitName}>{d.name}</span>
                <span
                  className={styles.attrDot}
                  style={{ background: ATTRIBUTE_COLORS[d.attribute] }}
                  title={d.attribute}
                />
                <span className={styles.hitGen}>{d.generation}</span>
              </button>
            );
          })}
          <div className={styles.hint}>Enter: select · Shift+Enter: focus lineage</div>
        </div>
      )}
    </div>
  );
}
