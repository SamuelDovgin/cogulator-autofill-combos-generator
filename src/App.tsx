import './App.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSound } from 'use-sound';

import { Header } from './components/Header';
import { CogDamageTable } from './components/CogDamageTable';
import CalculationDisplay from './components/CalculationDisplay';
import GagTrack from './components/GagTrack';
import { KillOptionsTable } from './components/KillOptionsTable';
import SettingsJsonModal from './components/SettingsJsonModal';
import InfoTip from './components/InfoTip';

import { GagTracks } from './data/gagTracksInfo';
import { calculateComboAccuracy, calculateCogHealth, calculateMaxCogLevel, calculateTotalDamage, explainComboAccuracy } from './utils/calculatorUtils';
import { getUniqueId } from './utils/uniqueUtils';

import type { GagInfo, GagInstance, GagTrack as GagTrackName } from './types';
import type { ToonRestriction, SortMode, SortWeights, GagConserveWeights } from './utils/fillToKillOptionsWorker';
import { SfxContext } from './context/sfxContext';
import { defaultEnabledTracks, useFillToKillOptions } from './hooks/useFillToKillOptions';
import { findCanonicalGag } from './utils/gagLookup';
import { DEFAULT_GAG_CONSERVE_WEIGHTS, DEFAULT_MAX_GENERATED, DEFAULT_SORT_MODE, DEFAULT_SORT_WEIGHTS, DEFAULT_TARGET_LEVEL } from './utils/defaultSettings';

import clickSfxFile from '../assets/sounds/Click.mp3';
import hoverSfxFile from '../assets/sounds/GUI_rollover.mp3';

const HIDE_TOONUP = true;

const LEVEL6_TRACKS = ['Trap', 'Lure', 'Sound', 'Throw', 'Squirt', 'Drop'] as const;

const DEFAULT_EXCLUDE = {
  low1to3: true,
  level7: true,
  level6ByTrack: Object.fromEntries(LEVEL6_TRACKS.map((t) => [t, true])) as Partial<
    Record<GagTrackName, boolean>
  >,
};


type FullSettingsV1 = {
  schemaVersion: 1;
  exportedAt: string;
  settings: {
    soundEnabled: boolean;
    maxToons: 1 | 2 | 3 | 4;
    toonRestrictions: ToonRestriction[];
    excludeLevels: typeof DEFAULT_EXCLUDE;
    enabledTracks: Record<GagTrackName, boolean>;
    sortMode: SortMode;
    sortWeights: SortWeights;
    gagConserveWeights: GagConserveWeights;
    hideOverkillAdditions: boolean;
    maxGenerated: number;
    showKillHints: boolean;
    greyOutExcludedLevels: boolean;
    isTargetAlreadyLured: boolean;
    targetHpOverride: number | null;
    targetCurrentDamage: number | null;
    targetLevel: number | null;
    selectedGags: ExportedGag[];
  };
};

export default function App() {
  const [selectedGags, setSelectedGags] = useState<GagInstance[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [maxToons, setMaxToons] = useState<1 | 2 | 3 | 4>(4);
  const [toonRestrictions, setToonRestrictions] = useState<ToonRestriction[]>(['none', 'none', 'none', 'none']);
  const [excludeLevels, setExcludeLevels] = useState(DEFAULT_EXCLUDE);
  const [enabledTracks, setEnabledTracks] = useState<Record<GagTrackName, boolean>>(
    defaultEnabledTracks(),
  );
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [sortWeights, setSortWeights] = useState<SortWeights>(DEFAULT_SORT_WEIGHTS);
  const [gagConserveWeights, setGagConserveWeights] = useState<GagConserveWeights>({ ...DEFAULT_GAG_CONSERVE_WEIGHTS });
  const preferAccuracy = sortMode === 'accuracy';
  const [hideOverkillAdditions, setHideOverkillAdditions] = useState(true);
  const [maxGenerated, setMaxGenerated] = useState(DEFAULT_MAX_GENERATED);

  const [showKillHints, setShowKillHints] = useState(true);
  const [greyOutExcludedLevels, setGreyOutExcludedLevels] = useState(true);
  const [isTargetAlreadyLured, setIsTargetAlreadyLured] = useState(false);
  const [targetHpText, setTargetHpText] = useState('');
  const [currentDmgText, setCurrentDmgText] = useState('');

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Hover preview state (temporary, not committed)
  const [hoveredGag, setHoveredGag] = useState<GagInfo | undefined>();
  const [previewGag, setPreviewGag] = useState<GagInstance | null>(null);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);

  // Fill-to-kill state
  const [targetLevel, setTargetLevel] = useState<number | null>(DEFAULT_TARGET_LEVEL);

  const {
    fillToKillLoading: isFillLoading,
    fillToKillOptions: fillOptions,
    computeFillToKillOptions,
  } = useFillToKillOptions();

  const [playClickRaw] = useSound(clickSfxFile, { soundEnabled, volume: 0.5 });
  const [playHoverRaw] = useSound(hoverSfxFile, { soundEnabled, volume: 0.35 });

  const playClickSfx = useCallback(() => {
    try {
      playClickRaw();
    } catch {
      // ignore
    }
  }, [playClickRaw]);

  const playHoverSfx = useCallback(() => {
    try {
      playHoverRaw();
    } catch {
      // ignore
    }
  }, [playHoverRaw]);

  // Keep selection capped to maxToons
  useEffect(() => {
    setSelectedGags((prev) => (prev.length > maxToons ? prev.slice(0, maxToons) : prev));
  }, [maxToons]);

  // If the target is already lured, we treat this round as a pure attack round: no Lure/Trap gags.
  useEffect(() => {
    if (!isTargetAlreadyLured) return;
    setSelectedGags((prev) => prev.filter((g) => g.track !== 'Lure' && g.track !== 'Trap'));
    setPreviewGag((prev) => (prev && (prev.track === 'Lure' || prev.track === 'Trap') ? null : prev));
  }, [isTargetAlreadyLured]);

  // Keep toon restriction list in sync with maxToons
  useEffect(() => {
    setToonRestrictions((prev) => {
      const next = [...prev];
      while (next.length < maxToons) next.push('none');
      return next.slice(0, maxToons);
    });
  }, [maxToons]);

  // Effective (possibly previewed) level & selection
  const effectiveTargetLevel = useMemo(() => (previewLevel !== null ? previewLevel : targetLevel), [previewLevel, targetLevel]);

  const targetHpOverride = useMemo(() => {
    const t = targetHpText.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  }, [targetHpText]);
  const targetCurrentDamage = useMemo(() => {
    const t = currentDmgText.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  }, [currentDmgText]);

  const effectiveTargetHpOverride = useMemo(() => {
    if (targetHpOverride !== null) return targetHpOverride;
    if (targetCurrentDamage === null) return null;
    if (effectiveTargetLevel === null) return null;
    return Math.max(0, calculateCogHealth(effectiveTargetLevel) - targetCurrentDamage);
  }, [targetHpOverride, targetCurrentDamage, effectiveTargetLevel]);
  const displaySelectedGags = useMemo(() => {
    const base = selectedGags.slice(0, maxToons);
    const canAddPreview = !!previewGag && base.length < maxToons;
    if (canAddPreview) return [...base, previewGag!];
    return base;
  }, [selectedGags, previewGag, maxToons]);

  const calcSelectedGags = useMemo(() => {
    if (!isTargetAlreadyLured) return displaySelectedGags;
    return displaySelectedGags.filter((g) => g.track !== 'Lure' && g.track !== 'Trap');
  }, [displaySelectedGags, isTargetAlreadyLured]);

  const { totalDamage, baseDamage, groupBonus, lureBonus, organicBonus } = useMemo(() => {
    return calculateTotalDamage(calcSelectedGags, { lured: isTargetAlreadyLured });
  }, [calcSelectedGags, isTargetAlreadyLured]);

  const selectionAccuracy = useMemo(
    () =>
      calculateComboAccuracy(calcSelectedGags, effectiveTargetLevel, {
        initialLured: isTargetAlreadyLured,
        targetHpOverride: effectiveTargetHpOverride,
      }),
    [calcSelectedGags, effectiveTargetLevel, isTargetAlreadyLured, effectiveTargetHpOverride],
  );

  const accuracyExplanation = useMemo(
    () =>
      explainComboAccuracy(calcSelectedGags, effectiveTargetLevel, {
        initialLured: isTargetAlreadyLured,
        targetHpOverride: effectiveTargetHpOverride,
      }),
    [calcSelectedGags, effectiveTargetLevel, isTargetAlreadyLured, effectiveTargetHpOverride],
  );

  const damageExplanation = useMemo(() => {
    if (displaySelectedGags.length === 0) return 'No gags selected.';
    const parts: string[] = [];
    parts.push('Damage numbers below assume all selected gags hit (separate from Accuracy).');
    parts.push(`Total = Base (${baseDamage}) + Group (${groupBonus}) + Lure (${lureBonus}) = ${totalDamage}`);
    parts.push('Base: sum of each track\'s damage after track interactions (Trap triggers on Lure hit; Drop deals 0 to lured).');
    parts.push('Group: for each non-Lure track where 2+ gags are used together, +ceil(trackDamage/5).');
    parts.push('Lure: if target becomes lured and a non-Sound damage track hits, +ceil(trackDamage/2), then lure ends.');
    parts.push('Organic: each organic gag adds at least +1 damage (ceil(maxDmg * organicBonus)); included in Base.');
    return parts.join('\n');
  }, [displaySelectedGags, baseDamage, groupBonus, lureBonus, totalDamage]);

  const maxCogLevel = useMemo(
    () => calculateMaxCogLevel(calcSelectedGags),
    [calcSelectedGags],
  );

  const maxCogExplanation = useMemo(() => {
    if (displaySelectedGags.length === 0) return 'No gags selected.';
    return (
      'Max Cog Level is the highest level (1..20) whose HP is <= the Total Damage shown (assuming all gags hit).\n' +
      'It does NOT account for Accuracy; use Accuracy / combo list for KO probability.'
    );
  }, [displaySelectedGags]);

  const handleGagSelect = (gag: GagInfo) => {
    // If you're committing a gag while it's being previewed, avoid double-adding.
    setPreviewGag(null);
    setSelectedGags((prev) => {
      if (prev.length >= maxToons) return prev;
      return [...prev, { ...gag, id: getUniqueId() }];
    });
  };

  const handleSelectionChanged = (gags: GagInstance[]) => {
    // Never commit preview gags.
    const committed = gags.filter((g) => !g.isPreview);
    setSelectedGags(committed.slice(0, maxToons));
  };

  const handleCogLevelClick = (level: number) => {
    // Commit target level on click.
    setPreviewLevel(null);
    setTargetLevel(level);
    playClickSfx();
  };

  const resetDefaults = useCallback(() => {
    setSelectedGags([]);
    setTargetLevel(DEFAULT_TARGET_LEVEL);
    setPreviewLevel(null);
    setPreviewGag(null);
    setHoveredGag(undefined);
    setMaxToons(4);
    setToonRestrictions(['none', 'none', 'none', 'none']);
    setExcludeLevels(DEFAULT_EXCLUDE);
    setEnabledTracks(defaultEnabledTracks());
    setSortMode(DEFAULT_SORT_MODE);
    setSortWeights(DEFAULT_SORT_WEIGHTS);
    setGagConserveWeights({ ...DEFAULT_GAG_CONSERVE_WEIGHTS });
    setHideOverkillAdditions(true);
    setMaxGenerated(DEFAULT_MAX_GENERATED);
    setShowKillHints(true);
    setGreyOutExcludedLevels(true);
    setIsTargetAlreadyLured(false);
    setTargetHpText('');
    setSoundEnabled(true);
  }, []);

  const getFullSettingsJson = useCallback(() => {
    const exported: FullSettingsV1 = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        soundEnabled,
        maxToons,
        toonRestrictions,
        excludeLevels,
        enabledTracks,
        sortMode,
        sortWeights,
        gagConserveWeights,
        hideOverkillAdditions,
        maxGenerated,
        showKillHints,
        greyOutExcludedLevels,
        isTargetAlreadyLured,
        targetHpOverride,
        targetCurrentDamage,
        targetLevel,
        selectedGags: selectedGags
          .filter((g) => !g.isPreview)
          .slice(0, maxToons)
          .map((g) => ({
            track: g.track,
            level: g.level,
            name: g.name,
            isOrganic: !!g.isOrganic,
          })),
      },
    };
    return JSON.stringify(exported, null, 2);
  }, [
    soundEnabled,
    maxToons,
    toonRestrictions,
    excludeLevels,
    enabledTracks,
    sortMode,
    sortWeights,
    gagConserveWeights,
    hideOverkillAdditions,
    maxGenerated,
    showKillHints,
    greyOutExcludedLevels,
    isTargetAlreadyLured,
    targetHpOverride,
    targetCurrentDamage,
    targetLevel,
    selectedGags,
  ]);

  const getWeightsJson = useCallback(() => {
    const weightsOnly = {
      schemaVersion: 1,
      weightsOnly: true,
      sortMode,
      sortWeights,
      gagConserveWeights,
    };
    return JSON.stringify(weightsOnly, null, 2);
  }, [sortMode, sortWeights, gagConserveWeights]);

  const applySettingsJson = useCallback(
    (raw: string): { ok: boolean; message: string } => {
      let obj: any;
      try {
        obj = JSON.parse(raw);
      } catch {
        return { ok: false, message: 'Invalid JSON (could not parse).' };
      }

      // Weights-only import
      if (obj && obj.weightsOnly) {
        if (obj.sortMode === 'accuracy' || obj.sortMode === 'conserve' || obj.sortMode === 'weighted') {
          setSortMode(obj.sortMode);
        }
        if (obj.sortWeights && typeof obj.sortWeights === 'object') {
          const next: SortWeights = {
            accuracy: Number.isFinite(Number(obj.sortWeights.accuracy)) ? Math.max(0, Number(obj.sortWeights.accuracy)) : sortWeights.accuracy,
            conserve: Number.isFinite(Number(obj.sortWeights.conserve)) ? Math.max(0, Number(obj.sortWeights.conserve)) : sortWeights.conserve,
            tracks: Number.isFinite(Number(obj.sortWeights.tracks)) ? Math.max(0, Number(obj.sortWeights.tracks)) : sortWeights.tracks,
          };
          setSortWeights(next);
        }

        if (obj.gagConserveWeights && typeof obj.gagConserveWeights === 'object') {
          // Shallow-merge onto existing weights; values are clamped to 0..1
          const next: GagConserveWeights = { ...gagConserveWeights };
          for (const [k, v] of Object.entries(obj.gagConserveWeights)) {
            const n = Number(v);
            if (!Number.isFinite(n)) continue;
            next[k] = Math.max(0, Math.min(1, n));
          }
          setGagConserveWeights(next);
        }
        return { ok: true, message: 'Applied weights-only JSON.' };
      }

      // Full settings import (Option B)
      if (!obj || obj.schemaVersion !== 1 || !obj.settings) {
        return { ok: false, message: 'JSON did not look like an exported settings object.' };
      }

      const s = obj.settings;

      if (typeof s.soundEnabled === 'boolean') setSoundEnabled(s.soundEnabled);

      if (s.maxToons === 1 || s.maxToons === 2 || s.maxToons === 3 || s.maxToons === 4) {
        setMaxToons(s.maxToons);
      }

      if (Array.isArray(s.toonRestrictions)) {
        setToonRestrictions(
          s.toonRestrictions
            .slice(0, 4)
            .map((v: any) => (typeof v === 'string' ? v : 'none')),
        );
      }

      if (s.excludeLevels && typeof s.excludeLevels === 'object') {
        // Be forgiving: merge with defaults.
        const merged = {
          ...DEFAULT_EXCLUDE,
          ...s.excludeLevels,
          level6ByTrack: {
            ...DEFAULT_EXCLUDE.level6ByTrack,
            ...(s.excludeLevels.level6ByTrack ?? {}),
          },
        };
        setExcludeLevels(merged);
      }

      if (s.enabledTracks && typeof s.enabledTracks === 'object') {
        setEnabledTracks((prev) => ({ ...prev, ...s.enabledTracks }));
      }

      if (s.sortMode === 'accuracy' || s.sortMode === 'conserve' || s.sortMode === 'weighted') {
        setSortMode(s.sortMode);
      }

      if (s.sortWeights && typeof s.sortWeights === 'object') {
        setSortWeights({
          accuracy: Number.isFinite(Number(s.sortWeights.accuracy)) ? Math.max(0, Number(s.sortWeights.accuracy)) : 1,
          conserve: Number.isFinite(Number(s.sortWeights.conserve)) ? Math.max(0, Number(s.sortWeights.conserve)) : 1,
          tracks: Number.isFinite(Number(s.sortWeights.tracks)) ? Math.max(0, Number(s.sortWeights.tracks)) : 1,
        });
      }

      if (s.gagConserveWeights && typeof s.gagConserveWeights === 'object') {
        const next: GagConserveWeights = { ...DEFAULT_GAG_CONSERVE_WEIGHTS };
        for (const [k, v] of Object.entries(s.gagConserveWeights)) {
          const n = Number(v);
          if (!Number.isFinite(n)) continue;
          next[k] = Math.max(0, Math.min(1, n));
        }
        setGagConserveWeights(next);
      }

      if (typeof s.hideOverkillAdditions === 'boolean') setHideOverkillAdditions(s.hideOverkillAdditions);

      if (typeof (s as any).showKillHints === 'boolean') setShowKillHints((s as any).showKillHints);
      if (typeof (s as any).greyOutExcludedLevels === 'boolean') setGreyOutExcludedLevels((s as any).greyOutExcludedLevels);

      if (typeof (s as any).isTargetAlreadyLured === 'boolean') setIsTargetAlreadyLured((s as any).isTargetAlreadyLured);
      if ((s as any).targetHpOverride === null || Number.isFinite(Number((s as any).targetHpOverride))) {
        const v = (s as any).targetHpOverride;
        setTargetHpText(v == null ? '' : String(Math.max(0, Math.floor(Number(v)))));
      }

      if ((s as any).targetCurrentDamage === null || Number.isFinite(Number((s as any).targetCurrentDamage))) {
        const v = (s as any).targetCurrentDamage;
        setCurrentDmgText(v == null ? '' : String(Math.max(0, Math.floor(Number(v)))));
      }

      if (Number.isFinite(Number(s.maxGenerated))) {
        const safe = Math.max(50, Math.min(50000, Math.floor(Number(s.maxGenerated) || 0)));
        setMaxGenerated(safe);
      }

      if (s.targetLevel === null || Number.isFinite(Number(s.targetLevel))) {
        setTargetLevel(s.targetLevel === null ? null : Number(s.targetLevel));
      }

      if (Array.isArray(s.selectedGags)) {
        const next: GagInstance[] = [];
        for (const eg of s.selectedGags) {
          if (!eg || typeof eg !== 'object') continue;
          const base: GagInfo = {
            track: eg.track,
            level: Number(eg.level),
            name: eg.name,
            // image will be corrected from canonical lookup
            image: '',
            damage: 0,
            accuracy: 0,
          } as any;
          const canonical = findCanonicalGag(base);
          if (!canonical) continue;
          next.push({
            ...canonical,
            isOrganic: !!eg.isOrganic,
            id: getUniqueId(),
          });
        }
        setSelectedGags(next.slice(0, s.maxToons ?? 4));
      }

      // Ensure preview doesn't get stuck
      setPreviewGag(null);
      setPreviewLevel(null);

      return { ok: true, message: 'Applied full settings JSON.' };
    },
    [sortWeights, gagConserveWeights],
  );

  const applyAddedGags = useCallback(
    (added: GagInfo[]) => {
      const base = selectedGags.slice(0, maxToons);
      const resolved = added.map((g) => findCanonicalGag(g) ?? g);
      const additions: GagInstance[] = resolved.map((g) => ({ ...g, id: getUniqueId() }));
      setSelectedGags([...base, ...additions].slice(0, maxToons));
      playClickSfx();
      setPreviewGag(null);
    },
    [selectedGags, maxToons, playClickSfx],
  );

  // Auto-apply top option after click

  const toggleTrack = (track: GagTrackName) => {
    setEnabledTracks((prev) => ({ ...prev, [track]: !prev[track] }));
  };

  const buildTrackRecord = (value: boolean) =>
    Object.fromEntries(
      GagTracks.map((track) => [track.name as GagTrackName, value]),
    ) as Record<GagTrackName, boolean>;

  const allowAllTracks = () => setEnabledTracks(buildTrackRecord(true));
  const disableAllTracks = () => setEnabledTracks(buildTrackRecord(false));

  const onlyTrack = (trackName: GagTrackName) => {
    setEnabledTracks(
      Object.fromEntries(
        GagTracks.map((track) => [track.name as GagTrackName, track.name === trackName]),
      ) as Record<GagTrackName, boolean>,
    );
  };

  // Hover handlers
  // - Palette hover (gag tray): temporary "preview" add
  // - Selected-gag hover: info only
  const handlePaletteGagHover = useCallback(
    (gag?: GagInfo) => {
      setHoveredGag(gag);
      if (!gag) {
        setPreviewGag(null);
        return;
      }
      // Mimic click behavior: if we're already at the toon limit, don't preview-add.
      if (selectedGags.length >= maxToons) {
        setPreviewGag(null);
        return;
      }
      setPreviewGag({ ...gag, id: '__preview__', isPreview: true });
    },
    [selectedGags.length, maxToons],
  );

  const handleSelectedGagHover = useCallback((gag?: GagInfo) => {
    setHoveredGag(gag);
  }, []);

  const handleCogLevelHover = useCallback((level: number | undefined) => {
    setPreviewLevel(level ?? null);
  }, []);

  // Keep fill suggestions up to date for the effective selection & level.
  useEffect(() => {
    if (effectiveTargetLevel === null) return;
    void computeFillToKillOptions({
      targetLevel: effectiveTargetLevel,
      currentGags: calcSelectedGags.slice(0, maxToons),
      maxToons,
      isTargetAlreadyLured,
      targetHpOverride: effectiveTargetHpOverride,
      excludeLevels,
      enabledTracks,
      sortMode,
      sortWeights,
      gagConserveWeights,
      preferAccuracy,
      hideOverkillAdditions,
      toonRestrictions,
      maxResults: 12,
      maxGenerated,
    });
  }, [
    effectiveTargetLevel,
    calcSelectedGags,
    maxToons,
    excludeLevels,
    enabledTracks,
    sortMode,
    sortWeights,
    gagConserveWeights,
    preferAccuracy,
    hideOverkillAdditions,
    toonRestrictions,
    maxGenerated,
    isTargetAlreadyLured,
    effectiveTargetHpOverride,
    computeFillToKillOptions,
  ]);


  const handleSortModeChange = useCallback((nextMode: SortMode) => {
    setSortMode(nextMode);
  }, []);

  const handleSortWeightsChange = useCallback((nextWeights: SortWeights) => {
    setSortWeights(nextWeights);
  }, []);

  const handleHideOverkillChange = useCallback((nextHideOverkill: boolean) => {
    setHideOverkillAdditions(nextHideOverkill);
  }, []);


  const handleMaxGeneratedChange = useCallback((nextMaxGenerated: number) => {
    const safe = Math.max(50, Math.min(50000, Math.floor(nextMaxGenerated || 0)));
    setMaxGenerated(safe);
  }, []);

  // NOTE: Settings JSON export/import and Reset to Defaults are implemented earlier in this file.

  const tracksToRender = useMemo(() => {
    return GagTracks.filter((t) => {
      const name = t.name as GagTrackName;
      return !(HIDE_TOONUP && name === 'Toonup');
    });
  }, []);

  // Highlight "next gags" that appear in the ranked kill-combo list.
  // We compute a smooth 0..1 strength value per gag:
  //  - 1.0 = appears in the best (highest-ranked) combos
  //  - 0.0 = only appears in the worst combos
  // This allows highlighting *many* candidates with a gradient, not just the top 3.
  // Orange highlight hints: based on current selection (including hover preview),
  // highlight any gag that would *improve* the one-turn KO chance if you add one copy of it next.
  // Brightness is relative among all highlighted gags (worst = muted orange, best = bright orange).
  // Orange highlight hints: based on current selection (including hover preview),
  // highlight any gag that would make your *all-hit* damage reach (or exceed) the selected Cog's HP.
  // Brightness reflects the one-turn KO chance for (current selection + that gag).
  const paletteHighlightStrengths = useMemo(() => {
    if (!showKillHints) return {} as Partial<Record<string, number>>;
    if (effectiveTargetLevel === null) return {} as Partial<Record<string, number>>;
    if (calcSelectedGags.length >= maxToons) return {} as Partial<Record<string, number>>;

    const hp = targetHpOverride ?? calculateCogHealth(effectiveTargetLevel);

    const baseAllHitDamage = calculateTotalDamage(calcSelectedGags, { lured: isTargetAlreadyLured }).totalDamage;
    if (baseAllHitDamage >= hp) return {} as Partial<Record<string, number>>;

    const keyOf = (g: Pick<GagInfo, 'track' | 'level' | 'name'>) => `${g.track}:${g.level}:${g.name}`;

    const scored: Array<{ key: string; p: number }> = [];

    for (const t of GagTracks) {
      if (t.name === 'Toonup') continue;
      if (!enabledTracks[t.name as GagTrackName]) continue;

      for (const gag of t.gags) {
        const next: GagInstance[] = [
          ...calcSelectedGags,
          {
            ...gag,
            id: 'HINT',
            isOrganic: false,
          },
        ];

        const dmg = calculateTotalDamage(next, { lured: isTargetAlreadyLured }).totalDamage;
        if (dmg < hp) continue;

        const p = calculateComboAccuracy(next, effectiveTargetLevel, { initialLured: isTargetAlreadyLured, targetHpOverride });
        scored.push({ key: keyOf(gag), p });
      }
    }

    if (scored.length === 0) return {} as Partial<Record<string, number>>;

    const ps = scored.map((s) => s.p);
    const minP = Math.min(...ps);
    const maxP = Math.max(...ps);

    const out: Partial<Record<string, number>> = {};
    for (const s of scored) {
      const t = maxP === minP ? 1 : (s.p - minP) / (maxP - minP);
      out[s.key] = Math.max(0, Math.min(1, t));
    }
    return out;
  }, [showKillHints, effectiveTargetLevel, calcSelectedGags, maxToons, enabledTracks, isTargetAlreadyLured, targetHpOverride]);




  return (
    <SfxContext.Provider
      value={{
        soundEnabled,
        playClickSfx,
        playHoverSfx,
      }}
    >
      <div className="min-h-screen w-full bg-slate-950 text-white">
        <Header
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          onOpenSettings={() => setSettingsModalOpen(true)}
        />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full flex-col items-center justify-center gap-3">
              <div className="flex w-full flex-col items-center gap-2">
                <CogDamageTable
                  selectedGags={displaySelectedGags}
                  hoveredGag={undefined}
                  onLevelClick={handleCogLevelClick}
                  onLevelHover={handleCogLevelHover}
                  activeLevel={effectiveTargetLevel}
                />

                {/* Controls under graph */}
                <div className="w-full min-w-[300px] rounded-md border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-slate-200">Toons:</div>
                      <div className="flex overflow-hidden rounded-md border border-blue-800">
                        {[1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setMaxToons(n as 1 | 2 | 3 | 4)}
                            className={[
                              'px-3 py-1 text-sm font-bold',
                              maxToons === n
                                ? 'bg-blue-500 text-white'
                                : 'bg-blue-950 text-blue-100 hover:bg-blue-900',
                            ].join(' ')}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Toggle: treat the target as already lured at the start of the round (no need to use Lure/Trap this turn)."
                          onClick={() => setIsTargetAlreadyLured((v) => !v)}
                          className={[
                            'rounded-md border px-3 py-1 text-sm font-bold',
                            isTargetAlreadyLured
                              ? 'border-orange-400 bg-orange-500/20 text-orange-100'
                              : 'border-slate-700 bg-slate-800/40 text-slate-200 hover:bg-slate-800/70',
                          ].join(' ')}
                        >
                          🧲 {isTargetAlreadyLured ? 'Already lured' : 'Not lured'}
                        </button>

                        <label className="flex items-center gap-2 text-xs text-slate-200">
                          <span className="font-bold text-slate-200">Remaining HP</span>
                          <input
                            className="w-24 rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-xs text-slate-100"
                            placeholder="(full)"
                            inputMode="numeric"
                            value={targetHpText}
                            onChange={(e) => {
                              const v = e.target.value;
                              // Allow empty, or digits only
                              if (v === '' || /^\d+$/.test(v)) setTargetHpText(v);
                            }}
                            title="If set, KO% / kill combos will be computed against this remaining HP instead of the cog's full HP for the selected level."
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-slate-200">
                          <span className="font-bold text-slate-200">Current DMG</span>
                          <input
                            className="w-24 rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-xs text-slate-100"
                            placeholder="0"
                            inputMode="numeric"
                            value={currentDmgText}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '' || /^\d+$/.test(v)) setCurrentDmgText(v);
                            }}
                            title="If Remaining HP is blank, this damage is subtracted from the selected cog level's full HP to compute remaining HP for KO% / kill combos."
                          />

                          <button
                            type="button"
                            className="ml-1 rounded-md border border-slate-700 bg-slate-800/40 px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-800/70"
                            title="Clear Remaining HP + Current DMG"
                            onClick={() => {
                              setTargetHpText('');
                              setCurrentDmgText('');
                            }}
                          >
                            Clear
                          </button>
                        </label>
                      </div>
                    </div>


                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-bold text-slate-200">Missing track per Toon (optional):</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {Array.from({ length: maxToons }).map((_, idx) => (
                          <label key={idx} className="flex items-center gap-1 text-xs text-slate-200">
                            <span className="text-slate-300">Toon {idx + 1}</span>
                            <select
                              className="rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-xs text-slate-100"
                              value={toonRestrictions[idx] ?? 'none'}
                              onChange={(e) => {
                                const next = [...toonRestrictions] as ToonRestriction[];
                                next[idx] = e.target.value as ToonRestriction;
                                setToonRestrictions(next);
                              }}
                            >
                              <option value="none">All tracks</option>
                              <option value="toonup-less">Toon-Up-less</option>
                              <option value="trapless">Trapless</option>
                              <option value="lureless">Lureless</option>
                              <option value="soundless">Soundless</option>
                              <option value="dropless">Dropless</option>
                            </select>
                          </label>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-300/80">
                        Assumes every Toon always has <span className="font-bold">Throw</span> +{' '}
                        <span className="font-bold">Squirt</span>. Other tracks depend on the dropdown above.
                      </div>
                    </div>


                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={excludeLevels.low1to3}
                            onChange={(e) =>
                              setExcludeLevels((p) => ({ ...p, low1to3: e.target.checked }))
                            }
                          />
                          Exclude lvl 1-3
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={excludeLevels.level7}
                            onChange={(e) =>
                              setExcludeLevels((p) => ({ ...p, level7: e.target.checked }))
                            }
                          />
                          Exclude lvl 7
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-slate-200">
                          <span>Exclude lvl 6:</span>
                          <button
                            type="button"
                            className="rounded border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-800/70"
                            title="Exclude level 6 gags for every track"
                            onClick={() =>
                              setExcludeLevels((p) => ({
                                ...p,
                                level6ByTrack: Object.fromEntries(
                                  Object.keys(p.level6ByTrack).map((k) => [k, true]),
                                ) as any,
                              }))
                            }
                          >
                            All
                          </button>
                          <button
                            type="button"
                            className="rounded border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-800/70"
                            title="Allow level 6 gags for every track"
                            onClick={() =>
                              setExcludeLevels((p) => ({
                                ...p,
                                level6ByTrack: Object.fromEntries(
                                  Object.keys(p.level6ByTrack).map((k) => [k, false]),
                                ) as any,
                              }))
                            }
                          >
                            None
                          </button>
                        </div>
                        {tracksToRender.map((t) => {
                          const track = t.name as GagTrackName;
                          return (
                            <label key={track} className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={!!excludeLevels.level6ByTrack[track]}
                                onChange={(e) =>
                                  setExcludeLevels((p) => ({
                                    ...p,
                                    level6ByTrack: {
                                      ...p.level6ByTrack,
                                      [track]: e.target.checked,
                                    },
                                  }))
                                }
                              />
                              {track}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                  </div>


                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-100">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showKillHints}
                        onChange={(e) => setShowKillHints(e.target.checked)}
                      />
                      Highlight helpful gags (orange)
                      <InfoTip text="When enabled, gags in the palette will turn orange if adding one copy makes your all-hit damage reach (or exceed) the selected Cog's HP. Brightness reflects the one-turn KO chance for (current selection + that gag)." />
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={greyOutExcludedLevels}
                        onChange={(e) => setGreyOutExcludedLevels(e.target.checked)}
                      />
                      Grey out excluded levels
                      <InfoTip text="Purely visual: when enabled, gags that are excluded by the level filters above appear muted, but they remain clickable and can still be previewed/selected." />
                    </label>
                  </div>

                  <div className="mt-2 text-xs text-slate-300/80">
                    Tip: click any Cog level to auto-fill your remaining toon slots and show alternate kill lines.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-3">
              <div className="w-full rounded-md border border-slate-800 bg-slate-900/50 p-3">
                <CalculationDisplay
                  selectedGags={displaySelectedGags}
                  isTargetAlreadyLured={isTargetAlreadyLured}
                  onAlreadyLuredChange={setIsTargetAlreadyLured}
                  onSelectionChanged={handleSelectionChanged}
                  totalDamage={totalDamage}
                  onGagHover={handleSelectedGagHover}
                />

                <div className="mt-3 space-y-1 text-sm text-slate-200">
                  <div>
                    <span className="font-bold text-white">Total Damage:</span>{' '}
                    <InfoTip text={damageExplanation} />
                    <span className="font-cog" title={damageExplanation}>- {totalDamage}</span>
                  </div>
                  <div className="opacity-90" title={damageExplanation}>
                    Base <span className="font-cog">- {baseDamage}</span> | Group{' '}
                    <span className="font-cog">- {groupBonus}</span> | Lure{' '}
                    <span className="font-cog">- {lureBonus}</span> | Organic{' '}
                    <span className="font-cog">- {organicBonus}</span>
                  </div>
                  <div>
                    <span className="font-bold text-white">Max Cog Level:</span>{' '}
                    <InfoTip text={maxCogExplanation} />
                    <span className="font-cog" title={maxCogExplanation}>- {maxCogLevel}</span>
                  </div>
                  <div>
                    <span className="font-bold text-white">Accuracy:</span>{' '}
                    <span className="font-cog" title={calcSelectedGags.length ? accuracyExplanation : undefined}>
                      {calcSelectedGags.length
                        ? `${(selectionAccuracy * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                    {calcSelectedGags.length ? (
                      <>
                        <InfoTip text={accuracyExplanation} />
                        <span className="sr-only">Accuracy details</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Gag tracks list with inline allow toggles */}
              <div className="w-full rounded-md border border-slate-800 bg-slate-900/50 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-minnie text-2xl text-red-500">Gag Tracks</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={allowAllTracks}
                      className="rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-xs font-bold text-blue-100 hover:bg-blue-900"
                    >
                      Allow all
                    </button>
                    <button
                      type="button"
                      onClick={disableAllTracks}
                      className="rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-xs font-bold text-blue-100 hover:bg-blue-900"
                    >
                      Disable all
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {tracksToRender.map((track, idx) => (
                    <div
                      key={track.name}
                      className="relative"
                      style={{ zIndex: tracksToRender.length - idx }}
                    >
                      <GagTrack
                        track={track}
                        onGagSelect={handleGagSelect}
                        onGagHover={handlePaletteGagHover}
                        disabled={selectedGags.length >= maxToons}
                        excludeLevels={excludeLevels}
                        greyOutExcludedLevels={greyOutExcludedLevels}
                        highlightStrengths={paletteHighlightStrengths}
                        isTrackEnabled={enabledTracks[track.name as GagTrackName] !== false}
                        onToggleTrack={() => toggleTrack(track.name as GagTrackName)}
                        onOnlyTrack={() => onlyTrack(track.name as GagTrackName)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {effectiveTargetLevel !== null ? (
                <KillOptionsTable
                  targetLevel={effectiveTargetLevel}
                  isTargetAlreadyLured={isTargetAlreadyLured}
                  targetHpOverride={targetHpOverride}
                  currentGags={calcSelectedGags}
                  options={fillOptions}
                  isLoading={isFillLoading}
                  sortMode={sortMode}
                  onSortModeChange={handleSortModeChange}
                  sortWeights={sortWeights}
                  onSortWeightsChange={handleSortWeightsChange}
                  gagConserveWeights={gagConserveWeights}
                  onGagConserveWeightsChange={setGagConserveWeights}
                  hideOverkillAdditions={hideOverkillAdditions}
                  onHideOverkillChange={handleHideOverkillChange}
                  maxGenerated={maxGenerated}
                  onMaxGeneratedChange={handleMaxGeneratedChange}
                  onApply={applyAddedGags}
                />
              ) : (
                <div className="rounded-2xl border-2 border-blue-900/60 bg-slate-900/70 p-4 text-slate-200">
                  <div className="font-minnie text-xl text-white">Kill combos</div>
                  <div className="mt-2 text-sm text-slate-300/80">
                    Hover (preview) or click (commit) a Cog level to see one-turn kill options.
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {settingsModalOpen && (
        <SettingsJsonModal
          onClose={() => setSettingsModalOpen(false)}
          getFullJson={getFullSettingsJson}
          getWeightsJson={getWeightsJson}
          onApplyJson={applySettingsJson}
          onResetDefaults={resetDefaults}
        />
      )}
    </SfxContext.Provider>
  );
}
