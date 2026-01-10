import React from 'react';
import type { GagInfo } from '../types';
import { GAGS } from '../data/gagsInfo';

export function GagIcon({ gag, className = '' }: { gag: GagInfo; className?: string }) {
    // Try to find the canonical gag entry to get the original image path
    const key = Object.keys(GAGS).find((k) => {
        const gg = (GAGS as Record<string, GagInfo>)[k];
        return gg.name === gag.name && gg.level === gag.level && gg.track === gag.track;
    });

    const canonical = key ? (GAGS as Record<string, GagInfo>)[key] : gag;

    return (
        <div className={`inline-flex items-center ${className}`}>
            <img
                alt={canonical.name}
                draggable={false}
                className="h-10 w-10 object-contain drop-shadow-[1px_1px_1px_black]"
                src={canonical.image}
            />
        </div>
    );
}

export default GagIcon;
