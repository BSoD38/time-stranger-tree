import { thumbUrl } from '../data/load';
import styles from './Sprite.module.css';

/**
 * A Digimon thumbnail — one place for how sprites resolve and render app-wide
 * (source, lazy loading, corner radius). Decorative, so `alt` is empty. Pass a
 * `className` to add context-specific styling (e.g. a placeholder background).
 */
export function Sprite({
  slug,
  size = 28,
  className,
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={className ? `${styles.sprite} ${className}` : styles.sprite}
      src={thumbUrl(slug)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
    />
  );
}
