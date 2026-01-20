import clsx from 'clsx';
import React, { useMemo } from 'react';

import XIcon from '../../assets/icons/x-circle.svg?react';
import { GagTracks } from '../data/gagTracksInfo';
import { GAGS } from '../data/gagsInfo';
import type { GagInstance } from '../types';
import Gag from './Gag';
import { groupBy } from 'lodash-es';

interface Props {
  selectedGags: GagInstance[];
  isTargetAlreadyLured?: boolean;
  onAlreadyLuredChange?: (next: boolean) => void;
  onSelectionChanged: (gags: GagInstance[]) => void;
  totalDamage: number;
  onGagHover: (gag: GagInstance | undefined) => void;
}

export default function CalculationDisplay({
  selectedGags,
  isTargetAlreadyLured = false,
  onAlreadyLuredChange,
  onSelectionChanged,
  totalDamage,
  onGagHover,
}: Props) {
  const orderedGroupedGags = useMemo(() => {
    const orderedGags = [...selectedGags].sort((a, b) => {
      if (a.track === b.track) return a.level - b.level;
      const orderA = GagTracks.find((t) => t.name === a.track)?.order ?? 0;
      const orderB = GagTracks.find((t) => t.name === b.track)?.order ?? 0;
      return orderA - orderB;
    });
    return groupBy(orderedGags, (gag) => gag.track);
  }, [selectedGags]);

  const renderGags = () => {
    if (selectedGags.length === 0) {
      if (!isTargetAlreadyLured) {
        return (
          <span className="flex-1 text-center text-xl text-yellow-800/40 lg:text-2xl">
            No gags selected
          </span>
        );
      }

      const luredGag: GagInstance = { ...(GAGS as any).BigMagnet, id: 'LURED_STATE', isPreview: true };
      return (
        <>
          <span className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl">(</span>
          <Gag
            className="opacity-70"
            disabled
            disabledVariant="soft"
            gag={luredGag}
            onGagClick={() => onAlreadyLuredChange?.(false)}
            onMouseOver={() => { }}
            onMouseLeave={() => { }}
          />
          <span className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl">)</span>
          <span className="ml-2 text-yellow-800/40 text-xl hidden lg:block lg:text-2xl">
            No gags selected
          </span>
        </>
      );
    }

    const onlyOneType = Object.keys(orderedGroupedGags).length === 1;

    return Object.values(orderedGroupedGags).map(
      (group, groupIdx) => {
        const elements: React.ReactNode[] = [];
        const groupKey = group.map((g) => g.id).join('-');

        if (isTargetAlreadyLured && groupIdx === 0) {
          const luredGag: GagInstance = { ...(GAGS as any).BigMagnet, id: 'LURED_STATE', isPreview: true };
          elements.push(
            <span
              key="lured-open"
              className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl"
            >
              (
            </span>,
          );
          elements.push(
            <Gag
              key="lured-gag"
              className="opacity-70"
              disabled
              disabledVariant="soft"
              gag={luredGag}
              onGagClick={() => onAlreadyLuredChange?.(false)}
              onMouseOver={() => { }}
              onMouseLeave={() => { }}
            />,
          );
          elements.push(
            <span
              key="lured-close"
              className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl"
            >
              )
            </span>,
          );
        }

        if (groupIdx > 0 || isTargetAlreadyLured) {
          elements.push(
            <span
              key={`plus-${groupKey}`}
              className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl"
            >
              +
            </span>,
          );
        }

        if (group.length > 1 && !onlyOneType) {
          elements.push(
            <span
              key={`open-${groupKey}`}
              className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl"
            >
              (
            </span>,
          );
        }

        group.forEach((gag, i) => {
          const isPreview = !!gag.isPreview;
          const isDuplicateTrap = i > 0 && gag.track === 'Trap' && group[i - 1].track === 'Trap';
          const isInactiveInLuredRound = isTargetAlreadyLured && (gag.track === 'Trap' || gag.track === 'Lure');

          const allowSoftDisable = !isPreview && (isDuplicateTrap || isInactiveInLuredRound);

          if (i > 0) {
            elements.push(
              <span
                key={`plus-inner-${i}-${gag.id}`}
                className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl"
              >
                +
              </span>,
            );
          }

          elements.push(
            <Gag
              key={gag.id}
              className={clsx(
                isPreview && 'opacity-60',
                isTargetAlreadyLured && (gag.track === 'Lure' || gag.track === 'Trap') && 'opacity-70',
              )}
              disabled={
                isPreview ||
                (!isPreview &&
                  ((isTargetAlreadyLured && (gag.track === 'Lure' || gag.track === 'Trap')) ||
                    (i > 0 && gag.track === 'Trap' && group[i - 1].track === 'Trap')))
              }
              disabledVariant={
                !isPreview &&
                  ((isTargetAlreadyLured && (gag.track === 'Lure' || gag.track === 'Trap')) ||
                    (i > 0 && gag.track === 'Trap' && group[i - 1].track === 'Trap'))
                  ? 'soft'
                  : undefined
              }
              gag={gag}
              onGagClick={() => {
                if (isPreview) return;
                onSelectionChanged(selectedGags.filter(({ id }) => id !== gag.id));
                onGagHover(undefined);
              }}
              onMouseOver={() => onGagHover(gag)}
              onMouseLeave={() => onGagHover(undefined)}
            />,
          );
        });

        if (group.length > 1 && !onlyOneType) {
          elements.push(
            <span
              key={`close-${groupKey}`}
              className="text-yellow-800/40 text-xl hidden lg:block lg:text-2xl"
            >
              )
            </span>,
          );
        }

        return elements;
      },
    );
  };

  return (
    <div className="bg-toon-paper m-4 mb-0 flex lg:h-16 h-12 flex-row items-center rounded-xl bg-white p-2 shadow-inner">
      <div className="flex flex-1 select-none flex-row items-center justify-start gap-1 overflow-x-auto whitespace-nowrap flex-nowrap p-4 md:gap-2">
        {renderGags()}
      </div>

      {selectedGags.length > 0 && (
        <div className="flex flex-row items-center justify-end gap-2">
          <div className="text-right text-2xl text-yellow-800/40 sm:text-4xl">
            = {totalDamage}
          </div>
        </div>
      )}

      <button
        className="cursor-pointer"
        type="button"
        onClick={() => {
          onSelectionChanged([]);
          onAlreadyLuredChange?.(false);
        }}
      >
        <XIcon
          className={clsx(
            'h-8 w-8 text-red-500 ml-2',
            selectedGags.length === 0 && !isTargetAlreadyLured && 'opacity-50',
          )}
        />
      </button>
    </div>
  );
}
