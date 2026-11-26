import { type ReactNode, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export function GuideDialog({
  title,
  children,
  widthClassName = 'max-w-lg',
}: {
  title: string;
  children: ReactNode;
  widthClassName?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex min-h-8 items-center rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        {title}
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          onClose={() => trigger.current?.focus()}
          className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200 shadow-2xl backdrop:bg-slate-950/75 sm:p-6 ${widthClassName}`}
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id={titleId}
              className="text-lg font-bold text-white sm:text-xl"
            >
              {title}
            </h2>
            <form method="dialog">
              <button
                type="submit"
                className="rounded-md border border-slate-600 px-2.5 py-1 text-sm hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                Close
              </button>
            </form>
          </div>
          {children}
        </dialog>,
        document.body,
      )}
    </>
  );
}
