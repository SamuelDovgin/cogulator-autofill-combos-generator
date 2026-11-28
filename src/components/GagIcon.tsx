import type { GagInfo } from '../types';
import { GAGS } from '../data/gagsInfo';
import organicLeaf from '../../assets/organic_leaf.webp';
import { describeOrganicGag } from '../utils/calculatorUtils';

export function GagIcon({ gag, className = '' }: { gag: GagInfo; className?: string }) {
    // Try to find the canonical gag entry to get the original image path
    const key = Object.keys(GAGS).find((k) => {
        const gg = (GAGS as Record<string, GagInfo>)[k];
        return gg.name === gag.name && gg.level === gag.level && gg.track === gag.track;
    });

    const canonical = key ? (GAGS as Record<string, GagInfo>)[key] : gag;

    return (
        <div className={`relative inline-flex items-center ${className}`} title={gag.isOrganic ? describeOrganicGag(gag) : undefined}>
            <img
                alt={gag.isOrganic ? `Organic ${canonical.name}` : canonical.name}
                draggable={false}
                className="size-7 object-contain drop-shadow-[1px_1px_1px_black]"
                src={canonical.image}
            />
            {gag.isOrganic && (
                <img
                    alt=""
                    className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-950 object-contain"
                    draggable={false}
                    src={organicLeaf}
                />
            )}
        </div>
    );
}

export default GagIcon;
