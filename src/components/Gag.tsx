import clsx from 'clsx';
import type * as React from 'react';

import leaf from '../../assets/organic_leaf.webp';
import type { GagInfo } from '../types';

interface Props {
  disabled?: boolean;
  /**
   * Controls how "disabled" gags render.
   * - full: very muted (used for track disabled / no slots left)
   * - soft: slightly muted (used for excluded levels toggles)
   */
  disabledVariant?: 'full' | 'soft';
  /**
   * Optional highlight strength from 0..1.
   *  - 1.0 = brightest orange (best)
   *  - 0.0 = muted dark orange (worst)
   */
  highlightStrength?: number;
  gag: GagInfo;
  onGagHover?: (isOrganic: boolean) => void;
  onGagClick?: (isOrganic: boolean) => void;
}

export default function Gag({
  gag,
  disabled,
  disabledVariant,
  highlightStrength,
  onGagHover,
  onGagClick,
  ...props
}: Props & React.HTMLProps<HTMLDivElement>) {
  // IMPORTANT: many call sites pass a (possibly empty) className.
  // If we spread props *after* our internal className, React will use the
  // later (spread) className and wipe our gag tile styling.
  const {
    className,
    onMouseEnter,
    onPointerEnter,
    onFocus,
    ...rest
  } = props;
  const resolvedDisabledVariant: 'full' | 'soft' = disabledVariant ?? 'full';
  const interactionBlocked = Boolean(disabled && resolvedDisabledVariant === 'full');

  const handleClick = (isOrganic: boolean) => {
    // "soft" disabled is visual-only: still clickable (user may be testing excluded levels).
    if (interactionBlocked) return;
    onGagClick?.(isOrganic);
  };

  // Highlight background based on strength (0..1). This is computed in App from
  // the current ranked kill-combo list and provides a smooth gradient over many candidates.
  const clampedStrength =
    highlightStrength === undefined
      ? undefined
      : Math.max(0, Math.min(1, Number.isFinite(highlightStrength) ? highlightStrength : 0));
  const highlightStyle =
    clampedStrength === undefined
      ? undefined
      : {
          // Worst should still be visible, but muted.
          // Map 0..1 -> alpha 0.22..0.92
          backgroundImage: `linear-gradient(to bottom, rgba(251, 146, 60, ${0.22 + 0.7 * clampedStrength}), rgba(234, 88, 12, ${0.22 + 0.7 * clampedStrength}))`,
          borderColor: `rgba(234, 88, 12, ${0.25 + 0.55 * clampedStrength})`,
        } as React.CSSProperties;

  const disabledClasses = disabled
    ? resolvedDisabledVariant === 'soft'
      ? clampedStrength !== undefined
        ? 'cursor-pointer opacity-80 saturate-100'
        : 'cursor-pointer opacity-70 saturate-50'
      : 'cursor-not-allowed opacity-50 grayscale'
    : 'cursor-pointer';

  return (
    <div
      className={clsx(
        disabledClasses,
        `group relative z-10 hover:z-[100] focus:z-[100] flex h-auto w-14 shrink-0 select-none items-center justify-center
         rounded-2xl border-2 border-blue-500
         bg-linear-to-b from-blue-500 to-[#00b4ff]
         px-2 pb-1 text-white shadow-gag
         hover:shadow-xl hover:brightness-110 focus:brightness-110 active:brightness-75
         md:w-16 lg:w-20`,
        'overflow-visible',
        className,
      )}
      style={highlightStyle}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        if (interactionBlocked) return;
        // Default hover preview is the non-organic version.
        onGagHover?.(false);
      }}
      onPointerEnter={(e) => {
        onPointerEnter?.(e);
        if (interactionBlocked) return;
        onGagHover?.(false);
      }}
      onFocus={(e) => {
        onFocus?.(e);
        if (interactionBlocked) return;
        onGagHover?.(false);
      }}
      onClick={() => handleClick(false)}
      onKeyDown={() => {}}
      // biome-ignore lint/a11y/useSemanticElements: Button adds extra bad stuff
      role="button"
      tabIndex={0}
      {...rest}
    >
      {gag.isOrganic !== false && (
        <div
          className={clsx(
            'absolute right-[-10px] top-[-13px] z-50 h-[25px] w-[25px] grayscale hover:grayscale-0 group-hover:block',
            gag.isOrganic && 'grayscale-0',
            !gag.isOrganic && 'hidden',
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(true);
          }}
          onKeyDown={() => {}}
          // biome-ignore lint/a11y/useSemanticElements: Don't wanna
          role="button"
          tabIndex={0}
        >
          {/* Green Circle behind Organic Leaf */}
          <div className="pointer-events-none absolute h-[25px] w-[25px] rounded-full bg-green-800 drop-shadow-[1px_1px_1px_black]" />
          {/* Organic Leaf icon */}
          <img
            alt={gag.name}
            className="pointer-events-none absolute right-[-4px] top-[-4px] z-50 aspect-square overflow-hidden drop-shadow-[1px_1px_1px_black]"
            height={30}
            src={leaf}
            width={30}
          />
        </div>
      )}
      <img
        alt={gag.name}
        className="min-w-0 max-w-[65%] object-scale-down"
        draggable={false}
        src={gag.image}
      />
    </div>
  );
}
