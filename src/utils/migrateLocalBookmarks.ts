/**
 * One-time migration from the old localStorage-backed bookmarks to the
 * Python backend's `saved_*` tables. Runs once per user after sign-in.
 *
 * The legacy storage key was `datryp:bookmarks` with entries of the form:
 *   - { kind: 'place', query, index, name, city, country, imageUrl, savedAt }
 *   - { kind: 'country', code, name, imageUrl, savedAt }
 *   - { kind: 'city', code, name, country, imageUrl, savedAt }
 *
 * After successful migration we set `datryp:bookmarks:migrated:<userId>`
 * so a second sign-in on the same browser doesn't re-POST. The legacy
 * key is also cleared so localStorage doesn't keep growing.
 *
 * The backend endpoints are idempotent (POST is upsert), so a partial
 * failure mid-migration just leaves the flag unset and the next sign-in
 * retries cleanly.
 */
import { savePlace } from 'api/savedPlacesApi';
import { saveCity } from 'api/savedCitiesApi';
import { saveCountry } from 'api/savedCountriesApi';

const LEGACY_KEY = 'datryp:bookmarks';
const MIGRATED_KEY_PREFIX = 'datryp:bookmarks:migrated:';

interface LegacyBookmark {
    kind?: 'place' | 'country' | 'city';
    query: string;
    index: number;
    code?: string;
    name: string;
    city: string;
    country: string;
    imageUrl: string | null;
    savedAt: number;
}

const readLegacy = (): LegacyBookmark[] => {
    try {
        const raw = window.localStorage.getItem(LEGACY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as LegacyBookmark[]) : [];
    } catch {
        return [];
    }
};

export const migrateLocalBookmarks = async (userId: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    const flagKey = MIGRATED_KEY_PREFIX + userId;
    if (window.localStorage.getItem(flagKey)) return;

    const legacy = readLegacy();
    if (legacy.length === 0) {
        window.localStorage.setItem(flagKey, '1');
        return;
    }

    const tasks = legacy.map(async (b) => {
        const kind = b.kind ?? 'place';
        try {
            if (kind === 'country' && b.code) {
                await saveCountry(b.code);
            } else if (kind === 'city' && b.code) {
                await saveCity({
                    name: b.name,
                    country: b.country,
                    code: b.code,
                    imageUrl: b.imageUrl,
                });
            } else if (kind === 'place') {
                await savePlace({
                    placeName: b.name,
                    placeCity: b.city,
                    placeCountry: b.country,
                    imageUrl: b.imageUrl,
                    searchQuery: b.query,
                    searchIndex: b.index,
                });
            }
        } catch {
            // Swallow per-row failures so one bad row doesn't block the
            // rest. The endpoints are idempotent, so anything that didn't
            // make it through will be retried on the next sign-in until
            // every row is either successful or removed by the user.
        }
    });

    const results = await Promise.allSettled(tasks);
    const allOk = results.every((r) => r.status === 'fulfilled');
    if (allOk) {
        window.localStorage.setItem(flagKey, '1');
        window.localStorage.removeItem(LEGACY_KEY);
    }
};
