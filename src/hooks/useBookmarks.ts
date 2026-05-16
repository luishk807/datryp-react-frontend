import { useCallback, useEffect, useState } from 'react';
import type { PlaceRecommendation } from 'types';

const STORAGE_KEY = 'datryp:bookmarks';
const STORAGE_EVENT = 'datryp:bookmarks:changed';

export interface Bookmark {
    /** Search query the place was found under — needed to reopen the detail page. */
    query: string;
    /** Index within the cached results for that query. */
    index: number;
    /** Snapshot of display fields so the bookmarks list can render without
     *  re-hitting the recommender. */
    name: string;
    city: string;
    country: string;
    imageUrl: string | null;
    savedAt: number;
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

const keyOf = (query: string, index: number) =>
    `${query.trim().toLowerCase()}::${index}`;

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
            const k = keyOf(query, index);
            return bookmarks.some((b) => keyOf(b.query, b.index) === k);
        },
        [bookmarks]
    );

    const add = useCallback(
        (place: PlaceRecommendation, query: string, index: number) => {
            const current = readAll();
            const k = keyOf(query, index);
            if (current.some((b) => keyOf(b.query, b.index) === k)) return;
            writeAll([
                {
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
        const k = keyOf(query, index);
        writeAll(readAll().filter((b) => keyOf(b.query, b.index) !== k));
    }, []);

    const toggle = useCallback(
        (place: PlaceRecommendation, query: string, index: number): boolean => {
            const k = keyOf(query, index);
            const current = readAll();
            const existing = current.some((b) => keyOf(b.query, b.index) === k);
            if (existing) {
                remove(query, index);
                return false;
            }
            add(place, query, index);
            return true;
        },
        [add, remove]
    );

    return { bookmarks, isBookmarked, add, remove, toggle };
};
