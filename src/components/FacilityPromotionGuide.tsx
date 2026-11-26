import { GuideDialog } from './GuideDialog';

const facilities = [
  {
    name: 'Sellbot Factory',
    reward: 'Merits',
    source: 'https://toontownrewritten.wiki/Sellbot_Factory#Merits',
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
    runs: [
      { name: 'Coin Mint', payout: [702, 807], minutes: 12 },
      { name: 'Bullion Mint', payout: [1626, 1850], minutes: 16 },
    ],
  },
  {
    name: 'Lawbot DA Offices',
    reward: 'Jury Notices',
    source: 'https://toontownrewritten.wiki/Lawbot_DA_Offices#Jury_Notices',
    runs: [
      { name: 'Junior Wing', payout: [781, 889], minutes: 14 },
      { name: 'Senior Wing', payout: [1854, 2082], minutes: 20 },
    ],
  },
  {
    name: 'Bossbot Golf Courses',
    reward: 'Stock Options',
    source: 'https://toontownrewritten.wiki/Bossbot_Golf_Courses#Stock_Options',
    runs: [
      { name: 'First Fairway', payout: [882, 975], minutes: 14 },
      { name: 'Final Fringe', payout: [2097, 2305], minutes: 20 },
    ],
  },
];

const formatPoints = new Intl.NumberFormat('en-US').format;

export function FacilityPromotionGuide() {
  return (
    <GuideDialog title="Facility Promotion Guide" widthClassName="max-w-xl">
      <p className="my-4 text-slate-300">
        Payouts vary with Cog levels. Per-minute estimates use the midpoint of
        each payout range and assume an efficient group, timed inside the
        facility.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {facilities.map(({ name, reward, source, runs }) => (
          <section
            key={name}
            className="rounded-xl border border-slate-700 bg-slate-800/45 p-3"
          >
            <h3 className="font-bold text-white">{name}</h3>
            <a
              href={source}
              target="_blank"
              rel="noreferrer"
              aria-label={`${reward} payout source for ${name}`}
              className="text-xs text-cyan-200 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              {reward}
            </a>
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
    </GuideDialog>
  );
}
