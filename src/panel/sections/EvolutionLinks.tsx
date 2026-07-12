import { appData } from '../../data/appData';
import { iconUrl } from '../../data/load';
import type { Digimon } from '../../data/schema';
import { useStore } from '../../state/store';
import styles from './EvolutionLinks.module.css';

/** Compact one-line summary of a target's evolution condition. */
function microSummary(target: Digimon): string {
  const cond = target.evolutionCondition;
  const parts: string[] = [`Rk ${cond.agentRank.value}`];
  for (const [stat, threshold] of Object.entries(cond.stats ?? {})) {
    parts.push(`${stat} ${threshold!.value}`);
  }
  if (cond.talent) parts.push(`Tal ${cond.talent.value}`);
  if (cond.requiredItem) parts.push('◆ item');
  if (cond.jogressPartners) parts.push('⧉ jogress');
  if (cond.agentSkills) parts.push('❖ bond');
  return parts.slice(0, 4).join(' · ');
}

function Row({ slug, summary }: { slug: string; summary?: string }) {
  const select = useStore((s) => s.select);
  const d = appData().db.digimon[slug];
  return (
    <button className={styles.row} onClick={() => select(slug)}>
      <img src={iconUrl(slug)} alt="" width={28} height={28} loading="lazy" />
      <span className={styles.name}>{d.name}</span>
      <span className={styles.meta}>{summary ?? d.generation}</span>
    </button>
  );
}

export function EvolutionLinks({ digimon }: { digimon: Digimon }) {
  const db = appData().db;
  return (
    <div className={styles.wrap}>
      {digimon.evolvesFrom.length > 0 && (
        <div>
          <div className={styles.label}>Evolves from</div>
          {digimon.evolvesFrom.map((slug) => (
            <Row key={slug} slug={slug} />
          ))}
        </div>
      )}
      {digimon.evolvesTo.length > 0 && (
        <div>
          <div className={styles.label}>Evolves to</div>
          {digimon.evolvesTo.map((slug) => (
            <Row key={slug} slug={slug} summary={microSummary(db.digimon[slug])} />
          ))}
        </div>
      )}
      {digimon.evolvesFrom.length === 0 && digimon.evolvesTo.length === 0 && (
        <div className={styles.label}>No evolution links.</div>
      )}
    </div>
  );
}
