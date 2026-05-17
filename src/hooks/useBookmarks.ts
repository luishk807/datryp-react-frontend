import { useCallback, useEffect, useState } from 'react';
import type { PlaceRecommendation } from 'types';

const STORAGE_KEY = 'datryp:bookmarks';
const STORAGE_EVENT = 'datryp:bookmarks:changed';

export type BookmarkKind = 'place' | 'country';

export interface Bookmark {
    /** Discriminator. Entries persisted before this field existed are
     *  implicitly treated as 'place'. */
    kind?: BookmarkKind;
    /** Place identity: search query + index in cached results. Empty/0 for
     *  country bookmarks. */
    query: string;
    index: number;
    /** Country identity: ISO 3166-1 alpha-2. Only set when kind === 'country'. */
    code?: string;
    /** Snapshot of display fields so the bookmarks list can render without
     *  re-hitting the recommender. */
    name: string;
    city: string;
    country: string;
    imageUrl: string | null;
    savedAt: number;
}

export interface CountryBookmarkPayload {
    code: string;
    name: string;
    imageUrl: string | null;
}

const readAll = (): Bookmark[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as Bookmark[]) : [];
    } catch {
        return [];
    }
};

const writeAll = (next: Bookmark[]): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Notify same-tab subscribers; the `storage` event only fires across tabs.
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
};

const placeKey = (query: string, index: number) =>
    `place::${query.trim().toLowerCase()}::${index}`;

const countryKey = (code: string) => `country::${code.trim().toLowerCase()}`;

/** Stable identity for a bookmark — discriminates place vs country so a
 *  search query like "fr" can't collide with the France bookmark. */
const keyOf = (b: Bookmark): string =>
    (b.kind ?? 'place') === 'country'
        ? countryKey(b.code ?? '')
        : placeKey(b.query, b.index);

/** localStorage-backed bookmarks (no backend yet). Re-renders all subscribers
 *  in the same tab via a `datryp:bookmarks:changed` custom event, and across
 *  tabs via the native `storage` event. */
export const useBookmarks = () => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(readAll);

    useEffect(() => {
        const refresh = () => setBookmarks(readAll());
        window.addEventListener('storage', refresh);
        window.addEventListener(STORAGE_EVENT, refresh);
        return () => {
            window.removeEventListener('storage', refresh);
            window.removeEventListener(STORAGE_EVENT, refresh);
        };
    }, []);

    const isBookmarked = useCallback(
        (query: string, index: number): boolean => {
            const k = placeKey(query, index);
            return bookmarks.some((b) => keyOf(b) === k);
        },
        [bookmarks]
    );

    const isCountryBookmarked = useCallback(
        (code: string): boolean => {
            const k = countryKey(code);
            return bookmarks.some((b) => keyOf(b) === k);
        },
        [bookmarks]
    );

    const add = useCallback(
        (place: PlaceRecommendation, query: string, index: number) => {
            const current = readAll();
            const k = placeKey(query, index);
            if (current.some((b) => keyOf(b) === k)) return;
            writeAll([
                {
                    kind: 'place',
                    query,
                    index,
                    name: place.name,
                    city: place.city,
                    country: place.country,
                    imageUrl: place.imageUrl,
                    savedAt: Date.now(),
                },
                ...current,
            ]);
        },
        []
    );

    const remove = useCallback((query: string, index: number) => {
        const k = placeKey(query, index);
        writeAll(readAll().filter((b) => keyOf(b) !== k));
    }, []);

    const toggle = useCallback(
        (place: PlaceRecommendation, query: string, index: number): boolean => {
            const k = placeKey(query, index);
            const current = readAll();
            const existing = current.some((b) => keyOf(b) === k);
            if (existing) {
                remove(query, index);
                return false;
            }
            add(place, query, index);
            return true;
        },
        [add, remove]
    );

    const addCountry = useCallback((payload: CountryBookmarkPayload) => {
        const code = payload.code.trim().toUpperCase();
        if (!code) return;
        const current = readAll();
        const k = countryKey(code);
        if (current.some((b) => keyOf(b) === k)) return;
        writeAll([
            {
                kind: 'country',
                code,
                // Place-side fields filled with empty/zero so older readers
                // that ignore `kind` don't crash on missing properties.
                query: '',
                index: 0,
                name: payload.name,
                city: '',
                country: payload.name,
                imageUrl: payload.imageUrl,
                savedAt: Date.now(),
            },
            ...current,
        ]);
    }, []);

    const removeCountry = useCallback((code: string) => {
        const k = countryKey(code);
        writeAll(readAll().filter((b) => keyOf(b) !== k));
    }, []);

    const toggleCountry = useCallback(
        (payload: CountryBookmarkPayload): boolean => {
            const code = payload.code.trim().toUpperCase();
            const k = countryKey(code);
            const current = readAll();
            const existing = current.some((b) => keyOf(b) === k);
            if (existing) {
                removeCountry(code);
                return false;
            }
            addCountry(payload);
            return true;
        },
        [addCountry, removeCountry]
    );

    return {
        bookmarks,
        isBookmarked,
        isCountryBookmarked,
        add,
        remove,
        toggle,
        addCountry,
        removeCountry,
        toggleCountry,
    };
};
