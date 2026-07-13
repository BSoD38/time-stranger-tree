import { useMemo, type ReactNode } from 'react';
import { appData } from '../../data/appData';
import { lineage } from '../../data/graph';
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
 *  evolutions, so it rides along on every link.
 *
 *  While a lineage is focused, any neighbour that belongs to the focused family
 *  gains a trailing prune toggle — hide the branch to cut clutter, or restore a
 *  branch already hidden. The toggle is a sibling of the row (never nested in
 *  its button), so both stay valid, independent controls. */
function Row({ slug, sub, prunable }: { slug: string; sub?: ReactNode; prunable: boolean }) {
  const select = useStore((s) => s.select);
  const excluded = useStore((s) => s.lineageExcluded);
  const exclude = useStore((s) => s.excludeFromLineage);
  const restore = useStore((s) => s.restoreToLineage);
  const d = appData().db.digimon[slug];

  const row = (
    <MonRow
      slug={slug}
      sub={sub}
      className={prunable ? styles.neighbourMon : undefined}
      meta={<span className={styles.persona}>{d.basePersonality}</span>}
      title={`Base personality: ${d.basePersonality}`}
      onClick={() => select(slug)}
    />
  );

  if (!prunable) return row;

  const hidden = excluded.has(slug);
  const action = hidden
    ? `Restore ${d.name} to the focused lineage`
    : `Hide ${d.name} and its branch from the focused lineage`;
  return (
    <div className={hidden ? `${styles.neighbour} ${styles.neighbourHidden}` : styles.neighbour}>
      {row}
      <button
        type="button"
        className={styles.pruneBtn}
        aria-pressed={hidden}
        aria-label={action}
        title={action}
        onClick={() => (hidden ? restore(slug) : exclude(slug))}
      >
        <span aria-hidden="true">{hidden ? '↺' : '⊘'}</span>
      </button>
    </div>
  );
}

export function EvolutionLinks({ digimon }: { digimon: Digimon }) {
  const db = appData().db;
  const focus = useStore((s) => s.focus);
  // The focused family (ignoring current exclusions, so an already-hidden branch
  // still shows its restore toggle here). A neighbour is prunable only if it's
  // part of this family and isn't the focus itself.
  const family = useMemo(() => (focus ? lineage(appData().graph, focus).nodes : null), [focus]);
  const canPrune = (slug: string): boolean =>
    focus != null && slug !== focus && (family?.has(slug) ?? false);

  return (
    <div className={styles.wrap}>
      {digimon.evolvesFrom.length > 0 && (
        <div>
          <div className={`label ${styles.label}`}>Evolves from</div>
          {digimon.evolvesFrom.map((slug) => (
            <Row
              key={slug}
              slug={slug}
              sub={isModeChange(digimon, slug) ? modeChangeTag : undefined}
              prunable={canPrune(slug)}
            />
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
            return <Row key={slug} slug={slug} sub={sub} prunable={canPrune(slug)} />;
          })}
        </div>
      )}
      {digimon.evolvesFrom.length === 0 && digimon.evolvesTo.length === 0 && (
        <div className={`label ${styles.label}`}>No evolution links.</div>
      )}
    </div>
  );
}
