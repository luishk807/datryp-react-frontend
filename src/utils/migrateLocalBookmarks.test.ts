import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('api/savedPlacesApi', () => ({ savePlace: vi.fn() }));
vi.mock('api/savedCitiesApi', () => ({ saveCity: vi.fn() }));
vi.mock('api/savedCountriesApi', () => ({ saveCountry: vi.fn() }));

import { savePlace } from 'api/savedPlacesApi';
import { saveCity } from 'api/savedCitiesApi';
import { saveCountry } from 'api/savedCountriesApi';
import { migrateLocalBookmarks } from './migrateLocalBookmarks';

const LEGACY_KEY = 'datryp:bookmarks';
const FLAG = (userId: string) => `datryp:bookmarks:migrated:${userId}`;

const savePlaceMock = savePlace as unknown as Mock;
const saveCityMock = saveCity as unknown as Mock;
const saveCountryMock = saveCountry as unknown as Mock;

const seedLegacy = (entries: unknown[]) =>
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify(entries));

beforeEach(() => {
    window.localStorage.clear();
    savePlaceMock.mockResolvedValue(undefined);
    saveCityMock.mockResolvedValue(undefined);
    saveCountryMock.mockResolvedValue(undefined);
});

afterEach(() => {
    window.localStorage.clear();
});

describe('migrateLocalBookmarks', () => {
    it('no-ops when the migrated flag is already set', async () => {
        window.localStorage.setItem(FLAG('user1'), '1');
        seedLegacy([{ kind: 'country', code: 'JP', name: 'Japan' }]);

        await migrateLocalBookmarks('user1');

        expect(saveCountryMock).not.toHaveBeenCalled();
        expect(savePlaceMock).not.toHaveBeenCalled();
        expect(saveCityMock).not.toHaveBeenCalled();
        // legacy key untouched (only cleared on a fresh successful run)
        expect(window.localStorage.getItem(LEGACY_KEY)).not.toBeNull();
    });

    it('sets the flag and makes no calls when there is no legacy data', async () => {
        await migrateLocalBookmarks('user1');

        expect(window.localStorage.getItem(FLAG('user1'))).toBe('1');
        expect(savePlaceMock).not.toHaveBeenCalled();
    });

    it('treats invalid JSON as no legacy data', async () => {
        window.localStorage.setItem(LEGACY_KEY, 'not-json{');

        await migrateLocalBookmarks('user1');

        expect(window.localStorage.getItem(FLAG('user1'))).toBe('1');
        expect(savePlaceMock).not.toHaveBeenCalled();
    });

    it('treats a non-array payload as no legacy data', async () => {
        window.localStorage.setItem(LEGACY_KEY, JSON.stringify({ a: 1 }));

        await migrateLocalBookmarks('user1');

        expect(window.localStorage.getItem(FLAG('user1'))).toBe('1');
    });

    it('migrates each bookmark kind through the matching endpoint', async () => {
        seedLegacy([
            { kind: 'country', code: 'JP', name: 'Japan' },
            {
                kind: 'city',
                code: 'PAR',
                name: 'Paris',
                country: 'France',
                imageUrl: 'https://img/paris.jpg',
            },
            {
                kind: 'place',
                name: 'Eiffel Tower',
                city: 'Paris',
                country: 'France',
                imageUrl: 'https://img/eiffel.jpg',
                query: 'paris landmarks',
                index: 2,
            },
            // kind omitted → defaults to 'place'
            {
                name: 'Louvre',
                city: 'Paris',
                country: 'France',
                imageUrl: null,
                query: 'paris museums',
                index: 0,
            },
        ]);

        await migrateLocalBookmarks('user1');

        expect(saveCountryMock).toHaveBeenCalledWith('JP');
        expect(saveCityMock).toHaveBeenCalledWith({
            name: 'Paris',
            country: 'France',
            code: 'PAR',
            imageUrl: 'https://img/paris.jpg',
        });
        expect(savePlaceMock).toHaveBeenCalledWith({
            placeName: 'Eiffel Tower',
            placeCity: 'Paris',
            placeCountry: 'France',
            imageUrl: 'https://img/eiffel.jpg',
            searchQuery: 'paris landmarks',
            searchIndex: 2,
        });
        expect(savePlaceMock).toHaveBeenCalledWith({
            placeName: 'Louvre',
            placeCity: 'Paris',
            placeCountry: 'France',
            imageUrl: null,
            searchQuery: 'paris museums',
            searchIndex: 0,
        });

        // full success → flag set AND legacy key cleared
        expect(window.localStorage.getItem(FLAG('user1'))).toBe('1');
        expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it('skips country / city rows that carry no code', async () => {
        seedLegacy([
            { kind: 'country', name: 'Japan' },
            { kind: 'city', name: 'Paris', country: 'France' },
        ]);

        await migrateLocalBookmarks('user1');

        expect(saveCountryMock).not.toHaveBeenCalled();
        expect(saveCityMock).not.toHaveBeenCalled();
        // both rows resolved (no code → no-op) so migration still completes
        expect(window.localStorage.getItem(FLAG('user1'))).toBe('1');
        expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it('swallows a per-row endpoint failure and still completes', async () => {
        savePlaceMock.mockRejectedValueOnce(new Error('boom'));
        seedLegacy([
            {
                kind: 'place',
                name: 'Eiffel Tower',
                city: 'Paris',
                country: 'France',
                imageUrl: null,
                query: 'q',
                index: 0,
            },
        ]);

        await migrateLocalBookmarks('user1');

        // The row rejected inside its own try/catch, so the task still
        // fulfills → migration is considered complete.
        expect(window.localStorage.getItem(FLAG('user1'))).toBe('1');
        expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it('leaves the flag unset when a row throws outside the guard (null entry)', async () => {
        // A null legacy entry throws on `b.kind` before the try/catch, so its
        // task rejects → allOk is false → flag NOT set, legacy NOT cleared.
        seedLegacy([null]);

        await migrateLocalBookmarks('user1');

        expect(window.localStorage.getItem(FLAG('user1'))).toBeNull();
        expect(window.localStorage.getItem(LEGACY_KEY)).not.toBeNull();
    });
});
