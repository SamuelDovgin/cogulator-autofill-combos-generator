import React from 'react';
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
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap">
            {expanded.map((it, idx) => (
                <div key={`${it.key}:${idx}`} className="flex items-center gap-2">
                    <div className="flex h-10 w-12 shrink-0 select-none items-center justify-center rounded-2xl border-2 border-blue-500 bg-gradient-to-b from-blue-500 to-[#00b4ff] px-2 pb-1 shadow-gag">
                        <GagIcon gag={it.gag} />
                    </div>
                    {idx !== expanded.length - 1 && (
                        <span className="text-yellow-800/40 text-xl font-bold">+</span>
                    )}
                </div>
            ))}
        </div>
    );
}

export default ComboPreview;
