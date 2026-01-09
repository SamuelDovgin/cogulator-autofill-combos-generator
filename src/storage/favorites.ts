export type FavoriteCombo = {
    id: string;
    addedGags: any[]; // storing gag objects (canonicalized)
    toons: number;
    total: number;
    over: number;
    maxCogLevel: number;
    createdAt: number;
};

const LS_KEY = 'bbt:favCombos:v1';

function readAll(): Record<string, FavoriteCombo[]> {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? (JSON.parse(raw) as Record<string, FavoriteCombo[]>) : {};
    } catch {
        return {};
    }
}

function writeAll(v: Record<string, FavoriteCombo[]>) {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(v));
    } catch {
        // ignore
    }
}

export function loadFavoritesForKey(key: string): FavoriteCombo[] {
    const all = readAll();
    return all[key] ?? [];
}

export function saveFavoritesForKey(key: string, favs: FavoriteCombo[]) {
    const all = readAll();
    all[key] = favs;
    writeAll(all);
}

export function toggleFavoriteForKey(key: string, fav: FavoriteCombo) {
    const all = readAll();
    const list = all[key] ?? [];
    const idx = list.findIndex((f) => f.id === fav.id);
    if (idx >= 0) {
        list.splice(idx, 1);
    } else {
        list.unshift(fav);
    }
    all[key] = list;
    writeAll(all);
    return list;
}
