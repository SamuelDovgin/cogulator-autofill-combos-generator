import clsx from 'clsx';
import React, { useMemo } from 'react';

import { calculateCogHealth } from '../utils/calculatorUtils';

interface Props {
  level: number;
  damage?: number;
  hypotheticalDamage?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isActive?: boolean;
}

export const Cog = ({
  level,
  damage = 0,
  hypotheticalDamage,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isActive,
}: Props) => {
  const hp = useMemo(() => calculateCogHealth(level), [level]);

  const remainingHp = useMemo(() => Math.max(0, hp - damage), [hp, damage]);

  const remainingHypotheticalHp = useMemo(
    () =>
      hypotheticalDamage !== undefined
        ? Math.max(0, hp - hypotheticalDamage)
        : undefined,
    [hp, hypotheticalDamage],
  );

  const getBackgroundColor = () => {
    if (hypotheticalDamage !== undefined) {
      if (remainingHypotheticalHp === 0) return 'bg-green-900';
      if (hypotheticalDamage === 0) return 'bg-gray-400';
      return 'bg-yellow-800';
    }

    if (remainingHp === 0) return 'bg-green-900';
    if (damage === 0) return 'bg-gray-400';
    return 'bg-red-800';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={clsx(
        'flex w-8 md:w-10 flex-col items-center font-cog text-sm md:text-xl outline-double',
        getBackgroundColor(),
        onClick && 'cursor-pointer hover:brightness-110 active:brightness-90',
        isActive && 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-blue-900',
      )}
    >
      <div>
        <span className="text-sm md:text-lg font-bold">{level}</span>
      </div>
      <div className="text-xs md:text-sm">
        {hypotheticalDamage === 0
          ? remainingHp
          : (remainingHypotheticalHp ?? remainingHp)}
      </div>
    </button>
  );
};
