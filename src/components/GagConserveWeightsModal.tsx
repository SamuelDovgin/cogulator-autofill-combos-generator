import React, { useMemo } from 'react';

import type { GagInfo, GagTrack } from '../types';
import { GagTracks } from '../data/gagTracksInfo';
import type { GagConserveWeights } from '../utils/fillToKillOptionsWorker';
import { DEFAULT_GAG_CONSERVE_WEIGHTS } from '../utils/defaultSettings';
import { Buttoon } from './Buttoon';

function gagKey(g: GagInfo): string {
  return `${g.track}:${g.level}:${g.name}`;
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}


function buildDefaultWeights(): GagConserveWeights {
  return { ...DEFAULT_GAG_CONSERVE_WEIGHTS };
}

type Props = {
  weights: GagConserveWeights;
  onChange: (next: GagConserveWeights) => void;
  onClose: () => void;
};

export default function GagConserveWeightsModal({ weights, onChange, onClose }: Props) {
  const tracksToShow = useMemo(() => {
    // Keep the modal focused: Toon-Up isn't used in kill combos, so hide it by default.
    return GagTracks.filter((t) => t.name !== 'Toonup');
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-blue-900/60 bg-slate-950 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-blue-900/60 p-4">
          <div>
            <div className="font-minnie text-xl text-white">Gag retain weights</div>
            <div className="mt-1 text-sm text-slate-300">
              These only affect the <span className="font-bold">Weighted</span> sort's “Levels” score.
              Set <span className="font-bold">0</span> to spend freely, <span className="font-bold">1</span> to conserve.
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Buttoon
              label="Reset"
              onClick={() => onChange(buildDefaultWeights())}
            />
            <Buttoon label="Close" onClick={onClose} />
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="space-y-5">
            {tracksToShow.map((t) => (
              <div key={t.name} className="rounded-xl border border-blue-900/50 bg-slate-900/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-200">{t.name}</div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...weights };
                      for (const g of t.gags) next[gagKey(g)] = Number(DEFAULT_GAG_CONSERVE_WEIGHTS[gagKey(g)] ?? 0.5);
                      onChange(next);
                    }}
                    className="rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] font-bold text-blue-100 hover:bg-blue-900"
                    title="Reset this track to the default preset"
                  >
                    Reset track
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {t.gags
                    .slice()
                    .sort((a, b) => a.level - b.level)
                    .map((g) => {
                      const key = gagKey(g);
                      const val = clamp01(Number(weights[key] ?? DEFAULT_GAG_CONSERVE_WEIGHTS[key] ?? 0.5));
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-blue-900/40 bg-slate-950/50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-400">Lvl {g.level}</div>
                            <div className="truncate text-sm text-slate-100">{g.name}</div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={val}
                              onChange={(e) => {
                                const n = clamp01(Number(e.target.value));
                                onChange({ ...weights, [key]: n });
                              }}
                              className="w-28"
                            />
                            <input
                              type="number"
                              min={0}
                              max={1}
                              step={0.05}
                              value={val}
                              onChange={(e) => {
                                const n = clamp01(Number(e.target.value));
                                onChange({ ...weights, [key]: n });
                              }}
                              className="w-[72px] rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] text-slate-100"
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
