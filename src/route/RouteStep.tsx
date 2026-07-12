import { appData } from '../data/appData';
import type { RouteStep } from '../data/route';
import { useStore } from '../state/store';
import { THEME } from '../theme/attribute';
import { Chip } from '../ui/Chip';
import { MonRow } from '../ui/MonRow';
import styles from './RouteStep.module.css';

interface RouteStepCardProps {
  step: RouteStep;
  index: number;
  active: boolean;
  onHover: (hovering: boolean) => void;
}

export function RouteStepCard({ step, index, active, onHover }: RouteStepCardProps) {
  const select = useStore((s) => s.select);
  const db = appData().db;
  const from = db.digimon[step.from];
  const to = db.digimon[step.to];
  const isEvolve = step.kind === 'digivolve';
  const requirement = step.requirement;

  return (
    <div
      className={`${styles.card} ${active ? styles.active : ''} ${isEvolve ? styles.evolve : styles.devolve}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className={`label ${styles.kind}`}>
        {index + 1}. {isEvolve ? '▲ Digivolve' : '▼ De-Digivolve'}
        {!isEvolve && <span className={styles.always}>always available</span>}
      </div>
      <div className={styles.pair}>
        <MonRow inline slug={step.from} name={from.name} size={30} onClick={() => select(step.from)} />
        <span className={styles.arrow}>→</span>
        <MonRow inline slug={step.to} name={to.name} size={30} onClick={() => select(step.to)} />
      </div>
      {isEvolve && requirement && (
        <div className={styles.pills}>
          <Chip>Rank ≥ {requirement.agentRank}</Chip>
          {Object.entries(requirement.stats).map(([stat, value]) => (
            <Chip key={stat}>
              {stat} ≥ {value}
            </Chip>
          ))}
          {requirement.talent !== undefined && <Chip>Talent ≥ {requirement.talent}</Chip>}
          {requirement.item && (
            <Chip color={THEME.item}>◆ {requirement.item}</Chip>
          )}
          {requirement.partners?.map((partner) => (
            <Chip
              key={partner.slug}
              color={THEME.jogress}
              title="Must also be raised — not part of this route"
              onClick={() => select(partner.slug)}
            >
              ⧉ {partner.name} ({partner.personality})
            </Chip>
          ))}
          {requirement.agentSkills?.map((skill) => (
            <Chip key={skill.category} color={THEME.bond}>
              ❖ {skill.category} {skill.value}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
