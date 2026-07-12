import type { CSSProperties, ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  children: ReactNode;
  color?: string;
  title?: string;
  onClick?: () => void;
}

export function Chip({ children, color, title, onClick }: ChipProps) {
  const style: CSSProperties | undefined = color
    ? { borderColor: color, color }
    : undefined;
  if (onClick) {
    return (
      <button className={`${styles.chip} ${styles.clickable}`} style={style} title={title} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <span className={styles.chip} style={style} title={title}>
      {children}
    </span>
  );
}
