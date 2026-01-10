import clsx from 'clsx';

type Props = {
  text: string;
  className?: string;
  ariaLabel?: string;
};

/**
 * Lightweight tooltip helper.
 * Uses the native `title` attribute so we don't introduce popover deps.
 * (Newlines are supported in most browsers.)
 */
export default function InfoTip({ text, className, ariaLabel = 'Info' }: Props) {
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      title={text}
      className={clsx(
        'ml-1 inline-flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border border-slate-500/70 text-[10px] font-bold text-slate-200/80',
        className,
      )}
    >
      i
    </span>
  );
}
