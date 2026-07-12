import { useEffect, useState } from 'react';
import { appData } from '../data/appData';
import { iconUrl } from '../data/load';
import { useStore } from '../state/store';
import { ATTRIBUTE_COLORS } from '../theme/attribute';
import { Chip } from '../ui/Chip';
import { Collapse } from '../ui/Collapse';
import { ConditionCard } from './sections/ConditionCard';
import { DialogueBlock } from './sections/DialogueBlock';
import { EvolutionLinks } from './sections/EvolutionLinks';
import { PersonalityTable } from './sections/PersonalityTable';
import { ResistanceGrid } from './sections/ResistanceGrid';
import { SkillList } from './sections/SkillList';
import { StatBars } from './sections/StatBars';
import styles from './DetailPanel.module.css';

export function DetailPanel({ slug }: { slug: string }) {
  const select = useStore((s) => s.select);
  const setFocus = useStore((s) => s.setFocus);
  const openRoute = useStore((s) => s.openRoute);
  const focus = useStore((s) => s.focus);
  const digimon = appData().db.digimon[slug];
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => setDescExpanded(false), [slug]);

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <img
          className={styles.icon}
          src={iconUrl(slug)}
          alt={digimon.name}
          width={64}
          height={64}
          style={{ borderColor: ATTRIBUTE_COLORS[digimon.attribute] }}
        />
        <div className={styles.titleBlock}>
          <div className={styles.nameRow}>
            <h2 className={styles.name}>{digimon.name}</h2>
            <span className={styles.number}>#{String(digimon.number).padStart(3, '0')}</span>
          </div>
          <div className={styles.chips}>
            <Chip>{digimon.generation}</Chip>
            <Chip color={ATTRIBUTE_COLORS[digimon.attribute]}>{digimon.attribute}</Chip>
            <Chip>{digimon.type}</Chip>
            {digimon.ridable && <Chip title="Ridable">🐎 Ridable</Chip>}
          </div>
        </div>
        <button className={styles.close} onClick={() => select(null)} title="Close (Esc)">
          ✕
        </button>
      </header>

      <div className={styles.actions}>
        <button
          className={focus === slug ? styles.actionActive : styles.action}
          onClick={() => setFocus(focus === slug ? null : slug)}
          title="Isolate this Digimon's full lineage (F)"
        >
          ◈ {focus === slug ? 'Unfocus' : 'Focus lineage'}
        </button>
        <button className={styles.action} onClick={() => openRoute({ from: slug })}>
          Route from
        </button>
        <button className={styles.action} onClick={() => openRoute({ to: slug })}>
          Route to
        </button>
      </div>

      <div className={styles.scroll}>
        <p
          className={descExpanded ? styles.descFull : styles.desc}
          onClick={() => setDescExpanded(!descExpanded)}
          title={descExpanded ? undefined : 'Click to expand'}
        >
          {digimon.description}
        </p>

        <ConditionCard condition={digimon.evolutionCondition} />
        <EvolutionLinks digimon={digimon} />

        <Collapse id="stats" title="Stats" defaultOpen>
          <StatBars digimon={digimon} />
        </Collapse>
        <Collapse id="resistances" title="Resistances">
          <ResistanceGrid digimon={digimon} />
        </Collapse>
        <Collapse id="skills" title="Skills">
          <SkillList digimon={digimon} />
        </Collapse>
        <Collapse id="personalities" title="Conversion personalities">
          <PersonalityTable digimon={digimon} />
        </Collapse>
        {digimon.postEvolutionDialogue && (
          <Collapse id="dialogue" title="Post-evolution dialogue">
            <DialogueBlock lines={digimon.postEvolutionDialogue} name={digimon.name} />
          </Collapse>
        )}
        <div className={styles.traits}>
          Traits: {digimon.traits.join(', ') || '—'} · Base personality: {digimon.basePersonality}
        </div>
      </div>
    </aside>
  );
}
