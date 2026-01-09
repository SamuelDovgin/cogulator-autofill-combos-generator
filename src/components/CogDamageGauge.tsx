import clsx from 'clsx';
import { range } from 'lodash-es';
import React, { useMemo } from 'react';

import type { GagInfo } from '../types';
import {
  calculateCogHealth,
  calculateMaxCogLevel,
  calculateTotalDamage,
} from '../utils/calculatorUtils';

const MAX_COG_METER_LEVEL = 20;

export function CogDamageGauge({
  hoveredGag,
  selectedGags,
  totalDamage,
}: {
  hoveredGag: GagInfo | undefined;
  selectedGags: GagInfo[];
  totalDamage: number;
}) {
  const maxCogDefeated = useMemo(
    () => calculateMaxCogLevel(selectedGags),
    [selectedGags],
  );

  const hypotheticalGags = useMemo(
    () => (hoveredGag ? [...selectedGags, hoveredGag] : selectedGags),
    [hoveredGag, selectedGags],
  );

  const hypotheticalMaxCogDefeated = useMemo(
    () => calculateMaxCogLevel(hypotheticalGags),
    [hypotheticalGags],
  );

  const hypotheticalTotalDamage = useMemo(
    () =>
      calculateTotalDamage(hypotheticalGags, {
        level: hypotheticalMaxCogDefeated + 1,
      }).totalDamage,
    [hypotheticalGags, hypotheticalMaxCogDefeated],
  );

  const maxCogLevel = useMemo(
    () => Math.max(12, Math.min(MAX_COG_METER_LEVEL, maxCogDefeated + 5)),
    [maxCogDefeated],
  );

  const maxCogHealth = useMemo(
    () => calculateCogHealth(maxCogLevel),
    [maxCogLevel],
  );

  const barPercentage = useMemo(
    () => Math.min((totalDamage / maxCogHealth) * 99, 99),
    [maxCogHealth, totalDamage],
  );

  const hypotheticalBarPercentage = useMemo(
    () =>
      Math.min(
        hoveredGag ? (hypotheticalTotalDamage / maxCogHealth) * 99 : 0,
        100,
      ),
    [hoveredGag, hypotheticalTotalDamage, maxCogHealth],
  );

  return (
    <div className="flex min-w-sm sm:min-w-md lg:min-w-3xl items-center rounded-xl p-4 py-6 font-cog gap-2">
      <div className="relative mt-2 h-8 w-full rounded-2xl border-2 border-gray-900 bg-white shadow-2xl">
        {/* Display the total damage as a percentage fill */}
        <div
          className="absolute rounded-l-2xl rounded-r-sm bg-red-500 opacity-95"
          style={{ inset: `0px ${100 - barPercentage}% 0px 0px` }}
        >
          {/* Display the total damage */}
          {totalDamage > 0 && (
            <div
              className="absolute font-minnie text-lg font-bold "
              style={{ right: 0, bottom: -28 }}
            >
              -{totalDamage}!
            </div>
          )}
        </div>
        {/* Display the hypothetical total damage when a user is hovering a gag */}
        {hoveredGag && (
          <div
            className="absolute rounded-l-2xl rounded-r-sm bg-red-500 opacity-30"
            style={{ inset: `0px ${101 - hypotheticalBarPercentage}% 0px 0px` }}
          >
            {hypotheticalTotalDamage > 0 && (
              <div
                className="absolute font-minnie text-lg font-bold "
                style={{ right: 0, bottom: -28 }}
              >
                -{hypotheticalTotalDamage}!
              </div>
            )}
          </div>
        )}
        {/* for cogs level 1 - 20, there should be a vertical divider that overlays the bar to show where its health is on the bar */}
        {range(1, maxCogLevel + 1).map((level) => {
          const cogHealth = calculateCogHealth(level);

          return (
            <React.Fragment key={level}>
              <div
                className={clsx(
                  'absolute h-full bg-black py-2',
                  level <= maxCogDefeated && 'opacity-25',
                )}
                style={{
                  left: `calc(${(cogHealth / maxCogHealth) * 99}% - 3px)`,
                  width: 3,
                }}
              >
                {maxCogDefeated !== 0 && level > maxCogDefeated && (
                  <div className="absolute text-xs font-bold text-gray-900 right-1">
                    {cogHealth - totalDamage}
                  </div>
                )}
              </div>
              {/* Display the level above */}
              <div
                className={clsx(
                  hypotheticalMaxCogDefeated >= level
                    ? 'opacity-100'
                    : 'opacity-50',
                  level === maxCogDefeated ? 'text-3xl' : 'text-lg',
                  'absolute font-bold',
                  // (level - 1) % 2 && 'hidden',
                  'bottom-6',
                )}
                style={{
                  left: `${(cogHealth / maxCogHealth) * 99}%`,
                }}
              >
                {level}
              </div>

              {/* If the level is greater than maxCogLevel, show the remaining health */}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
