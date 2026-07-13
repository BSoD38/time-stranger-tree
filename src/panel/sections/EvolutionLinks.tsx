import type { ReactNode } from 'react';
import { appData } from '../../data/appData';
import type { Digimon } from '../../data/schema';
import { useStore } from '../../state/store';
import { MonRow } from '../../ui/MonRow';
import styles from './EvolutionLinks.module.css';

/** A mode change is a reciprocal (2-cycle) evolution — `a` and `b` each evolve
 *  into the other, i.e. a switchable alternate form (Spirit Human/Beast,
 *  X-Antibody, Alter, DM/FM modes, …). Symmetric, so it holds whether `b` is a
 *  pre- or post-evolution of `a`. */
const isModeChange = (a: Digimon, bSlug: string): boolean => {
  const b = appData().db.digimon[bSlug];
  return !!b && a.evolvesTo.includes(bSlug) && b.evolvesTo.includes(a.slug);
};

const modeChangeTag = (
  <span className={styles.modeChange} title="Switchable alternate form — evolves back and forth">
    ⇄ Mode change
  </span>
);

/** Compact one-line summary of a target's evolution condition. */
function microSummary(target: Digimon): string {
  const cond = target.evolutionCondition;
  const parts: string[] = [`Rk ${cond.agentRank.value}`];
  for (const [stat, threshold] of Object.entries(cond.stats ?? {})) {
    parts.push(`${stat} ${threshold!.value}`);
  }
  if (cond.talent) parts.push(`Tal ${cond.talent.value}`);
  if (cond.requiredItem) parts.push('◆ item');
  if (cond.jogressPartners) parts.push('⧉ Jogress/DNA');
  if (cond.agentSkills) parts.push('❖ bond');
  return parts.slice(0, 4).join(' · ');
}

/** An evolution neighbour: sprite + name, its base personality (right), and an
 *  optional condition sub-line. Personality is load-bearing when planning
 *  evolutions, so it rides along on every link. */
function Row({ slug, sub }: { slug: string; sub?: ReactNode }) {
  const select = useStore((s) => s.select);
  const d = appData().db.digimon[slug];
  return (
    <MonRow
      slug={slug}
      sub={sub}
      meta={<span className={styles.persona}>{d.basePersonality}</span>}
      title={`Base personality: ${d.basePersonality}`}
      onClick={() => select(slug)}
    />
  );
}

export function EvolutionLinks({ digimon }: { digimon: Digimon }) {
  const db = appData().db;
  return (
    <div className={styles.wrap}>
      {digimon.evolvesFrom.length > 0 && (
        <div>
          <div className={`label ${styles.label}`}>Evolves from</div>
          {digimon.evolvesFrom.map((slug) => (
            <Row key={slug} slug={slug} sub={isModeChange(digimon, slug) ? modeChangeTag : undefined} />
          ))}
        </div>
      )}
      {digimon.evolvesTo.length > 0 && (
        <div>
          <div className={`label ${styles.label}`}>Evolves to</div>
          {digimon.evolvesTo.map((slug) => {
            const cond = microSummary(db.digimon[slug]);
            const sub = isModeChange(digimon, slug) ? (
              <>
                {modeChangeTag}
                {' · '}
                {cond}
              </>
            ) : (
              cond
            );
            return <Row key={slug} slug={slug} sub={sub} />;
          })}
        </div>
      )}
      {digimon.evolvesFrom.length === 0 && digimon.evolvesTo.length === 0 && (
        <div className={`label ${styles.label}`}>No evolution links.</div>
      )}
    </div>
  );
}
