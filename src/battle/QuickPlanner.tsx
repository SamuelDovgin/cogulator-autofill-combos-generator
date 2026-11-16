import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PlannerToggle } from '../components/PlannerToggle';
import { RoundActions } from './BattleResults';
import {
  boilerHealth,
  makeCog,
  reliableClear,
  strategyOptions,
  type BattleState,
  type BoilerPhase,
  type BoilerState,
  type OfficeTier,
  type Strategy,
} from './model';
import type { QuickRequest, QuickResponse } from './quickWorker';
import type { QuickPlan, QuickPlans } from './solveQuickBattle';
import './battle.css';

const AdvancedPlanner = lazy(() =>
  import('./BattlePlanner').then(({ BattlePlanner }) => ({
    default: BattlePlanner,
  })),
);
const levels = Array.from({ length: 20 }, (_, index) => index + 1);
const slotIndexes = [0, 1, 2, 3] as const;
const emptyLineup = () => slotIndexes.map<number | null>(() => null);
const defaultBoiler: BoilerState = {
  tier: 2,
  hp: boilerHealth[2],
  phase: 'Neutral',
  turns: 2,
};
const phases: BoilerPhase[] = ['Neutral', 'Fired Up', 'Defensive', 'Meltdown'];
type Board = Omit<BattleState, 'toons'>;

interface Recovery {
  before: Lineup;
  original: (number | null)[];
  survivors: number[];
  hp: Partial<Record<number, number>>;
}

interface Lineup {
  slots: (number | null)[];
  previous?: (number | null)[];
  boiler?: BoilerState;
  recovery?: Recovery;
}

function useQuickPlan(
  board: Board,
  strategy: Strategy,
  allowLevel7: boolean,
  visible: boolean,
) {
  const request = useMemo(
    () => ({ board, strategy, allowLevel7 }),
    [board, strategy, allowLevel7],
  );
  const cacheKey = JSON.stringify(request);
  const ready = board.cogs.length > 0 || !!board.boiler?.hp;
  const cache = useRef(new Map<string, QuickPlans>());
  const sequence = useRef(0);
  const [response, setResponse] = useState<{
    key: string;
    plans?: QuickPlans;
    error?: boolean;
  }>();
  const [retry, setRetry] = useState(0);
  const key = `${cacheKey}:${retry}`;

  useEffect(() => {
    if (!visible || !ready) return;
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setResponse({ key, plans: cached });
      return;
    }

    const id = ++sequence.current;
    let worker: Worker;
    const fail = () => setResponse({ key, error: true });
    try {
      worker = new Worker(new URL('./quickWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      fail();
      return;
    }
    worker.onmessage = ({ data }: MessageEvent<QuickResponse>) => {
      if (data.id !== id || id !== sequence.current) return;
      if (cache.current.size >= 32) {
        const oldest = cache.current.keys().next().value;
        if (oldest !== undefined) cache.current.delete(oldest);
      }
      cache.current.set(cacheKey, data.plans);
      setResponse({ key, plans: data.plans });
      worker.terminate();
    };
    worker.onerror = () => {
      if (id === sequence.current) fail();
      worker.terminate();
    };
    worker.postMessage({ id, ...request } satisfies QuickRequest);
    return () => {
      sequence.current++;
      worker.terminate();
    };
  }, [cacheKey, key, ready, request, visible]);

  const current = response?.key === key;
  return {
    plans: current ? response?.plans : undefined,
    previousPlan: current ? undefined : response?.plans?.recommended,
    error: current && response?.error,
    pending: ready && (!current || (!response?.plans && !response?.error)),
    retry: () => {
      setResponse(undefined);
      setRetry((attempts) => attempts + 1);
    },
  };
}

function percent(value: number) {
  if (value > 0.999 && value < 1) return '>99.9%';
  if (value > 0 && value < 0.001) return '<0.1%';
  return `${Number((value * 100).toFixed(1))}%`;
}

function QuickPlanCard({
  plan,
  recovery,
}: {
  plan: QuickPlan;
  recovery?: Recovery;
}) {
  const count = plan.round.before.cogs.length;
  return (
    <div className="quick-card-body">
      <RoundActions round={plan.round} useSlotId />
      <div className="quick-metrics">
        {plan.clearChance !== null && (
          <strong>{percent(plan.clearChance)} estimated Cog clear</strong>
        )}
        {!!count && (
          <span>
            {Number(plan.expectedKOs.toFixed(2))} / {count} expected KOs
          </span>
        )}
        {plan.round.before.boiler && (
          <span>
            {Math.round(plan.expectedBossDamage)} expected Boiler damage
          </span>
        )}
        <span>
          {plan.level6} Lv. 6{plan.level7 > 0 && ` · ${plan.level7} Lv. 7`}
        </span>
      </div>
      {count > 0 && (
        <details className="quick-breakdown">
          <summary>Individual Cog odds and damage</summary>
          <ul>
            {plan.round.before.cogs.map((cog, index) => (
              <li key={cog.id}>
                Cog {cog.id} · Lv. {cog.level} ·{' '}
                {percent(plan.koChances[index])} estimated KO
                {recovery &&
                  recovery.hp[cog.id - 1] === undefined &&
                  recovery.original[cog.id - 1] !== null &&
                  ' at full HP'}{' '}
                · {Math.round(plan.expectedDamage[index])} expected damage
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function QuickPlanner({ visible }: { visible: boolean }) {
  const [{ lineup, undoLineup }, setHistory] = useState<{
    lineup: Lineup;
    undoLineup?: Lineup;
  }>({ lineup: { slots: emptyLineup() } });
  const [selected, setSelected] = useState<number>();
  const [fill, setFill] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>('balanced');
  const [allowLevel7, setAllowLevel7] = useState(false);
  const [advancedBoard, setAdvancedBoard] = useState<Board>();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const { slots, previous, boiler, recovery } = lineup;

  const board: Board = useMemo(
    () => ({
      boiler,
      cogs: slots.flatMap((level, index) => {
        if (level === null || (recovery && !recovery.survivors.includes(index)))
          return [];
        const cog = makeCog(index + 1, level);
        return [{ ...cog, hp: recovery?.hp[index] ?? cog.hp }];
      }),
    }),
    [slots, boiler, recovery],
  );
  const { plans, previousPlan, pending, error, retry } = useQuickPlan(
    board,
    strategy,
    allowLevel7,
    visible,
  );
  const unknownHP =
    recovery &&
    board.cogs.some(
      ({ id }) =>
        recovery.original[id - 1] !== null && recovery.hp[id - 1] === undefined,
    );
  const active = (index: number) =>
    slots[index] !== null && (!recovery || recovery.survivors.includes(index));
  const filled = slotIndexes.every(active);

  useEffect(() => {
    if (visible) heading.current?.focus({ preventScroll: true });
  }, [visible]);

  function save(next: Lineup | ((current: Lineup) => Lineup)) {
    setHistory((history) => {
      const nextLineup =
        typeof next === 'function' ? next(history.lineup) : next;
      return nextLineup === history.lineup
        ? history
        : { lineup: nextLineup, undoLineup: history.lineup };
    });
  }

  function undo() {
    setHistory((history) =>
      history.undoLineup ? { lineup: history.undoLineup } : history,
    );
    setSelected(undefined);
    setFill(false);
  }

  function editLevel(level: number) {
    if (fill) {
      save({
        ...lineup,
        slots: Array<number>(4).fill(level),
        recovery: undefined,
      });
      setFill(false);
      return;
    }
    save((current) => {
      const { slots, recovery } = current;
      const index =
        selected ??
        slots.findIndex(
          (level, i) =>
            level === null || (recovery && !recovery.survivors.includes(i)),
        );
      if (index < 0) return current;
      const next = [...slots];
      next[index] = level;
      const nextRecovery = recovery && {
        ...recovery,
        original: recovery.original.map((original, i) =>
          i === index ? null : original,
        ),
        survivors: [...new Set([...recovery.survivors, index])],
        hp: { ...recovery.hp, [index]: undefined },
      };
      return { ...current, slots: next, recovery: nextRecovery };
    });
    setSelected(undefined);
  }

  function removeCog(index: number) {
    save({
      ...lineup,
      slots: slots.map((level, i) => (i === index ? null : level)),
      recovery: recovery && {
        ...recovery,
        survivors: recovery.survivors.filter((i) => i !== index),
        hp: { ...recovery.hp, [index]: undefined },
      },
    });
    setSelected(undefined);
  }

  function observe(survivors: number[]) {
    const original = recovery?.original ?? slots;
    setSelected(undefined);
    setFill(false);
    save({
      ...lineup,
      recovery: {
        before: recovery?.before ?? lineup,
        original,
        survivors,
        hp: recovery?.hp ?? {},
      },
    });
  }

  function nextWave() {
    save({
      slots: emptyLineup(),
      previous: slots.some((level) => level !== null) ? slots : previous,
      boiler,
    });
    setSelected(undefined);
    setFill(false);
  }

  function updateBoiler(patch: Partial<BoilerState>) {
    if (boiler) save({ ...lineup, boiler: { ...boiler, ...patch } });
  }

  return (
    <main
      className="battle-page quick-page"
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(
            'input, select, textarea, [contenteditable], .quick-advanced',
          )
        )
          return;
        if (event.key === 'Escape') {
          setSelected(undefined);
          setFill(false);
        }
        if (event.key === 'Backspace' && undoLineup) {
          event.preventDefault();
          undo();
        }
      }}
    >
      <div className="battle-wrap">
        <header className="quick-header">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              Battle Planner
            </h1>
            <p>Experimental · Four-Toon lineup</p>
          </div>
          <PlannerToggle active />
        </header>

        <div className="battle-layout quick-layout">
          <section
            className="battle-setup quick-setup"
            aria-labelledby="quick-lineup-title"
          >
            <h2 id="quick-lineup-title">Cog lineup</h2>
            <fieldset className="battle-encounter" aria-label="Encounter type">
              <button
                type="button"
                aria-pressed={!boiler}
                onClick={() => boiler && save({ ...lineup, boiler: undefined })}
              >
                Cog Wave
              </button>
              <button
                type="button"
                aria-pressed={!!boiler}
                onClick={() =>
                  !boiler && save({ ...lineup, boiler: { ...defaultBoiler } })
                }
              >
                Boiler Active
              </button>
            </fieldset>

            <div className="quick-slots">
              {slotIndexes.map((index) => {
                const level = slots[index];
                return (
                  <div className="quick-slot" key={index}>
                    <button
                      type="button"
                      aria-label={`Cog ${index + 1}: ${level === null ? 'empty' : `level ${level}`}${level !== null && !active(index) ? ', out' : ''}`}
                      aria-pressed={selected === index}
                      onClick={() => {
                        setFill(false);
                        setSelected(selected === index ? undefined : index);
                      }}
                    >
                      <span>Cog {index + 1}</span>
                      <strong>
                        {level === null
                          ? '—'
                          : active(index)
                            ? `Lv. ${level}`
                            : 'Out'}
                      </strong>
                    </button>
                    {active(index) && (
                      <button
                        className="quick-remove"
                        type="button"
                        aria-label={`Remove Cog ${index + 1}`}
                        onClick={() => removeCog(index)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="quick-palette-label">
              <span>
                {fill
                  ? 'Choose one level for all four Cogs'
                  : selected !== undefined
                    ? `Choose a level for Cog ${selected + 1}`
                    : filled
                      ? 'Select a Cog to replace its level'
                      : 'Tap a Cog level'}
              </span>
              <button
                type="button"
                className="quick-button"
                aria-pressed={fill}
                onClick={() => {
                  setFill(!fill);
                  setSelected(undefined);
                }}
              >
                Fill ×4
              </button>
            </div>
            <fieldset className="quick-palette" aria-label="Cog levels">
              {levels.map((level) => (
                <button
                  type="button"
                  key={level}
                  aria-label={`Level ${level}`}
                  data-common={level >= 8 && level <= 15}
                  disabled={!fill && selected === undefined && filled}
                  onClick={() => editLevel(level)}
                >
                  {level}
                </button>
              ))}
            </fieldset>
            <div className="quick-toolbar">
              <button
                type="button"
                className="quick-button"
                disabled={!undoLineup}
                onClick={undo}
              >
                Undo
              </button>
              <button
                type="button"
                className="quick-button"
                disabled={!previous}
                onClick={() => {
                  if (previous)
                    save({
                      ...lineup,
                      slots: [...previous],
                      recovery: undefined,
                    });
                  setSelected(undefined);
                  setFill(false);
                }}
              >
                Repeat
              </button>
              <button
                type="button"
                className="quick-button quick-next"
                onClick={nextWave}
              >
                Next Wave →
              </button>
            </div>

            {boiler && (
              <div className="quick-boiler">
                <div className="battle-fields quick-boiler-fields">
                  <label>
                    <span>Office tier</span>
                    <select
                      value={boiler.tier}
                      onChange={(event) => {
                        const tier = Number(event.target.value) as OfficeTier;
                        updateBoiler({
                          tier,
                          hp: boilerHealth[tier],
                          phase:
                            tier !== 4 && boiler.phase === 'Meltdown'
                              ? 'Neutral'
                              : boiler.phase,
                        });
                      }}
                    >
                      {[1, 2, 3, 4].map((tier) => (
                        <option key={tier} value={tier}>
                          {tier} star
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Boiler phase</span>
                    <select
                      value={boiler.phase}
                      onChange={(event) =>
                        updateBoiler({
                          phase: event.target.value as BoilerPhase,
                        })
                      }
                    >
                      {phases
                        .filter(
                          (phase) => phase !== 'Meltdown' || boiler.tier === 4,
                        )
                        .map((phase) => (
                          <option key={phase}>{phase}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span>Boiler HP left</span>
                    <input
                      type="number"
                      min={1}
                      max={boilerHealth[boiler.tier]}
                      value={boiler.hp}
                      onChange={(event) => {
                        const hp = event.target.valueAsNumber;
                        if (Number.isFinite(hp))
                          updateBoiler({
                            hp: Math.max(
                              1,
                              Math.min(
                                boilerHealth[boiler.tier],
                                Math.floor(hp),
                              ),
                            ),
                          });
                      }}
                    />
                  </label>
                </div>
                {boiler.phase === 'Defensive' && (
                  <p className="quick-warning">
                    Defensive phase. A hit that leaves the Boiler alive can
                    trigger retaliation. Sound can hit the Boiler too.
                  </p>
                )}
                {recovery && (
                  <p className="quick-note">
                    Check the current Boiler phase and HP before using the
                    recovery plan.
                  </p>
                )}
              </div>
            )}

            <div className="quick-settings">
              <label>
                <span>Strategy</span>
                <select
                  value={strategy}
                  onChange={(event) =>
                    setStrategy(event.target.value as Strategy)
                  }
                >
                  {strategyOptions.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="quick-check">
                <input
                  type="checkbox"
                  checked={allowLevel7}
                  onChange={(event) => setAllowLevel7(event.target.checked)}
                />{' '}
                Allow Lv. 7
              </label>
            </div>
          </section>

          <section
            className="battle-results quick-results"
            aria-labelledby="quick-result-title"
          >
            <div className="battle-results-header">
              <h2 id="quick-result-title">
                {recovery ? 'Recovery · next turn' : 'This turn'}
              </h2>
              {recovery && (
                <button
                  type="button"
                  className="quick-button"
                  onClick={() => {
                    save(recovery.before);
                    setSelected(undefined);
                  }}
                >
                  Undo recovery
                </button>
              )}
            </div>
            <div
              className="quick-summary"
              aria-live="polite"
              aria-busy={pending}
            >
              {unknownHP && (
                <p className="quick-note">
                  Survivor HP unknown · planning at full HP
                </p>
              )}
              {error ? (
                <div className="quick-empty">
                  The planner could not calculate this lineup.{' '}
                  <button
                    className="quick-button"
                    type="button"
                    onClick={retry}
                  >
                    Retry
                  </button>
                </div>
              ) : pending ? (
                <div className="quick-empty">
                  <p>Calculating current lineup…</p>
                  {previousPlan && (
                    <div className="quick-stale">
                      <p>Previous lineup · outdated</p>
                      <RoundActions round={previousPlan.round} useSlotId />
                    </div>
                  )}
                </div>
              ) : plans ? (
                <>
                  <div className="quick-recommendation">
                    <h3>
                      {plans.recommended.clearChance === 0
                        ? 'Best setup'
                        : 'Recommended'}
                    </h3>
                    {plans.recommended.clearChance !== null &&
                      plans.recommended.clearChance > 0 &&
                      plans.recommended.clearChance < reliableClear && (
                        <p className="quick-note">Below the 80% clear target</p>
                      )}
                    <QuickPlanCard
                      plan={plans.recommended}
                      recovery={recovery}
                    />
                  </div>
                  {plans.conserve && (
                    <details className="quick-alternative">
                      <summary>
                        Save Gags{' '}
                        <span>
                          {plans.conserve.level6} Lv. 6 ·{' '}
                          {plans.conserve.level7} Lv. 7
                        </span>
                      </summary>
                      <QuickPlanCard
                        plan={plans.conserve}
                        recovery={recovery}
                      />
                    </details>
                  )}
                  {plans.reliable && (
                    <details className="quick-alternative">
                      <summary>
                        Higher Reliability{' '}
                        <span>
                          {percent(plans.reliable.clearChance ?? 0)} clear
                        </span>
                      </summary>
                      <QuickPlanCard
                        plan={plans.reliable}
                        recovery={recovery}
                      />
                    </details>
                  )}
                </>
              ) : (
                <p className="quick-empty">
                  {recovery
                    ? 'Cog wave cleared.'
                    : 'Tap a level to get the first recommendation.'}
                </p>
              )}
            </div>

            {(recovery || (plans && board.cogs.length > 0)) && (
              <div className="quick-recovery">
                <p>
                  {recovery
                    ? 'Observed survivors'
                    : 'After the turn, tap a surviving Cog'}
                </p>
                <div className="quick-toolbar">
                  {slotIndexes.map(
                    (index) =>
                      slots[index] !== null && (
                        <button
                          className="quick-button"
                          type="button"
                          key={index}
                          aria-label={`Cog ${index + 1} survived`}
                          aria-pressed={
                            recovery
                              ? recovery.survivors.includes(index)
                              : undefined
                          }
                          onClick={() => {
                            const survivors = recovery?.survivors ?? [];
                            observe(
                              survivors.includes(index)
                                ? survivors.filter((i) => i !== index)
                                : [...survivors, index],
                            );
                          }}
                        >
                          Cog {index + 1}
                        </button>
                      ),
                  )}
                  <button
                    className="quick-button"
                    type="button"
                    onClick={() =>
                      observe(
                        slots.flatMap((level, index) =>
                          level === null ? [] : [index],
                        ),
                      )
                    }
                  >
                    All survived
                  </button>
                  <button
                    className="quick-button"
                    type="button"
                    onClick={() => observe([])}
                  >
                    All Cogs cleared
                  </button>
                </div>
                {recovery && board.cogs.length > 0 && (
                  <details className="quick-breakdown">
                    <summary>Enter observed HP</summary>
                    <div className="battle-fields">
                      {board.cogs.map(({ id, level }) => {
                        const max = makeCog(id, level).hp;
                        return (
                          <label key={id}>
                            <span>Cog {id} HP</span>
                            <input
                              type="number"
                              min={1}
                              max={max}
                              placeholder={`Full: ${max}`}
                              value={recovery.hp[id - 1] ?? ''}
                              onChange={(event) => {
                                const value = event.target.valueAsNumber;
                                const hp = Number.isFinite(value)
                                  ? Math.max(
                                      1,
                                      Math.min(max, Math.floor(value)),
                                    )
                                  : undefined;
                                save({
                                  ...lineup,
                                  recovery: {
                                    ...recovery,
                                    hp: { ...recovery.hp, [id - 1]: hp },
                                  },
                                });
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            )}
            <details className="quick-breakdown quick-assumptions">
              <summary>Assumptions and limits</summary>
              <p>
                Four maxed Toons, all tracks, non-organic gags, enough for the
                current turn. The search compares a limited set of lineups. Odds
                use shared rolls and the calculator’s 95% cap model. The live
                game uses a soft cap.
              </p>
            </details>
          </section>
        </div>

        <details
          className="quick-advanced"
          onToggle={(event) => {
            setAdvancedOpen(event.currentTarget.open);
            if (event.currentTarget.open && !advancedBoard)
              setAdvancedBoard(board);
          }}
        >
          <summary>
            Advanced · Multi-round planning, status, and inventory
          </summary>
          {advancedBoard && (
            <Suspense fallback={<output>Loading advanced planner…</output>}>
              <AdvancedPlanner
                initialBoard={advancedBoard}
                visible={visible && advancedOpen}
              />
            </Suspense>
          )}
        </details>
      </div>
    </main>
  );
}
