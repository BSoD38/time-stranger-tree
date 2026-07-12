import { useTheme } from '../theme/useTheme';
import styles from './ThemeToggle.module.css';

/** Sun/moon switch for the light/dark chrome theme. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className={styles.btn}
      onClick={toggle}
      title={`Switch to ${next} theme`}
      aria-label={`Switch to ${next} theme`}
    >
      <span className={styles.icon} aria-hidden="true">
        {theme === 'dark' ? '☾' : '☀'}
      </span>
    </button>
  );
}
