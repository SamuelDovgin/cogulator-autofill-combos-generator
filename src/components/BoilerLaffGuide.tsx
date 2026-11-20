import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

// Under Pressure, one active Slow Burn tick, and Stamp of Disapproval.
// https://toontownrewritten.wiki/The_Boiler#Attacks
const boilerDamage = [
  { stars: 1, neutral: 25, firedUp: 38, burn: 10, stamp: 50 },
  { stars: 2, neutral: 30, firedUp: 45, burn: 14, stamp: 70 },
  { stars: 3, neutral: 35, firedUp: 53, burn: 18, stamp: 80 },
  { stars: 4, neutral: 40, firedUp: 60, burn: 22, stamp: 90 },
];

export function BoilerLaffGuide() {
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
        Boiler Laff Guide
      </button>
      {createPortal(
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          onClose={() => trigger.current?.focus()}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200 shadow-2xl backdrop:bg-slate-950/75 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2
              id={titleId}
              className="text-lg font-bold text-white sm:text-xl"
            >
              Boiler Laff Guide
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

          <p className="my-4 leading-relaxed">
            <strong className="text-amber-200">
              Toon-Up a teammate below the listed Laff.
            </strong>{' '}
            Each number leaves 1 Laff after Under Pressure and any active Slow
            Burn tick. Add any damage that surviving Cogs could deal to that
            Toon.
          </p>

          <table className="w-full table-fixed border-collapse text-center text-xs tabular-nums sm:text-sm">
            <caption className="sr-only">
              Minimum Laff to survive one Boiler round
            </caption>
            <colgroup span={1} />
            <colgroup span={2} />
            <colgroup span={2} />
            <thead className="bg-slate-800 text-slate-200">
              <tr>
                <th scope="col" rowSpan={2} className="w-[16%] p-1">
                  Stars
                </th>
                <th scope="colgroup" colSpan={2} className="p-1">
                  Neutral
                </th>
                <th
                  scope="colgroup"
                  colSpan={2}
                  className="bg-amber-400/15 p-1 text-amber-100"
                >
                  Fired Up
                </th>
              </tr>
              <tr>
                <th scope="col" className="p-1 font-medium">
                  Unburned
                </th>
                <th scope="col" className="p-1 font-medium">
                  Burned
                </th>
                <th scope="col" className="bg-amber-400/15 p-1 font-medium">
                  Unburned
                </th>
                <th scope="col" className="bg-amber-400/15 p-1 font-medium">
                  Burned
                </th>
              </tr>
            </thead>
            <tbody>
              {boilerDamage.map(({ stars, neutral, firedUp, burn }) => (
                <tr
                  key={stars}
                  className="border-b border-slate-700 text-slate-100"
                >
                  <th scope="row" className="p-2 font-semibold">
                    {stars}★
                  </th>
                  <td>{neutral + 1}</td>
                  <td>{neutral + burn + 1}</td>
                  <td className="bg-amber-400/5">{firedUp + 1}</td>
                  <td className="bg-amber-400/5 font-bold text-amber-200">
                    {firedUp + burn + 1}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
            <p>
              <strong className="text-white">Defensive Strategy.</strong> Allow
              for Cog damage and any active burn tick (
              {boilerDamage.map(({ burn }) => burn).join(' / ')} at 1–4★). Avoid
              hitting the Boiler. Stamp of Disapproval deals{' '}
              {boilerDamage.map(({ stamp }) => stamp).join(' / ')} damage at
              1–4★ if it survives your hit.
            </p>
            <p>
              <strong className="text-white">4★ Meltdown.</strong> Use 61 Laff
              plus the next burn tick. Meltdown burn starts at 12 damage and
              rises by 3 each round.
            </p>
            <p className="text-xs">
              <a
                href="https://toontownrewritten.wiki/The_Boiler#Attacks"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-200 underline underline-offset-2"
              >
                Boiler attack data
              </a>
            </p>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}
