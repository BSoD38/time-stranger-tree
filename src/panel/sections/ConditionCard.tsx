import { iconUrl } from '../../data/load';
import type { EvolutionCondition } from '../../data/schema';
import { useStore } from '../../state/store';
import { Chip } from '../../ui/Chip';
import { THEME } from '../../theme/attribute';
import styles from './ConditionCard.module.css';

interface ConditionCardProps {
  condition: EvolutionCondition;
}

/** "How to obtain" — the requirements to evolve INTO the shown Digimon. */
export function ConditionCard({ condition }: ConditionCardProps) {
  const select = useStore((s) => s.select);

  return (
    <div className={styles.card}>
      <div className={styles.title}>How to obtain</div>
      <div className={styles.pills}>
        <Chip>Rank ≥ {condition.agentRank.value}</Chip>
        {Object.entries(condition.stats ?? {}).map(([stat, threshold]) => (
          <Chip key={stat}>
            {stat} ≥ {threshold!.value}
          </Chip>
        ))}
        {condition.talent && <Chip>Talent ≥ {condition.talent.value}</Chip>}
        {condition.agentSkills?.map((skill) => (
          <Chip key={skill.category} color={THEME.bond} title="Agent Skills requirement">
            {skill.category} {skill.value}
          </Chip>
        ))}
        {condition.requiredItem && (
          <Chip color={THEME.item} title="Required item">
            ◆ {condition.requiredItem}
          </Chip>
        )}
      </div>
      {condition.jogressPartners && (
        <div className={styles.partners}>
          <div className={styles.partnerLabel}>Jogress with</div>
          {condition.jogressPartners.map((partner) => (
            <button
              key={partner.slug}
              className={styles.partner}
              onClick={() => select(partner.slug)}
              title={`${partner.name} — must also be raised`}
            >
              <img src={iconUrl(partner.slug)} alt="" width={28} height={28} loading="lazy" />
              <span>{partner.name}</span>
              <span className={styles.personality}>{partner.personality}</span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.caption}>
        Requirements to evolve into this Digimon (from any pre-evolution).
      </div>
    </div>
  );
}
