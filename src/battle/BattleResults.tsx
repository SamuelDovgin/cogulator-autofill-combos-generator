import {
  activeRemote,
  battleGags,
  remoteName,
  trackName,
  type BattlePlan,
  type BattleRound,
  type BattleState,
} from './model';

function roundAdvice(round: BattleRound) {
  const tracks = round.actions.flatMap((action) =>
    action.kind === 'gag' ? [battleGags[action.gag].track] : [],
  );
  const boiler = round.before.boiler;
  if (boiler?.hp && !round.after.boiler?.hp && boiler.phase !== 'Defensive')
    return 'Defeating the Boiler ends the encounter.';
  if (boiler?.hp && boiler.phase === 'Defensive') {
    if (!round.after.boiler?.hp)
      return 'This turn has enough damage to finish the Boiler before it can retaliate.';
    if (round.actions.some((action) => action.kind === 'remote'))
      return 'Use remotes to control the Cogs through defense. Save boss damage for Fired Up.';
    return 'Keep damage off the Boiler during defense. If stocked, healing remotes can neutralize high-level Cogs while a damage remote chips the line.';
  }
  if (
    boiler?.hp &&
    (boiler.phase === 'Fired Up' || boiler.phase === 'Meltdown') &&
    boiler.hp > (round.after.boiler?.hp ?? 0)
  ) {
    return 'Fired Up boosts Boiler damage by 50%. Matching attack tracks adds a combo bonus.';
  }
  if (tracks.includes('Trap') && tracks.includes('Lure'))
    return 'Lure triggers the Trap for damage and helps any follow-up attack land.';
  if (tracks.includes('Lure'))
    return 'Lure holds surviving Cogs and gives the first Throw or Squirt attack knockback damage.';
  if (tracks.includes('Sound'))
    return 'Sound hits the whole line. Use the other slots to finish survivors or save stock.';
  if (
    tracks.includes('Drop') &&
    tracks.some((track) => track === 'Throw' || track === 'Squirt')
  )
    return 'Throw and Squirt land before Drop and can stun its target to improve accuracy.';
  if (round.healing)
    return 'Use spare actions to restore Laff while the team works through the lineup.';
  return '';
}

function targetName(
  state: BattleState,
  target?: number | 'boiler',
  useSlotId = false,
) {
  if (target === undefined) return 'All Cogs';
  if (target === 'boiler') return 'The Boiler';
  const index = state.cogs.findIndex(({ id }) => id === target);
  return index < 0
    ? 'Cog'
    : `Cog ${useSlotId ? target : index + 1} · Lv. ${state.cogs[index].level}`;
}

export function RoundActions({
  round,
  useSlotId,
}: {
  round: BattleRound;
  useSlotId?: boolean;
}) {
  const boss = round.before.boiler;
  return (
    <div className="battle-actions">
      {round.actions.map((action) => {
        const toon = round.before.toons[action.toon];
        const gag = action.kind === 'gag' ? battleGags[action.gag] : undefined;
        const remote =
          action.kind === 'remote' ? activeRemote(action.remote) : undefined;
        let target =
          action.kind === 'pass'
            ? 'Hold your gags'
            : targetName(round.before, action.target, useSlotId);
        if (gag?.track === 'Toonup' && action.kind === 'gag')
          target =
            action.target === undefined
              ? 'All other Toons'
              : `Toon ${Number(action.target) + 1}`;
        if (
          gag &&
          action.kind === 'gag' &&
          action.target === undefined &&
          boss?.hp &&
          ['Sound', 'Throw', 'Squirt'].includes(gag.track)
        )
          target = round.before.cogs.some((cog) => cog.hp)
            ? 'Cogs + Boiler'
            : 'The Boiler';
        return (
          <div className="battle-action" key={action.toon}>
            <span className="battle-action-toon">Toon {action.toon + 1}</span>
            <div className="battle-action-main">
              {gag ? (
                <img src={gag.image} alt="" />
              ) : (
                <span className="battle-action-symbol" aria-hidden="true">
                  {remote ? '◈' : '–'}
                </span>
              )}
              <div>
                <strong>
                  {action.kind === 'remote'
                    ? remoteName(action.remote)
                    : (gag?.name ?? 'Pass')}
                </strong>
                <span>
                  {gag && toon.organic === gag.track
                    ? `Organic ${trackName(gag.track)} · `
                    : ''}
                  {target}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoundCard({
  round,
  number,
  expanded,
  toggle,
}: {
  round: BattleRound;
  number: number;
  expanded: boolean;
  toggle: () => void;
}) {
  const advice = roundAdvice(round);
  const boss = round.before.boiler;
  const plannedHits = Math.round(round.accuracy * 1000) / 10;
  return (
    <article className={`battle-round${expanded ? ' battle-round-open' : ''}`}>
      <h3>
        <button
          type="button"
          className="battle-round-heading"
          aria-expanded={expanded}
          onClick={toggle}
        >
          <span className="battle-round-number">
            {String(number).padStart(2, '0')}
          </span>
          <span>
            <strong>Round {number}</strong>
            <small>{boss?.hp ? boss.phase : 'Cog battle'}</small>
          </span>
          <span className="battle-round-damage">
            {round.damage} dmg{round.healing > 0 && ` · +${round.healing} Laff`}
          </span>
          <span className="battle-round-arrow" aria-hidden="true">
            {expanded ? '−' : '+'}
          </span>
        </button>
      </h3>
      {expanded && (
        <div className="battle-round-body">
          <RoundActions round={round} />
          <div className="battle-projections">
            {round.after.cogs
              .filter((cog, index) => cog.hp || round.before.cogs[index].hp)
              .map((cog) => (
                <span
                  key={cog.id}
                  className={cog.hp ? '' : 'battle-projection-clear'}
                >
                  <strong>
                    {targetName(round.before, cog.id).split(' · ')[0]}
                  </strong>{' '}
                  {cog.hp
                    ? `${cog.hp} HP${cog.lure ? ' · Lured' : ''}${cog.remote ? ' · Remote' : ''}${round.before.cogs.find(({ id }) => id === cog.id)?.layers === 2 && cog.layers === 1 ? ' · Skelecog' : ''}`
                    : 'KO'}
                </span>
              ))}
            {boss?.hp && (
              <span
                className={
                  round.after.boiler?.hp ? '' : 'battle-projection-clear'
                }
              >
                <strong>Boiler</strong>{' '}
                {round.after.boiler?.hp
                  ? `${round.after.boiler.hp.toLocaleString()} HP`
                  : 'KO'}
              </span>
            )}
          </div>
          {advice && <p className="battle-round-advice">{advice}</p>}
          {plannedHits < 100 && (
            <div
              className="battle-round-odds"
              title="Estimate that the rolls used in this projection all land. The live game can exceed 95% per roll."
            >
              Estimated hit sequence <strong>{plannedHits}%</strong>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function BattleResults({
  plan,
  loading,
  dirty,
  error,
  roundNumber,
  review,
  expanded,
  setExpanded,
  record,
  undo,
}: {
  plan: BattlePlan | null;
  loading: boolean;
  dirty: boolean;
  error: string;
  roundNumber: number;
  review: boolean;
  expanded: number;
  setExpanded: (round: number) => void;
  record: () => void;
  undo: () => void;
}) {
  const rounds = plan?.rounds ?? [];
  const gagCount = rounds.reduce(
    (total, round) =>
      total + round.actions.filter((action) => action.kind === 'gag').length,
    0,
  );
  const remoteCount = rounds.reduce(
    (total, round) =>
      total + round.actions.filter((action) => action.kind === 'remote').length,
    0,
  );
  return (
    <section className="battle-results" aria-labelledby="battle-plan-title">
      <div className="battle-results-header">
        <div>
          <h2 id="battle-plan-title">Turn-by-turn plan</h2>
          <p>Projected outcomes if the planned gags land.</p>
        </div>
        {plan && !dirty && !loading && (
          <span
            className={`battle-plan-status${plan.cleared ? ' battle-plan-clear' : ''}`}
          >
            {plan.cleared ? 'Clear projected' : 'Partial plan'}
          </span>
        )}
      </div>
      {review ? (
        <div className="battle-empty">
          <h3>Record what happened</h3>
          <p>
            The setup now shows projected HP, status and spent stock. Update it
            with actual results, new Cogs, or any Boiler effects, then replan.
          </p>
          <button
            type="button"
            className="battle-secondary-button"
            onClick={undo}
          >
            Undo round
          </button>
        </div>
      ) : error || loading || dirty || !plan ? (
        <div className="battle-empty" aria-live="polite">
          <h3>
            {error
              ? 'Plan unavailable'
              : loading
                ? 'Comparing battle plans…'
                : 'Ready to plan'}
          </h3>
          <p>
            {error ||
              (loading
                ? 'Checking gag combinations, targets and follow-up rounds.'
                : 'Build a plan to apply the current battle setup.')}
          </p>
        </div>
      ) : rounds.length ? (
        <>
          <div className="battle-plan-stats">
            <div>
              <strong>{rounds.length}</strong>
              <span>{rounds.length === 1 ? 'Round' : 'Rounds'}</span>
            </div>
            <div>
              <strong>{gagCount}</strong>
              <span>Gags used</span>
            </div>
            <div>
              <strong>{remoteCount}</strong>
              <span>Remotes used</span>
            </div>
          </div>
          {!plan.cleared && (
            <p className="battle-partial">
              The search found progress but no full clear with this setup in 12
              rounds. Check stock or replan after the first round.
            </p>
          )}
          <div className="battle-timeline">
            {rounds.map((round, index) => {
              const number = roundNumber + index;
              return (
                <RoundCard
                  key={number}
                  round={round}
                  number={number}
                  expanded={expanded === index}
                  toggle={() => setExpanded(expanded === index ? -1 : index)}
                />
              );
            })}
          </div>
          <button
            className="battle-secondary-button battle-record-button"
            type="button"
            onClick={record}
          >
            Record round {roundNumber} outcome <span aria-hidden="true">→</span>
          </button>
        </>
      ) : (
        <div className="battle-empty" aria-live="polite">
          <h3>{plan.cleared ? 'Lineup cleared' : 'No playable plan found'}</h3>
          <p>
            {plan.cleared
              ? 'Add Cogs or edit the battle setup to plan another round.'
              : 'Check available gags, Toon count and Boiler phase. Add any remotes the team can use.'}
          </p>
        </div>
      )}
    </section>
  );
}
