import cogOne from '../../assets/cogs/cog1.webp';
import cogTwo from '../../assets/cogs/cog2.webp';
import cogThree from '../../assets/cogs/cog3.webp';
import cogFour from '../../assets/cogs/cog4.webp';
import { calculateCogHealth } from '../utils/calculatorUtils';
import type { GagTrack } from '../types';
import {
  activeRemote,
  battleGags,
  boilerHealth,
  remoteKeys,
  remoteName,
  remoteStats,
  trackGags,
  trackName,
  trackOrder,
  type BattleState,
  type BoilerPhase,
  type BoilerState,
  type CogState,
  type OfficeTier,
  type RemoteKey,
  type ToonState,
} from './model';

const levels = Array.from({ length: 20 }, (_, index) => index + 1);
const toonSlots = [1, 2, 3, 4];
const cogImages = [cogOne, cogTwo, cogThree, cogFour];
export function intValue(value: string, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(Number(value) || 0)));
}

export function CogInput({
  cog,
  index,
  update,
  remove,
}: {
  cog: CogState;
  index: number;
  update: (patch: Partial<CogState>) => void;
  remove: () => void;
}) {
  const label = `Cog ${index + 1}`;
  const maxHp = calculateCogHealth(cog.level);
  const remoteKey = cog.remote ? `${cog.remote.kind}:${cog.remote.tier}` : '';
  return (
    <div className="battle-cog">
      <div className="battle-cog-row">
        <img
          className="battle-cog-portrait"
          src={cogImages[index % cogImages.length]}
          alt=""
        />
        <div className="battle-cog-id">
          <strong>{label}</strong>
          <span>
            {cog.hp === 0
              ? 'Defeated'
              : cog.lure
                ? 'Lured'
                : cog.remote
                  ? 'Controlled'
                  : 'Active'}
          </span>
        </div>
        <label>
          <span>Level</span>
          <select
            aria-label={`${label} level`}
            value={cog.level}
            onChange={(event) => {
              const level = Number(event.target.value);
              update({ level, hp: calculateCogHealth(level) });
            }}
          >
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>HP left</span>
          <input
            aria-label={`${label} HP left`}
            type="number"
            min={0}
            max={maxHp}
            value={cog.hp}
            onChange={(event) =>
              update({ hp: intValue(event.target.value, 0, maxHp) })
            }
          />
        </label>
        <button
          type="button"
          className="battle-icon-button"
          aria-label={`Remove ${label}`}
          onClick={remove}
        >
          ×
        </button>
      </div>
      <div className="battle-hp-track" aria-hidden="true">
        <i style={{ width: `${(100 * cog.hp) / maxHp}%` }} />
      </div>
      <details className="battle-cog-details">
        <summary>
          Cog status{' '}
          <span>
            {cog.hp} / {maxHp} HP
          </span>
        </summary>
        <div className="battle-fields">
          <label>
            <span>Damage already dealt</span>
            <input
              type="number"
              min={0}
              max={maxHp}
              value={maxHp - cog.hp}
              onChange={(event) =>
                update({ hp: maxHp - intValue(event.target.value, 0, maxHp) })
              }
            />
          </label>
          <label>
            <span>Lure rounds left</span>
            <input
              type="number"
              min={0}
              max={8}
              value={cog.lure}
              onChange={(event) =>
                update({ lure: intValue(event.target.value, 0, 8) })
              }
            />
          </label>
          <label>
            <span>Suits left</span>
            <select
              value={cog.layers}
              onChange={(event) =>
                update({ layers: Number(event.target.value) as 1 | 2 })
              }
            >
              <option value={1}>1 · Standard</option>
              <option value={2}>2 · Version 2.0</option>
            </select>
          </label>
          <label>
            <span>Placed Trap</span>
            <select
              value={cog.trap ?? ''}
              onChange={(event) =>
                update({
                  trap: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            >
              <option value="">None</option>
              {trackGags.Trap.flatMap((index) =>
                [0, 1].map((organic) => (
                  <option key={index * 2 + organic} value={index * 2 + organic}>
                    {organic ? 'Organic ' : ''}
                    {battleGags[index].name}
                  </option>
                )),
              )}
            </select>
          </label>
          <label>
            <span>Active remote</span>
            <select
              value={remoteKey}
              onChange={(event) =>
                update({
                  remote: event.target.value
                    ? activeRemote(event.target.value as RemoteKey)
                    : undefined,
                })
              }
            >
              <option value="">None</option>
              {remoteKeys.map((key) => (
                <option key={key} value={key}>
                  {remoteName(key)}
                </option>
              ))}
            </select>
          </label>
          {cog.remote && (
            <label>
              <span>Remote rounds left</span>
              <input
                type="number"
                min={1}
                max={remoteStats[cog.remote.tier].turns}
                value={cog.remote.turns}
                onChange={(event) =>
                  cog.remote &&
                  update({
                    remote: {
                      ...cog.remote,
                      turns: intValue(
                        event.target.value,
                        1,
                        remoteStats[cog.remote.tier].turns,
                      ),
                    },
                  })
                }
              />
            </label>
          )}
        </div>
      </details>
    </div>
  );
}

export function BoilerInput({
  boiler,
  update,
}: {
  boiler: BoilerState;
  update: (patch: Partial<BoilerState>) => void;
}) {
  const max = boilerHealth[boiler.tier];
  const phases: BoilerPhase[] =
    boiler.tier === 4
      ? ['Fired Up', 'Defensive', 'Meltdown']
      : ['Neutral', 'Fired Up', 'Defensive'];
  const maxTurns =
    boiler.phase === 'Neutral' ? 2 : boiler.phase === 'Meltdown' ? 1 : 3;
  return (
    <div className="battle-boiler">
      <div className="battle-boiler-title">
        <strong>The Boiler</strong>
        <span>{boiler.phase}</span>
      </div>
      <div className="battle-fields">
        <label>
          <span>Office tier</span>
          <select
            aria-label="Office tier"
            value={boiler.tier}
            onChange={(event) => {
              const tier = Number(event.target.value) as OfficeTier;
              const phase =
                tier === 4 && boiler.phase === 'Neutral'
                  ? 'Fired Up'
                  : tier !== 4 && boiler.phase === 'Meltdown'
                    ? 'Fired Up'
                    : boiler.phase;
              const hp =
                boiler.hp === max
                  ? boilerHealth[tier]
                  : Math.min(boiler.hp, boilerHealth[tier]);
              const turns = phase !== boiler.phase ? 3 : boiler.turns;
              update({ tier, phase, hp, turns });
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
          <span>Boiler HP left</span>
          <input
            type="number"
            min={0}
            max={max}
            value={boiler.hp}
            onChange={(event) =>
              update({ hp: intValue(event.target.value, 0, max) })
            }
          />
        </label>
        <label>
          <span>Phase</span>
          <select
            aria-label="Phase"
            value={boiler.phase}
            onChange={(event) => {
              const phase = event.target.value as BoilerPhase;
              update({
                phase,
                turns: phase === 'Neutral' ? 2 : phase === 'Meltdown' ? 1 : 3,
              });
            }}
          >
            {phases.map((phase) => (
              <option key={phase}>{phase}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Phase rounds left</span>
          <input
            type="number"
            min={1}
            max={maxTurns}
            value={boiler.turns}
            disabled={maxTurns === 1}
            onChange={(event) =>
              update({ turns: intValue(event.target.value, 1, maxTurns) })
            }
          />
        </label>
      </div>
      <details className="battle-cog-details">
        <summary>
          Gag Ordinance{' '}
          <span>
            {boiler.ordinance ? trackName(boiler.ordinance.track) : 'None'}
          </span>
        </summary>
        <div className="battle-fields">
          <label>
            <span>Blocked track</span>
            <select
              value={boiler.ordinance?.track ?? ''}
              onChange={(event) =>
                update({
                  ordinance: event.target.value
                    ? {
                        track: event.target.value as GagTrack,
                        turns: boiler.ordinance?.turns ?? 1,
                      }
                    : undefined,
                })
              }
            >
              <option value="">None</option>
              {trackOrder.map((track) => (
                <option key={track} value={track}>
                  {trackName(track)}
                </option>
              ))}
            </select>
          </label>
          {boiler.ordinance && (
            <label>
              <span>Rounds left</span>
              <input
                type="number"
                min={1}
                max={4}
                value={boiler.ordinance.turns}
                onChange={(event) =>
                  boiler.ordinance &&
                  update({
                    ordinance: {
                      ...boiler.ordinance,
                      turns: intValue(event.target.value, 1, 4),
                    },
                  })
                }
              />
            </label>
          )}
        </div>
      </details>
    </div>
  );
}

export function ToonInventory({
  toons,
  blockedTracks,
  onTrackToggle,
  update,
}: {
  toons: BattleState['toons'];
  blockedTracks: GagTrack[];
  onTrackToggle: (track: GagTrack) => void;
  update: (toon: number, patch: Partial<ToonState>) => void;
}) {
  return (
    <details className="battle-inventory">
      <summary>
        Team inventory{' '}
        <span>
          {toons.length} {toons.length === 1 ? 'Toon' : 'Toons'}
        </span>
      </summary>
      <p>
        Use the preset stock or enter each Toon’s actual gags, remotes and Laff.
      </p>
      <fieldset className="battle-track-filter">
        <legend>Tracks available to the team</legend>
        {trackOrder.map((track) => (
          <label key={track}>
            <input
              type="checkbox"
              checked={!blockedTracks.includes(track)}
              onChange={() => onTrackToggle(track)}
            />
            <span>{trackName(track)}</span>
          </label>
        ))}
      </fieldset>
      {toonSlots.slice(0, toons.length).map((slot) => {
        const index = slot - 1;
        const toon = toons[index];
        return (
          <details key={slot} className="battle-toon">
            <summary>
              Toon {slot}{' '}
              <span>
                {toon.stock.reduce((total, count) => total + count, 0)} gags
              </span>
            </summary>
            <div className="battle-fields">
              <label>
                <span>Organic track</span>
                <select
                  value={toon.organic}
                  onChange={(event) =>
                    update(index, {
                      organic: event.target.value as GagTrack | '',
                    })
                  }
                >
                  <option value="">None</option>
                  {trackOrder.map((track) => (
                    <option key={track} value={track}>
                      {trackName(track)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Max Laff</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  placeholder="Optional"
                  value={toon.laff?.max ?? ''}
                  onChange={(event) => {
                    const max = intValue(event.target.value, 1, 999);
                    update(index, {
                      laff: event.target.value
                        ? {
                            max,
                            current: Math.min(max, toon.laff?.current ?? max),
                          }
                        : undefined,
                    });
                  }}
                />
              </label>
              {toon.laff && (
                <label>
                  <span>Current Laff</span>
                  <input
                    type="number"
                    min={0}
                    max={toon.laff.max}
                    value={toon.laff.current}
                    onChange={(event) =>
                      toon.laff &&
                      update(index, {
                        laff: {
                          ...toon.laff,
                          current: intValue(
                            event.target.value,
                            0,
                            toon.laff.max,
                          ),
                        },
                      })
                    }
                  />
                </label>
              )}
            </div>
            {trackOrder.map((track) => (
              <details key={track} className="battle-stock">
                <summary>
                  {trackName(track)}{' '}
                  <span>
                    {trackGags[track].reduce(
                      (total, id) => total + toon.stock[id],
                      0,
                    )}
                  </span>
                </summary>
                <button
                  className="battle-text-button"
                  type="button"
                  onClick={() =>
                    update(index, {
                      stock: toon.stock.map((count, id) =>
                        battleGags[id].track === track ? 0 : count,
                      ),
                    })
                  }
                >
                  Clear {trackName(track)}
                </button>
                <div className="battle-stock-grid">
                  {trackGags[track].map((id) => (
                    <label key={id}>
                      <span>{battleGags[id].name}</span>
                      <input
                        type="number"
                        min={0}
                        max={80}
                        value={toon.stock[id]}
                        onChange={(event) => {
                          const stock = [...toon.stock];
                          stock[id] = intValue(event.target.value, 0, 80);
                          update(index, { stock });
                        }}
                      />
                    </label>
                  ))}
                </div>
              </details>
            ))}
            <details className="battle-stock">
              <summary>
                Remote controls{' '}
                <span>
                  {Object.values(toon.remotes).reduce(
                    (sum, count) => sum + count,
                    0,
                  )}
                </span>
              </summary>
              <div className="battle-stock-grid">
                {remoteKeys.map((key) => (
                  <label key={key}>
                    <span>{remoteName(key)}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={toon.remotes[key] ?? 0}
                      onChange={(event) =>
                        update(index, {
                          remotes: {
                            ...toon.remotes,
                            [key]: intValue(event.target.value, 0, 100),
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
          </details>
        );
      })}
    </details>
  );
}
