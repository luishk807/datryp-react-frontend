import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, waitFor } from '../../../test/renderWithProviders';
import { SearchQuotaExceededError } from 'api/searchQuotaError';
import PlaceSmartEntryWatcher from './PlaceSmartEntryWatcher';

// Every data hook is mocked so no network fires; the real `parsePlaceEntry`
// and `isSearchQuotaExceededError` still run. `isShortLinkUrl` stays real so
// the short-link branch keeps its true gate.
let mockSearch: { data?: unknown; isFetching: boolean; error: unknown };
let mockImage: { data?: unknown; isFetching: boolean };
let mockRating: { data?: unknown; isFetching: boolean };
let mockShort: { data?: unknown; isFetching: boolean };
let mockExtract: { data?: unknown; isFetching: boolean };
let mockUserVal: { user: unknown; isAdmin: boolean };

vi.mock('api/hooks/useSearchPlaces', () => ({
    useSearchPlaces: () => mockSearch,
}));
vi.mock('api/hooks/usePlaceImage', () => ({
    usePlaceImage: () => mockImage,
}));
vi.mock('api/hooks/usePlaceRating', () => ({
    usePlaceRating: () => mockRating,
}));
vi.mock('api/hooks/useResolveShortLink', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('api/hooks/useResolveShortLink')
    >();
    return { ...actual, useResolveShortLink: () => mockShort };
});
vi.mock('api/hooks/useExtractLink', () => ({
    useExtractLink: () => mockExtract,
}));
vi.mock('context/UserContext', () => ({
    useUser: () => mockUserVal,
}));

const recommendation = (over: Record<string, unknown> = {}) => ({
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    rating: 4.7,
    bestTimeToVisit: 'spring',
    description: 'iron lattice tower',
    imageUrl: 'http://rec.jpg',
    photographerName: null,
    photographerUrl: null,
    latitude: 48.8584,
    longitude: 2.2945,
    ...over,
});

beforeEach(() => {
    mockSearch = { data: undefined, isFetching: false, error: null };
    mockImage = { data: undefined, isFetching: false };
    mockRating = { data: undefined, isFetching: false };
    mockShort = { data: undefined, isFetching: false };
    mockExtract = { data: undefined, isFetching: false };
    mockUserVal = { user: null, isAdmin: false };
});

describe('PlaceSmartEntryWatcher', () => {
    it('ships the AI recommendation top match with its rating as openaiRating', async () => {
        mockSearch = {
            data: { items: [recommendation()] },
            isFetching: false,
            error: null,
        };
        const onResult = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="Eiffel Tower"
                country="France"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalled(), {
            timeout: 2500,
        });
        const [item, parsed, extras] = onResult.mock.calls[0];
        expect(item.name).toBe('Eiffel Tower');
        expect(item.imageUrl).toBe('http://rec.jpg');
        expect(parsed.query).toBe('Eiffel Tower');
        expect(extras.openaiRating).toBe(4.7);
    });

    it('falls back to a trustworthy Google Places match for address + rating', async () => {
        mockSearch = { data: { items: [] }, isFetching: false, error: null };
        mockRating = {
            data: {
                name: 'Eiffel Tower',
                formattedAddress:
                    'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
                rating: 4.6,
                userRatingCount: 200,
                placeId: 'PLACE_123',
                latitude: 48.8584,
                longitude: 2.2945,
                photoUrl: 'http://google.jpg',
            },
            isFetching: false,
        };
        const onResult = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="Eiffel Tower"
                country="France"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalled(), {
            timeout: 2500,
        });
        const [item, , extras] = onResult.mock.calls[0];
        expect(item.name).toBe('Eiffel Tower');
        expect(item.country).toBe('France');
        expect(item.imageUrl).toBe('http://google.jpg');
        expect(extras.formattedAddress).toContain('France');
        expect(extras.placeId).toBe('PLACE_123');
        expect(extras.googleRating).toBe(4.6);
        expect(extras.googleRatingCount).toBe(200);
    });

    it('ships a bare synthetic record (typed name + fallback photo) when nothing matches', async () => {
        mockSearch = { data: { items: [] }, isFetching: false, error: null };
        mockRating = { data: null, isFetching: false };
        mockImage = {
            data: {
                imageUrl: 'http://unsplash.jpg',
                photographerName: 'Ada',
                photographerUrl: 'http://ada',
            },
            isFetching: false,
        };
        const onResult = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="Obscure Venue Zzz"
                country="Panama"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalled(), {
            timeout: 2500,
        });
        const [item, , extras] = onResult.mock.calls[0];
        expect(item.name).toBe('Obscure Venue Zzz');
        expect(item.country).toBe('Panama');
        expect(item.imageUrl).toBe('http://unsplash.jpg');
        expect(item.latitude).toBeNull();
        expect(extras.formattedAddress).toBeUndefined();
    });

    it('warns plainly when the free-tier smart-search quota is exceeded', async () => {
        mockSearch = {
            data: undefined,
            isFetching: false,
            error: new SearchQuotaExceededError({ limit: 5, used: 5 }),
        };
        const onWarning = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="Eiffel Tower"
                country="France"
                onResult={vi.fn()}
                onWarning={onWarning}
            />
        );
        await waitFor(
            () =>
                expect(onWarning).toHaveBeenCalledWith(
                    expect.stringContaining("today's free smart searches")
                ),
            { timeout: 2500 }
        );
    });

    it('warns when a pasted link yields no place and the scrape comes up empty', async () => {
        mockExtract = { data: null, isFetching: false };
        const onWarning = vi.fn();
        const onResult = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="https://www.hilton.com"
                country="Panama"
                onResult={onResult}
                onWarning={onWarning}
            />
        );
        await waitFor(
            () =>
                expect(onWarning).toHaveBeenCalledWith(
                    expect.stringContaining("couldn't find a place in that link")
                ),
            { timeout: 2500 }
        );
        expect(onResult).not.toHaveBeenCalled();
    });

    it('ships a scraped place as a trusted, user-pasted result (fromScrape)', async () => {
        mockExtract = {
            data: {
                name: 'Grand Hotel',
                streetAddress: '1 Main St',
                city: 'Panama City',
                region: 'Panama',
                country: 'Panama',
                postalCode: null,
                latitude: 8.98,
                longitude: -79.52,
                imageUrl: 'http://hotel.jpg',
            },
            isFetching: false,
        };
        const onResult = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="https://somehotel.example/rooms"
                country="Panama"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalled(), {
            timeout: 2500,
        });
        const [item, , extras] = onResult.mock.calls[0];
        expect(item.name).toBe('Grand Hotel');
        expect(item.city).toBe('Panama City');
        expect(item.latitude).toBe(8.98);
        expect(extras.fromScrape).toBe(true);
        expect(extras.formattedAddress).toContain('1 Main St');
    });

    it('forwards the combined loading state through onLoadingChange', async () => {
        mockSearch = { data: undefined, isFetching: true, error: null };
        const onLoadingChange = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="Eiffel Tower"
                country="France"
                onResult={vi.fn()}
                onLoadingChange={onLoadingChange}
            />
        );
        await waitFor(
            () => expect(onLoadingChange).toHaveBeenCalledWith(true),
            { timeout: 2500 }
        );
    });

    it('layers URL pin coords + a Pro address upsell for a pasted Maps link (free user)', async () => {
        mockSearch = { data: { items: [] }, isFetching: false, error: null };
        mockRating = { data: null, isFetching: false };
        const onResult = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput="https://maps.google.com/maps/place/Some+Cafe/@1.5,2.5,17z"
                country="Panama"
                onResult={onResult}
            />
        );
        await waitFor(() => expect(onResult).toHaveBeenCalled(), {
            timeout: 2500,
        });
        const [item, parsed, extras] = onResult.mock.calls[0];
        expect(parsed.fromUrl).toBe(true);
        expect(item.name).toBe('Some Cafe');
        expect(item.latitude).toBe(1.5);
        expect(item.longitude).toBe(2.5);
        expect(extras.addressUpsell).toContain('Pro');
    });

    it('clears any warning and does nothing for empty input', async () => {
        const onResult = vi.fn();
        const onWarning = vi.fn();
        renderWithProviders(
            <PlaceSmartEntryWatcher
                rawInput=""
                country="France"
                onResult={onResult}
                onWarning={onWarning}
            />
        );
        await waitFor(() => expect(onWarning).toHaveBeenCalledWith(null), {
            timeout: 2500,
        });
        expect(onResult).not.toHaveBeenCalled();
    });
});
