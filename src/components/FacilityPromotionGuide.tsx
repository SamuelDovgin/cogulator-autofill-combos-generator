import { GuideDialog } from './GuideDialog';

const facilities = [
  {
    name: 'Sellbot Factory',
    reward: 'Merits',
    source: 'https://toontownrewritten.wiki/Sellbot_Factory#Merits',
    runs: [
      { name: 'Short Scrap', payout: '350–356' },
      { name: 'Long Scrap', payout: '596–638' },
      { name: 'Short Steel', payout: '867–950' },
      { name: 'Long Steel', payout: '1,525–1,630' },
    ],
  },
  {
    name: 'Cashbot Mints',
    reward: 'Cogbucks',
    source: 'https://toontownrewritten.wiki/Cashbot_Mints#Cogbucks',
    runs: [
      { name: 'Coin Mint', payout: '702–807' },
      { name: 'Bullion Mint', payout: '1,626–1,850' },
    ],
  },
  {
    name: 'Lawbot DA Offices',
    reward: 'Jury Notices',
    source: 'https://toontownrewritten.wiki/Lawbot_DA_Offices#Jury_Notices',
    runs: [
      { name: 'Junior Wing', payout: '781–889' },
      { name: 'Senior Wing', payout: '1,854–2,082' },
    ],
  },
  {
    name: 'Bossbot Golf Courses',
    reward: 'Stock Options',
    source: 'https://toontownrewritten.wiki/Bossbot_Golf_Courses#Stock_Options',
    runs: [
      { name: 'First Fairway', payout: '882–975' },
      { name: 'Final Fringe', payout: '2,097–2,305' },
    ],
  },
];

export function FacilityPromotionGuide() {
  return (
    <GuideDialog title="Facility Promotion Guide">
      <p className="my-4 text-slate-300">
        Estimated points per completed run in Toontown Rewritten. Payouts vary
        with Cog levels.
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
            <dl className="mt-2 divide-y divide-slate-700 border-t border-slate-700">
              {runs.map((run) => (
                <div
                  key={run.name}
                  className="flex justify-between gap-2 py-1 text-sm"
                >
                  <dt>{run.name}</dt>
                  <dd className="shrink-0 font-semibold whitespace-nowrap text-amber-200 tabular-nums">
                    {run.payout}
                  </dd>
                </div>
              ))}
            </dl>
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
