import { appData } from '../data/appData';
import { iconUrl } from '../data/load';
import type { RouteStep } from '../data/route';
import { useStore } from '../state/store';
import { THEME } from '../theme/attribute';
import { Chip } from '../ui/Chip';
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
      <div className={styles.kind}>
        {index + 1}. {isEvolve ? '▲ Digivolve' : '▼ De-Digivolve'}
        {!isEvolve && <span className={styles.always}>always available</span>}
      </div>
      <div className={styles.pair}>
        <button className={styles.mon} onClick={() => select(step.from)}>
          <img src={iconUrl(step.from)} alt="" width={30} height={30} />
          {from.name}
        </button>
        <span className={styles.arrow}>→</span>
        <button className={styles.mon} onClick={() => select(step.to)}>
          <img src={iconUrl(step.to)} alt="" width={30} height={30} />
          {to.name}
        </button>
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
