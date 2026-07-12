import { useState, type ReactNode } from 'react';
import styles from './Collapse.module.css';

interface CollapseProps {
  id: string; // localStorage key suffix
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

const storageKey = (id: string) => `tst.collapse.${id}`;

export function Collapse({ id, title, defaultOpen = false, children }: CollapseProps) {
  const [open, setOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(storageKey(id));
    return stored === null ? defaultOpen : stored === '1';
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(storageKey(id), next ? '1' : '0');
  };

  return (
    <section className={styles.section}>
      <button className={styles.header} onClick={toggle} aria-expanded={open}>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>▸</span>
        {title}
      </button>
      {open && <div className={styles.body}>{children}</div>}
    </section>
  );
}
