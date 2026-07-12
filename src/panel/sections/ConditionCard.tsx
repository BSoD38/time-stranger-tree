import type { EvolutionCondition } from '../../data/schema';
import { useStore } from '../../state/store';
import { Chip } from '../../ui/Chip';
import { MonRow } from '../../ui/MonRow';
import styles from './ConditionCard.module.css';

interface ConditionCardProps {
  condition: EvolutionCondition;
}

/** "How to obtain" — the requirements to evolve INTO the shown Digimon. */
export function ConditionCard({ condition }: ConditionCardProps) {
  const select = useStore((s) => s.select);

  return (
    <div className={styles.card}>
      <div className={`label ${styles.title}`}>How to obtain</div>
      <div className={styles.pills}>
        <Chip>Rank ≥ {condition.agentRank.value}</Chip>
        {Object.entries(condition.stats ?? {}).map(([stat, threshold]) => (
          <Chip key={stat}>
            {stat} ≥ {threshold!.value}
          </Chip>
        ))}
        {condition.talent && <Chip>Talent ≥ {condition.talent.value}</Chip>}
        {condition.agentSkills?.map((skill) => (
          <Chip key={skill.category} color="var(--bond)" title="Agent Skills requirement">
            {skill.category} {skill.value}
          </Chip>
        ))}
        {condition.requiredItem && (
          <Chip color="var(--item)" title="Required item">
            ◆ {condition.requiredItem}
          </Chip>
        )}
      </div>
      {condition.jogressPartners && (
        <div className={styles.partners}>
          <div className={`label ${styles.partnerLabel}`}>Jogress with</div>
          {condition.jogressPartners.map((partner) => (
            <MonRow
              key={partner.slug}
              slug={partner.slug}
              name={partner.name}
              meta={partner.personality}
              borderColor="var(--jogress)"
              onClick={() => select(partner.slug)}
              title={`${partner.name} — must also be raised`}
            />
          ))}
        </div>
      )}
      <div className={styles.caption}>
        Requirements to evolve into this Digimon (from any pre-evolution).
      </div>
    </div>
  );
}
