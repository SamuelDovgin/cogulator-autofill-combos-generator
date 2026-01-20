import { range } from 'lodash-es';
import { useMemo } from 'react';

import type { GagInfo } from '../types';
import { calculateTotalDamage } from '../utils/calculatorUtils';
import { Cog } from './Cog';

export function CogDamageTable({
  selectedGags,
  hoveredGag,
  onLevelClick,
  onLevelHover,
  activeLevel,
  isTargetAlreadyLured = false,
}: {
  selectedGags: GagInfo[];
  hoveredGag: GagInfo | undefined;
  onLevelClick?: (level: number) => void;
  onLevelHover?: (level: number | undefined) => void;
  activeLevel?: number | null;
  isTargetAlreadyLured?: boolean;
}) {
  const hypotheticalGags = useMemo(
    () => hoveredGag && [...selectedGags, hoveredGag],
    [hoveredGag, selectedGags],
  );

  return (
    <div className="flex flex-wrap justify-center gap-2 bg-blue-900 p-4 rounded-md min-w-[300px]">
      {range(0, 20).map((i) => (
        <Cog
          damage={
            calculateTotalDamage(selectedGags, {
              level: i + 1,
              lured: isTargetAlreadyLured,
            }).totalDamage
          }
          hypotheticalDamage={
            hypotheticalGags &&
            calculateTotalDamage(hypotheticalGags, {
              level: i + 1,
              lured: isTargetAlreadyLured,
            }).totalDamage
          }
          key={i}
          level={i + 1}
          isActive={activeLevel === i + 1}
          onClick={onLevelClick ? () => onLevelClick(i + 1) : undefined}
          onMouseEnter={
            onLevelHover ? () => onLevelHover(i + 1) : undefined
          }
          onMouseLeave={
            onLevelHover ? () => onLevelHover(undefined) : undefined
          }
        />
      ))}
    </div>
  );
}
