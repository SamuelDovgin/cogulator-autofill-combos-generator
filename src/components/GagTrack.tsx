import clsx from 'clsx';
import { useSfx } from '../hooks/useSfx';
import type { GagInfo, GagInstance, GagTrack as GagTrackName, GagTrackInfo } from '../types';
import { getUniqueId } from '../utils/uniqueUtils';
import Gag from './Gag';

type ExcludeLevels = {
  low1to3: boolean;
  level7: boolean;
  level6?: boolean;
  level6ByTrack?: Partial<Record<GagTrackName, boolean>>;
};

interface Props {
  disabled?: boolean;
  track: GagTrackInfo;
  onGagHover: (gag: GagInfo | undefined) => void;
  onGagSelect: (gag: GagInstance) => void;
  hiddenColumns?: number[];
  excludeLevels?: ExcludeLevels;
  greyOutExcludedLevels?: boolean;
  /** Optional per-gag highlight strength from 0..1 (1 = best/brightest). */
  highlightStrengths?: Partial<Record<string, number>>;
  isTrackEnabled?: boolean;
  onToggleTrack?: () => void;
  onOnlyTrack?: () => void;
}

function isLevelExcluded(level: number, track: GagTrackName, exclude?: ExcludeLevels) {
  if (!exclude) return false;
  if (exclude.level7 && level === 7) return true;
  if (
    level === 6 &&
    ((exclude.level6 ?? false) || (exclude.level6ByTrack?.[track] ?? false))
  ) {
    return true;
  }
  if (exclude.low1to3 && level >= 1 && level <= 3) return true;
  return false;
}

const gagKey = (gag: Pick<GagInfo, 'track' | 'level' | 'name'>) => `${gag.track}:${gag.level}:${gag.name}`;

export default function GagTrack({
  track,
  disabled,
  onGagHover,
  onGagSelect,
  hiddenColumns,
  excludeLevels,
  greyOutExcludedLevels = true,
  highlightStrengths,
  isTrackEnabled = true,
  onToggleTrack,
  onOnlyTrack,
}: Props) {
  const { playClickSfx, playHoverSfx } = useSfx();
  const { name, color, gags } = track;
  const gagSelectionDisabled = disabled || !isTrackEnabled;

  // filter out gags with the indexes in hiddenColumns
  const filteredGags = gags.filter(
    (_, index) => !hiddenColumns?.includes(index),
  );

  return (
    <div
      className={clsx(
        'flex w-full flex-col gap-2 rounded-[2%/45%] p-2 px-4 shadow-[0_5px_13px_1px_black]',
        !isTrackEnabled && 'grayscale opacity-60',
      )}
      style={{ backgroundColor: color }}
    >
      <div className="flex w-full items-center gap-2">
        <div className="text-lg font-bold uppercase text-black drop-shadow-box min-w-[72px] shrink-0 text-center">
          {name}
        </div>
        {onToggleTrack && (
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 drop-shadow-box">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isTrackEnabled}
                onChange={onToggleTrack}
              />
              <span className="hidden sm:inline">Allow</span>
            </label>
            {onOnlyTrack && (
              <button
                className="rounded-md border border-slate-900/60 bg-slate-50/80 px-2 py-0.5 text-[11px] font-bold text-slate-900 hover:bg-slate-100"
                type="button"
                onClick={onOnlyTrack}
              >
                Only
              </button>
            )}
          </div>
        )}
        <div
          className="flex flex-1 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible pr-6"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          {filteredGags.map((gag) => (
            (() => {
              const excluded = isLevelExcluded(gag.level, gag.track as GagTrackName, excludeLevels);
              const visualExcluded = excluded && !!greyOutExcludedLevels;
              const key = gagKey(gag);
              return (
            <Gag
              gag={gag}
              disabled={gagSelectionDisabled || visualExcluded}
              disabledVariant={
                gagSelectionDisabled
                  ? 'full'
                  : visualExcluded
                    ? 'soft'
                    : undefined
              }
              highlightStrength={gagSelectionDisabled ? undefined : (highlightStrengths?.[key] as number | undefined)}
              key={gag.name}
              onBlur={() => {
                onGagHover(undefined);
              }}
              onGagClick={(isOrganic) => {
                if (gagSelectionDisabled) return;
                onGagSelect({
                  ...gag,
                  isOrganic,
                  id: getUniqueId(),
                });
                playClickSfx();
              }}
              onGagHover={(isOrganic) => {
                if (gagSelectionDisabled) return;
                onGagHover({ ...gag, isOrganic });
                playHoverSfx();
              }}
              onMouseLeave={() => {
                onGagHover(undefined);
              }}
            />
              );
            })()
          ))}
        </div>
      </div>
    </div>
  );
}
