import { GAGS } from '../data/gagsInfo';
import type { GagInfo } from '../types';

export function findCanonicalGag(g: GagInfo): GagInfo | undefined {
    const entries = Object.entries(GAGS) as [string, GagInfo][];
    return entries.map(([, v]) => v).find((gg) => gg.name === g.name && gg.level === g.level && gg.track === g.track);
}

export function findCanonicalGagByKey(key: string): GagInfo | undefined {
    return (GAGS as Record<string, GagInfo>)[key];
}
