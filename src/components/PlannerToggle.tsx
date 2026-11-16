export function PlannerToggle({ active = false }: { active?: boolean }) {
  return (
    <a
      href={active ? '#calculator' : '#planner'}
      aria-label={
        active ? 'Back to Combo Calculator' : 'Open experimental Battle Planner'
      }
      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-100 no-underline transition-colors hover:border-cyan-400 hover:text-cyan-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
    >
      <span aria-hidden="true">{active ? '←' : '⇄'}</span>
      {active ? 'Calculator' : 'Battle Planner'}
    </a>
  );
}
