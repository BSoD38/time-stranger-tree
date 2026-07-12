import { useState } from 'react';
import { appData } from '../data/appData';
import { thumbUrl } from '../data/load';
import { search } from '../data/search';
import { summarizeRoute } from '../data/summary';
import { useStore } from '../state/store';
import { exitRoute } from '../state/urlSync';
import { useSearchNav } from '../search/useSearchNav';
import { Chip } from '../ui/Chip';
import { MonRow } from '../ui/MonRow';
import { Panel, CloseButton } from '../ui/Panel';
import { THEME } from '../theme/attribute';
import { RouteStepCard } from './RouteStep';
import styles from './RoutePlanner.module.css';

const RANKS = [1, 3, 5, 7, 8, 9, 10];

function EndpointPicker({ which }: { which: 'from' | 'to' }) {
  const value = useStore((s) => s.route[which]);
  const selected = useStore((s) => s.selected);
  const setRouteEndpoint = useStore((s) => s.setRouteEndpoint);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const hits = open && query ? search(appData().searchIndex, query, 6) : [];
  const digimon = value ? appData().db.digimon[value] : null;

  const pick = (slug: string) => {
    setRouteEndpoint(which, slug);
    setQuery('');
    setOpen(false);
  };
  const { highlighted, setHighlighted, onKeyDown } = useSearchNav(hits, {
    onPick: (hit) => pick(hit.slug),
    onClose: () => setOpen(false),
  });

  return (
    <div className={styles.endpoint}>
      <span className={`label ${styles.endpointLabel}`}>{which === 'from' ? 'From' : 'To'}</span>
      {digimon ? (
        <button
          className={styles.endpointValue}
          onClick={() => setRouteEndpoint(which, null)}
          title="Clear"
        >
          <img src={thumbUrl(digimon.slug)} alt="" width={22} height={22} />
          {digimon.name} ✕
        </button>
      ) : (
        <div className={styles.endpointSearch}>
          <input
            value={query}
            placeholder="Search…"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlighted(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            spellCheck={false}
          />
          {selected && selected !== value && (
            <button
              className={styles.useSelected}
              onMouseDown={(e) => {
                e.preventDefault();
                setRouteEndpoint(which, selected);
              }}
            >
              use selected
            </button>
          )}
          {hits.length > 0 && (
            <div className={styles.endpointDropdown}>
              {hits.map((hit, i) => (
                <MonRow
                  key={hit.slug}
                  slug={hit.slug}
                  size={20}
                  active={i === highlighted}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(hit.slug);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RoutePlanner() {
  const route = useStore((s) => s.route);
  const setMaxAgentRank = useStore((s) => s.setMaxAgentRank);
  const setActiveRoute = useStore((s) => s.setActiveRoute);
  const setActiveStep = useStore((s) => s.setActiveStep);

  const routes = route.routes;
  const active = routes?.[route.active];
  const summary = active && active.steps.length ? summarizeRoute(active.steps) : null;

  return (
    <Panel>
      <header className={styles.header}>
        <h2>Route Planner</h2>
        <CloseButton onClick={exitRoute} title="Close (Esc)" />
      </header>

      <div className={styles.inputs}>
        <EndpointPicker which="from" />
        <EndpointPicker which="to" />
        <label className={styles.rank}>
          My agent rank
          <select
            value={route.maxAgentRank ?? ''}
            onChange={(e) => setMaxAgentRank(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">any</option>
            {RANKS.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.scroll}>
        {!route.from || !route.to ? (
          <p className={styles.empty}>Pick a start and a target Digimon.</p>
        ) : !routes || routes.length === 0 ? (
          <p className={styles.empty}>
            No route found{route.maxAgentRank ? ' at this agent rank' : ''}.
          </p>
        ) : (
          <>
            {routes.length > 1 && (
              <div className={styles.pager}>
                <button
                  disabled={route.active === 0}
                  onClick={() => setActiveRoute(route.active - 1)}
                >
                  ‹
                </button>
                <span>
                  Route {route.active + 1} / {routes.length}
                </span>
                <button
                  disabled={route.active === routes.length - 1}
                  onClick={() => setActiveRoute(route.active + 1)}
                >
                  ›
                </button>
              </div>
            )}

            {active && summary && (
              <div className={styles.summary}>
                <div className={styles.summaryCounts}>
                  {active.steps.length} steps · {summary.counts.digivolves}▲{' '}
                  {summary.counts.dedigivolves}▼
                </div>
                <div className={styles.summaryPills}>
                  <Chip>Rank ≥ {summary.maxAgentRank}</Chip>
                  {Object.entries(summary.maxStats).map(([stat, value]) => (
                    <Chip key={stat}>
                      {stat} ≥ {value}
                    </Chip>
                  ))}
                  {summary.maxTalent && <Chip>Talent ≥ {summary.maxTalent}</Chip>}
                  {summary.items.map((item) => (
                    <Chip key={item} color={THEME.item}>
                      ◆ {item}
                    </Chip>
                  ))}
                  {summary.partners.map((partner) => (
                    <Chip key={partner.slug} color={THEME.jogress}>
                      ⧉ {partner.name}
                    </Chip>
                  ))}
                  {summary.agentSkills.map((skill) => (
                    <Chip key={skill.category} color={THEME.bond}>
                      ❖ {skill.category} {skill.value}
                    </Chip>
                  ))}
                </div>
                <div className={styles.caption}>
                  Stat thresholds apply at each step, not all at once.
                </div>
              </div>
            )}

            {active?.steps.length === 0 && (
              <p className={styles.empty}>Already there — same Digimon.</p>
            )}
            {active?.steps.map((step, i) => (
              <RouteStepCard
                key={`${step.from}-${step.to}-${i}`}
                step={step}
                index={i}
                active={route.activeStep === i}
                onHover={(hovering) => setActiveStep(hovering ? i : null)}
              />
            ))}
          </>
        )}
      </div>
    </Panel>
  );
}
