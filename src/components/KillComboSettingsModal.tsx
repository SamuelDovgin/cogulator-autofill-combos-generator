import type {
  SortMode,
  SortWeights,
} from '../utils/fillToKillOptionsWorker';
import { Buttoon } from './Buttoon';

type Props = {
  sortMode: SortMode;
  sortWeights: SortWeights;
  onSortWeightsChange: (next: SortWeights) => void;
  onOpenGagWeights: () => void;
  hideOverkillAdditions: boolean;
  onHideOverkillChange: (hide: boolean) => void;
  showScores: boolean;
  onShowScoresChange: (show: boolean) => void;
  maxGenerated: number;
  onMaxGeneratedChange: (next: number) => void;
  maxDisplayed: number;
  onMaxDisplayedChange: (next: number) => void;
  lureTracksMultiplierEnabled: boolean;
  lureTracksMultiplier: number;
  onToggleLureTracksMultiplierEnabled?: (next: boolean) => void;
  onSetLureTracksMultiplier?: (next: number) => void;
  onClose: () => void;
};

function SettingsNumberInput({
  value,
  min,
  max,
  step,
  disabled = false,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const next = Number(e.target.value);
        onChange(Number.isFinite(next) ? next : value);
      }}
      className={[
        'w-full rounded-md border border-blue-800 bg-blue-950 px-2 py-1.5 text-sm text-slate-100',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    />
  );
}

export default function KillComboSettingsModal({
  sortMode,
  sortWeights,
  onSortWeightsChange,
  onOpenGagWeights,
  hideOverkillAdditions,
  onHideOverkillChange,
  showScores,
  onShowScoresChange,
  maxGenerated,
  onMaxGeneratedChange,
  maxDisplayed,
  onMaxDisplayedChange,
  lureTracksMultiplierEnabled,
  lureTracksMultiplier,
  onToggleLureTracksMultiplierEnabled,
  onSetLureTracksMultiplier,
  onClose,
}: Props) {
  const weightedActive = sortMode === 'weighted';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border-2 border-blue-900/60 bg-slate-950 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-blue-900/60 p-4">
          <div>
            <div className="font-minnie text-xl text-white">Kill Combo Settings</div>
            <div className="mt-1 text-sm text-slate-300">
              Advanced ranking, display, and generation controls for combo suggestions.
            </div>
          </div>
          <Buttoon onClick={onClose}>Close</Buttoon>
        </div>

        <div className="max-h-[80vh] space-y-4 overflow-y-auto p-4">
          <div className="rounded-xl border border-blue-900/50 bg-slate-900/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">Weighted Sort</div>
                <div className="mt-1 text-xs text-slate-400">
                  Only used when Sort is set to Weighted.
                </div>
              </div>
              <div
                className={[
                  'rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-wide',
                  weightedActive
                    ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300',
                ].join(' ')}
              >
                {weightedActive ? 'Active' : 'Inactive'}
              </div>
            </div>

            <div className={weightedActive ? 'mt-4 space-y-4' : 'mt-4 space-y-4 opacity-60'}>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-slate-200">Acc</span>
                  <SettingsNumberInput
                    value={sortWeights.accuracy}
                    min={0}
                    max={20}
                    step={0.1}
                    disabled={!weightedActive}
                    onChange={(accuracy) =>
                      onSortWeightsChange({ ...sortWeights, accuracy })
                    }
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-slate-200">Levels</span>
                  <SettingsNumberInput
                    value={sortWeights.conserve}
                    min={0}
                    max={20}
                    step={0.1}
                    disabled={!weightedActive}
                    onChange={(conserve) =>
                      onSortWeightsChange({ ...sortWeights, conserve })
                    }
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-semibold text-slate-200">Tracks</span>
                  <SettingsNumberInput
                    value={sortWeights.tracks}
                    min={0}
                    max={20}
                    step={0.1}
                    disabled={!weightedActive}
                    onChange={(tracks) =>
                      onSortWeightsChange({ ...sortWeights, tracks })
                    }
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!weightedActive}
                  onClick={onOpenGagWeights}
                  className={[
                    'rounded-md border px-3 py-2 text-sm font-bold',
                    weightedActive
                      ? 'border-blue-800 bg-blue-950 text-blue-100 hover:bg-blue-900'
                      : 'cursor-not-allowed border-slate-700 bg-slate-800/50 text-slate-300',
                  ].join(' ')}
                >
                  Gag retain weights...
                </button>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={lureTracksMultiplierEnabled}
                    disabled={!weightedActive}
                    onChange={(e) =>
                      onToggleLureTracksMultiplierEnabled?.(e.target.checked)
                    }
                  />
                  Lure track value multiplier
                </label>

                <div className="w-full sm:w-28">
                  <SettingsNumberInput
                    value={Number(lureTracksMultiplier ?? 0.5)}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={!weightedActive || !lureTracksMultiplierEnabled}
                    onChange={(next) => onSetLureTracksMultiplier?.(next)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showScores}
                  disabled={!weightedActive}
                  onChange={(e) => onShowScoresChange(e.target.checked)}
                />
                Show scores
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-blue-900/50 bg-slate-900/40 p-4">
            <div className="text-sm font-bold text-white">Results And Limits</div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-200 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={hideOverkillAdditions}
                  onChange={(e) => onHideOverkillChange(e.target.checked)}
                />
                Hide overkill additions
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-semibold text-slate-200">Generation cap</span>
                <SettingsNumberInput
                  value={maxGenerated}
                  min={50}
                  max={50000}
                  step={50}
                  onChange={onMaxGeneratedChange}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-semibold text-slate-200">Max shown</span>
                <SettingsNumberInput
                  value={maxDisplayed}
                  min={5}
                  max={100}
                  step={5}
                  onChange={onMaxDisplayedChange}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
