import { useEffect, useRef, useState } from 'react';
import mark from '../../assets/logo/finalCogIcon-square.png';
import { BattleResults } from './BattleResults';
import { BoilerInput, CogInput, ToonInventory } from './BattleSetup';
import {
  boilerHealth,
  makeCog,
  makeToon,
  strategyOptions,
  type BattlePlan,
  type BattleState,
  type BoilerState,
  type Strategy,
} from './model';
import './battle.css';

const defaultBoiler: BoilerState = {
  tier: 2,
  hp: boilerHealth[2],
  phase: 'Neutral',
  turns: 2,
};
export function BattlePlanner({
  visible,
  initialBoard,
}: {
  visible: boolean;
  initialBoard: Omit<BattleState, 'toons'>;
}) {
  const [state, setState] = useState<BattleState>(() => ({
    ...initialBoard,
    toons: Array.from({ length: 4 }, makeToon),
  }));
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [plan, setPlan] = useState<BattlePlan | null>(null);
  const [request, setRequest] = useState<{
    state: BattleState;
    strategy: Strategy;
  } | null>(() =>
    state.cogs.length || state.boiler ? { state, strategy: 'balanced' } : null,
  );
  const [loading, setLoading] = useState(!!request);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [saved, setSaved] = useState<{
    state: BattleState;
    strategy: Strategy;
    inactiveToons: BattleState['toons'];
  }>();
  const [inactiveToons, setInactiveToons] = useState<BattleState['toons']>([]);
  const setupHeading = useRef<HTMLHeadingElement>(null);
  const nextCogId = useRef(Math.max(0, ...state.cogs.map(({ id }) => id)) + 1);

  useEffect(() => {
    if (!request || !visible) return;
    let worker: Worker;
    try {
      worker = new Worker(new URL('./battleWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      setError(
        'The browser could not start the planner. Reload and try again.',
      );
      setLoading(false);
      return;
    }
    worker.onmessage = ({ data }: MessageEvent<BattlePlan>) => {
      setPlan(data);
      setLoading(false);
      worker.terminate();
    };
    worker.onerror = () => {
      setError(
        'The planner encountered an error. Try building the plan again.',
      );
      setLoading(false);
      worker.terminate();
    };
    worker.postMessage(request);
    return () => worker.terminate();
  }, [request, visible]);

  function edit(next: BattleState) {
    setState(next);
    setRequest(null);
    setLoading(false);
    setError('');
    setDirty(true);
  }

  function build() {
    setPlan(null);
    setError('');
    setDirty(false);
    setSaved(undefined);
    setExpanded(0);
    setLoading(true);
    setRequest({ state, strategy });
    if (window.matchMedia('(max-width: 750px)').matches) {
      document
        .getElementById('battle-plan-title')
        ?.scrollIntoView({ block: 'start' });
    }
  }

  function record() {
    const next = plan?.rounds[0]?.after;
    if (!next) return;
    setSaved({ state, strategy, inactiveToons });
    edit(next);
    setRoundNumber(roundNumber + 1);
    setupHeading.current?.focus();
  }

  function undo() {
    if (!saved) return;
    setState(saved.state);
    setStrategy(saved.strategy);
    setInactiveToons(saved.inactiveToons);
    setRoundNumber(roundNumber - 1);
    setDirty(false);
    setSaved(undefined);
  }

  function changeToons(count: number) {
    const all = [...state.toons, ...inactiveToons];
    while (all.length < count) all.push(makeToon());
    setInactiveToons(all.slice(count));
    edit({ ...state, toons: all.slice(0, count) });
  }

  function changeCogCount(count: number) {
    const cogs = [...state.cogs];
    while (cogs.length < count) cogs.push(makeCog(nextCogId.current++));
    edit({ ...state, cogs: cogs.slice(0, count) });
  }

  return (
    <section
      className="battle-advanced-page"
      aria-label="Advanced Battle Planner"
      hidden={!visible}
    >
      <div className="battle-wrap">
        <header className="battle-hero">
          <div>
            <h2>Multi-round planner</h2>
            <p>
              Enter the lineup. Get a round-by-round gag plan for your team.
            </p>
          </div>
          <img className="battle-hero-mark" src={mark} alt="" />
        </header>

        <div className="battle-layout">
          <section
            className="battle-setup"
            aria-labelledby="battle-setup-title"
          >
            <div className="battle-setup-header">
              <h2 id="battle-setup-title" ref={setupHeading} tabIndex={-1}>
                Battle setup
              </h2>
              <span>Round {roundNumber}</span>
            </div>
            <fieldset className="battle-encounter" aria-label="Encounter type">
              <button
                type="button"
                aria-pressed={!state.boiler}
                onClick={() =>
                  state.boiler && edit({ ...state, boiler: undefined })
                }
              >
                Cog battle
              </button>
              <button
                type="button"
                aria-pressed={!!state.boiler}
                onClick={() =>
                  !state.boiler &&
                  edit({ ...state, boiler: { ...defaultBoiler } })
                }
              >
                Boiler battle
              </button>
            </fieldset>

            <div className="battle-fields battle-setup-fields">
              <label>
                <span>Toons</span>
                <select
                  aria-label="Toons"
                  value={state.toons.length}
                  onChange={(event) => changeToons(Number(event.target.value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Cogs in battle</span>
                <select
                  aria-label="Cogs in battle"
                  value={state.cogs.length}
                  onChange={(event) =>
                    changeCogCount(Number(event.target.value))
                  }
                >
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            {state.boiler && (
              <BoilerInput
                boiler={state.boiler}
                update={(patch) =>
                  state.boiler &&
                  edit({ ...state, boiler: { ...state.boiler, ...patch } })
                }
              />
            )}
            <div className="battle-cog-list">
              {state.cogs.map((cog, index) => (
                <CogInput
                  key={cog.id}
                  cog={cog}
                  index={index}
                  update={(patch) =>
                    edit({
                      ...state,
                      cogs: state.cogs.map((other) =>
                        other.id === cog.id ? { ...other, ...patch } : other,
                      ),
                    })
                  }
                  remove={() =>
                    edit({
                      ...state,
                      cogs: state.cogs.filter((other) => other.id !== cog.id),
                    })
                  }
                />
              ))}
            </div>
            <div className="battle-strategy">
              <label>
                <span>Strategy</span>
                <select
                  aria-label="Strategy"
                  value={strategy}
                  onChange={(event) => {
                    setStrategy(event.target.value as Strategy);
                    edit(state);
                  }}
                >
                  {strategyOptions.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <p>{strategyOptions.find(({ id }) => id === strategy)?.detail}</p>
            </div>

            <ToonInventory
              toons={state.toons}
              blockedTracks={state.blockedTracks ?? []}
              onTrackToggle={(track) => {
                const blocked = state.blockedTracks ?? [];
                edit({
                  ...state,
                  blockedTracks: blocked.includes(track)
                    ? blocked.filter((entry) => entry !== track)
                    : [...blocked, track],
                });
              }}
              update={(toon, patch) =>
                edit({
                  ...state,
                  toons: state.toons.map((entry, index) =>
                    index === toon ? { ...entry, ...patch } : entry,
                  ),
                })
              }
            />
            <button
              type="button"
              className="battle-build-button"
              disabled={loading}
              onClick={build}
            >
              {loading
                ? 'Planning…'
                : saved
                  ? 'Replan from here'
                  : 'Build plan'}{' '}
              <span aria-hidden="true">→</span>
            </button>
          </section>

          <BattleResults
            plan={plan}
            loading={loading}
            dirty={dirty}
            error={error}
            roundNumber={roundNumber}
            review={!!saved}
            expanded={expanded}
            setExpanded={setExpanded}
            record={record}
            undo={undo}
          />
        </div>

        <details className="battle-model-note">
          <summary>How the planner works</summary>
          <p>
            It searches up to 12 rounds from the visible lineup. Gags use maxed
            damage and track experience. Accuracy estimates retain the
            calculator’s 95% cap. The live game’s soft-cap formula is
            unpublished. Each planned action is charged to its Toon’s inventory.
          </p>
          <p>
            Boiler phases and entered Gag Ordinance advance automatically.
            Projections cover the current lineup and assume selected gags keep
            their targets. Enemy attacks, new arrivals, promotions, Pay Raise
            and Retention Plan are outside the forecast. After each real turn,
            record the result and update the lineup, Laff and statuses before
            replanning.
          </p>
          <p>
            <a
              href="https://www.toontownrewritten.com/taskforce/battles"
              target="_blank"
              rel="noreferrer"
            >
              Field Office mechanics
            </a>{' '}
            ·{' '}
            <a
              href="https://www.toontownrewritten.com/news/release-notes/all"
              target="_blank"
              rel="noreferrer"
            >
              Live release notes
            </a>
          </p>
        </details>
      </div>
    </section>
  );
}
