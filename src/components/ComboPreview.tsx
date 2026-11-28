import type { GagInfo } from '../types';
import GagIcon from './GagIcon';

type ComboItem = { gag: GagInfo; count: number };

export function ComboPreview({ items }: { items: ComboItem[] }) {
    const expanded = items.flatMap((it) =>
        Array.from({ length: it.count }, (_, idx) => ({
            gag: it.gag,
            key: `${it.gag.name}-${idx}`,
        })),
    );

    return (
        <div className="flex w-max flex-nowrap items-center gap-1">
            {expanded.map((it, idx) => (
                <div key={`${it.key}:${idx}`} className="flex shrink-0 items-center gap-1">
                    <div className="flex h-9 w-11 shrink-0 select-none items-center justify-center rounded-2xl border-2 border-blue-500 bg-gradient-to-b from-blue-500 to-[#00b4ff] shadow-gag">
                        <GagIcon gag={it.gag} />
                    </div>
                    {idx !== expanded.length - 1 && (
                        <span className="text-lg font-bold text-yellow-800/40">+</span>
                    )}
                </div>
            ))}
        </div>
    );
}

export default ComboPreview;
