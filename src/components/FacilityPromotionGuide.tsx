import { useId, useRef } from 'react';
import { GuideDialog } from './GuideDialog';

interface Supervisor {
  name: string;
  source: string;
  tips: { action: string; detail: string }[];
}

const facilities = [
  {
    name: 'Sellbot Factory',
    reward: 'Merits',
    source: 'https://toontownrewritten.wiki/Sellbot_Factory#Merits',
    supervisor: {
      name: 'Factory Foreman',
      source: 'https://toontownrewritten.wiki/The_Factory_Foreman',
      tips: [
        {
          action: 'Handle the side Cogs first.',
          detail:
            'Save Sound for the Steel opener if your group plans to use it. You can also Lure and pick off the side Cogs.',
        },
        {
          action: 'Finish him quickly below half health.',
          detail:
            'Overtime makes him hit harder. In Steel, his Burnout can also damage the whole group over several rounds.',
        },
      ],
    },
    runs: [
      { name: 'Short Scrap', payout: [350, 356], minutes: 7 },
      { name: 'Long Scrap', payout: [596, 638], minutes: 12 },
      { name: 'Short Steel', payout: [867, 950], minutes: 10 },
      { name: 'Long Steel', payout: [1525, 1630], minutes: 18 },
    ],
  },
  {
    name: 'Cashbot Mints',
    reward: 'Cogbucks',
    source: 'https://toontownrewritten.wiki/Cashbot_Mints#Cogbucks',
    supervisor: {
      name: 'Mint Auditor',
      source: 'https://toontownrewritten.wiki/The_Mint_Auditor',
      tips: [
        {
          action: 'Lure and take out the lowest-level Cog.',
          detail:
            'Target the level 9 in Coin or the level 11 in Bullion. The first knockout ends the double gag cost.',
        },
        {
          action: 'Focus the Auditor next.',
          detail:
            'Bull Market boosts damage on both sides. Use it to finish the Auditor before he wakes or promotes the other Cogs.',
        },
      ],
    },
    runs: [
      { name: 'Coin Mint', payout: [702, 807], minutes: 12 },
      { name: 'Bullion Mint', payout: [1626, 1850], minutes: 16 },
    ],
  },
  {
    name: 'Lawbot DA Offices',
    reward: 'Jury Notices',
    source: 'https://toontownrewritten.wiki/Lawbot_DA_Offices#Jury_Notices',
    supervisor: {
      name: 'Office Clerk',
      source: 'https://toontownrewritten.wiki/The_Office_Clerk',
      tips: [
        {
          action: 'Lure the side Cogs and hit the Clerk.',
          detail:
            'Use Throw or Squirt while Silence is active. She retaliates against Sound, especially in Senior Wing.',
        },
        {
          action: 'Defeat one side Cog to break Witness Protection.',
          detail:
            'She can make herself immune below half health. Once a side Cog goes down, resume hitting the Clerk.',
        },
      ],
    },
    runs: [
      { name: 'Junior Wing', payout: [781, 889], minutes: 14 },
      { name: 'Senior Wing', payout: [1854, 2082], minutes: 20 },
    ],
  },
  {
    name: 'Bossbot Golf Courses',
    reward: 'Stock Options',
    source: 'https://toontownrewritten.wiki/Bossbot_Golf_Courses#Stock_Options',
    supervisor: {
      name: 'Club President',
      source: 'https://toontownrewritten.wiki/The_Club_President',
      tips: [
        {
          action: 'Clear the starting Cogs early.',
          detail:
            'Each one defeated weakens her big hit after round five. Try to bring her down before that hit lands.',
        },
        {
          action: 'Save strong gags for phase two.',
          detail:
            'When her health reaches zero, finish the remaining Cogs and the Version 2.0 reinforcements.',
        },
      ],
    },
    runs: [
      { name: 'First Fairway', payout: [882, 975], minutes: 14 },
      { name: 'Final Fringe', payout: [2097, 2305], minutes: 20 },
    ],
  },
];

const formatPoints = new Intl.NumberFormat('en-US').format;

function SupervisorTips({ supervisor }: { supervisor: Supervisor }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const preview = useRef(false);

  return (
    <div
      onPointerLeave={() => {
        if (preview.current) panel.current?.hidePopover();
      }}
    >
      <button
        type="button"
        popoverTarget={id}
        aria-label={`Boss tips for the ${supervisor.name}`}
        onPointerEnter={({ pointerType, currentTarget }) => {
          if (
            pointerType !== 'mouse' ||
            panel.current?.matches(':popover-open')
          )
            return;
          currentTarget.click();
          preview.current = panel.current?.matches(':popover-open') ?? false;
        }}
        onClick={(event) => {
          if (!preview.current) return;
          event.preventDefault();
          preview.current = false;
        }}
        className="min-h-7 rounded-md border border-amber-400/35 bg-amber-400/10 px-2 text-xs font-semibold whitespace-nowrap text-amber-100 hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        Boss tips
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        onBeforeToggle={(event) => {
          if (event.newState === 'closed') preview.current = false;
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(18rem,calc(100vw-5rem))] justify-self-end overflow-y-auto rounded-xl border border-amber-400/35 bg-slate-900 p-3 text-xs leading-relaxed text-slate-200 shadow-2xl [position-area:block-end_span-inline-start] [position-try-fallbacks:flip-block] supports-[position-area:block-end]:inset-auto supports-[position-area:block-end]:m-0"
      >
        <h4 className="text-sm font-bold text-amber-100">{supervisor.name}</h4>
        <ul className="my-2 list-disc space-y-2 pl-4 marker:text-amber-300">
          {supervisor.tips.map(({ action, detail }) => (
            <li key={action}>
              <strong className="text-white">{action}</strong> {detail}
            </li>
          ))}
        </ul>
        <a
          href={supervisor.source}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-200 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          Fight mechanics
        </a>
      </div>
    </div>
  );
}

export function FacilityPromotionGuide() {
  return (
    <GuideDialog title="Facility Promotion Guide" widthClassName="max-w-xl">
      <p className="my-4 text-slate-300">
        Payouts vary with Cog levels. Per-minute estimates use the midpoint of
        each payout range and assume an efficient group, timed inside the
        facility.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {facilities.map(({ name, reward, source, supervisor, runs }) => (
          <section
            key={name}
            className="rounded-xl border border-slate-700 bg-slate-800/45 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-white">
                <a
                  href={source}
                  target="_blank"
                  rel="noreferrer"
                  title={`${reward} payouts on the Toontown Rewritten Wiki`}
                  className="underline decoration-slate-500 underline-offset-2 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  {name}
                </a>
              </h3>
              <SupervisorTips supervisor={supervisor} />
            </div>
            <table className="mt-2 w-full text-sm">
              <caption className="sr-only">{reward} by route</caption>
              <thead className="text-xs text-slate-300">
                <tr>
                  <th scope="col" className="pb-1 text-left font-medium">
                    Run
                  </th>
                  <th
                    scope="col"
                    className="pb-1 pl-2 text-right font-medium whitespace-nowrap"
                  >
                    Per run
                  </th>
                  <th
                    scope="col"
                    className="pb-1 pl-2 text-right font-medium whitespace-nowrap"
                  >
                    Per min
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map(({ name: run, payout: [low, high], minutes }) => (
                  <tr key={run} className="border-t border-slate-700">
                    <th scope="row" className="py-1 text-left font-normal">
                      {run}
                    </th>
                    <td className="py-1 pl-2 text-right font-semibold whitespace-nowrap text-amber-200 tabular-nums">
                      {formatPoints(low)}–{formatPoints(high)}
                    </td>
                    <td
                      className="py-1 pl-2 text-right"
                      title={`Assumes a ${minutes}-minute run`}
                    >
                      <span className="rounded bg-cyan-300/10 px-1.5 py-0.5 font-semibold text-cyan-200 tabular-nums">
                        {Math.round((low + high) / (2 * minutes))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-300">
        Short factory routes take the Gear Room and skip the west-side battles.
        Long routes clear every battle.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        <strong className="text-white">First run?</strong> Tell the group before
        the boss so someone can call the opening gags.
      </p>
    </GuideDialog>
  );
}
