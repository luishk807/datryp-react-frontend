import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../../test/renderWithProviders';

let mockCountryResults: unknown[] = [];
let mockCountriesFetching = false;
vi.mock('api/hooks/useCountries', () => ({
    useCountries: () => ({
        data: mockCountryResults,
        isFetching: mockCountriesFetching,
    }),
}));

let mockCountryStatus: unknown = undefined;
let mockCityStatus: unknown = undefined;
let mockEssentialStatus: unknown = undefined;
let mockStatusFetching = false;
const mockClearCountry = vi.fn();
const mockClearCity = vi.fn();
const mockClearEssential = vi.fn();
vi.mock('api/hooks/useAdmin', () => ({
    useCountryCacheStatus: () => ({
        data: mockCountryStatus,
        isFetching: mockStatusFetching,
    }),
    useCityCacheStatus: () => ({
        data: mockCityStatus,
        isFetching: mockStatusFetching,
    }),
    useEssentialAppsCacheStatus: () => ({
        data: mockEssentialStatus,
        isFetching: mockStatusFetching,
    }),
    useClearCountryCache: () => ({ mutate: mockClearCountry, isPending: false }),
    useClearCityCache: () => ({ mutate: mockClearCity, isPending: false }),
    useClearEssentialAppsCache: () => ({
        mutate: mockClearEssential,
        isPending: false,
    }),
}));

import CacheCard from './index';

const JAPAN = { id: 'c1', name: 'Japan', code: 'JP', local: null, image: null };

const sectionFor = (title: string): HTMLElement =>
    screen.getByRole('heading', { name: title }).closest('section') as HTMLElement;

beforeEach(() => {
    mockCountryResults = [];
    mockCountriesFetching = false;
    mockCountryStatus = undefined;
    mockCityStatus = undefined;
    mockEssentialStatus = undefined;
    mockStatusFetching = false;
    mockClearCountry.mockReset();
    mockClearCity.mockReset();
    mockClearEssential.mockReset();
});

describe('CacheCard — country section', () => {
    it('searches, selects a country, shows status, and clears the cache', async () => {
        mockCountryResults = [JAPAN];
        mockCountryStatus = {
            code: 'JP',
            name: 'Japan',
            detailsCached: true,
            detailsHits: 12,
            detailsUpdatedAt: '2026-07-01T00:00:00Z',
            hasHeroImage: true,
        };
        mockClearCountry.mockImplementation((_arg, opts) =>
            opts.onSuccess({ cleared: true, rowsDeleted: 3 })
        );
        renderWithProviders(<CacheCard />);

        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        // Status detail is now visible.
        expect(within(section).getByText(/12 hit\(s\)/)).toBeInTheDocument();

        await userEvent.click(
            within(section).getByRole('button', { name: 'Clear country cache' })
        );
        expect(mockClearCountry).toHaveBeenCalledWith(
            { code: 'JP', includeImage: false },
            expect.any(Object)
        );
        // onSuccess routes a toast through the shared snackbar.
        expect(
            screen.getByText('Cleared 3 cache row(s) for JP')
        ).toBeInTheDocument();
    });

    it('shows a no-matches message when the search returns nothing', async () => {
        mockCountryResults = [];
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'zzz'
        );
        expect(within(section).getByText('No matches.')).toBeInTheDocument();
    });

    it('renders the not-cached state and resets via "Pick another"', async () => {
        mockCountryResults = [JAPAN];
        mockCountryStatus = {
            code: 'JP',
            name: 'Japan',
            detailsCached: false,
            detailsHits: 0,
            detailsUpdatedAt: null,
            hasHeroImage: false,
        };
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        expect(within(section).getByText('not cached')).toBeInTheDocument();
        expect(within(section).getByText('none')).toBeInTheDocument();
        // Clear is disabled when nothing is cached and no image is selected.
        expect(
            within(section).getByRole('button', { name: 'Clear country cache' })
        ).toBeDisabled();

        await userEvent.click(
            within(section).getByRole('button', { name: 'Pick another' })
        );
        expect(
            (
                within(section).getByPlaceholderText(
                    'Type a country name…'
                ) as HTMLInputElement
            ).value
        ).toBe('');
    });

    it('clears the hero image when the checkbox is ticked', async () => {
        mockCountryResults = [JAPAN];
        mockCountryStatus = {
            code: 'JP',
            name: 'Japan',
            detailsCached: true,
            detailsHits: 2,
            detailsUpdatedAt: '2026-07-01T00:00:00Z',
            hasHeroImage: true,
        };
        mockClearCountry.mockImplementation((_arg, opts) =>
            opts.onSuccess({ cleared: true, rowsDeleted: 1 })
        );
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        await userEvent.click(within(section).getByRole('checkbox'));
        await userEvent.click(
            within(section).getByRole('button', { name: 'Clear country cache' })
        );
        expect(mockClearCountry).toHaveBeenCalledWith(
            { code: 'JP', includeImage: true },
            expect.any(Object)
        );
        expect(
            screen.getByText('Cleared 1 cache row(s) + hero image for JP')
        ).toBeInTheDocument();
    });

    it('routes a clear failure to the toast', async () => {
        mockCountryResults = [JAPAN];
        mockCountryStatus = {
            code: 'JP',
            name: 'Japan',
            detailsCached: true,
            detailsHits: 2,
            detailsUpdatedAt: '2026-07-01T00:00:00Z',
            hasHeroImage: false,
        };
        mockClearCountry.mockImplementation((_arg, opts) =>
            opts.onError(new Error('server down'))
        );
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        await userEvent.click(
            within(section).getByRole('button', { name: 'Clear country cache' })
        );
        expect(screen.getByText('server down')).toBeInTheDocument();
    });

    it('shows a searching indicator while the lookup is in flight', async () => {
        mockCountriesFetching = true;
        mockCountryResults = [];
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Ja'
        );
        expect(within(section).getByText('Searching…')).toBeInTheDocument();
    });

    it('shows a loading-status indicator before the status resolves', async () => {
        mockCountryResults = [JAPAN];
        mockCountryStatus = undefined;
        mockStatusFetching = true;
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        expect(within(section).getByText('Loading status…')).toBeInTheDocument();
    });

    it('toasts a no-op when there was nothing to clear', async () => {
        mockCountryResults = [JAPAN];
        mockCountryStatus = {
            code: 'JP',
            name: 'Japan',
            detailsCached: true,
            detailsHits: 1,
            detailsUpdatedAt: '2026-07-01T00:00:00Z',
            hasHeroImage: false,
        };
        mockClearCountry.mockImplementation((_arg, opts) =>
            opts.onSuccess({ cleared: false, rowsDeleted: 0 })
        );
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Country cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        await userEvent.click(
            within(section).getByRole('button', { name: 'Clear country cache' })
        );
        expect(
            screen.getByText('Nothing to clear for JP')
        ).toBeInTheDocument();
    });
});

describe('CacheCard — city section', () => {
    it('looks up a city and clears its cache', async () => {
        mockCountryResults = [JAPAN];
        mockCityStatus = {
            slug: 'honolulu--jp',
            cityName: 'Honolulu',
            countryName: 'Japan',
            countryCode: 'JP',
            detailsCached: true,
            detailsHits: 5,
            detailsUpdatedAt: null,
        };
        renderWithProviders(<CacheCard />);

        const section = sectionFor('City cache');
        await userEvent.type(
            within(section).getByPlaceholderText('e.g. Honolulu'),
            'Honolulu'
        );
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        await userEvent.click(
            within(section).getByRole('button', { name: 'Look up' })
        );

        expect(within(section).getByText(/honolulu--jp/)).toBeInTheDocument();
        await userEvent.click(
            within(section).getByRole('button', { name: 'Clear city cache' })
        );
        expect(mockClearCity).toHaveBeenCalledWith(
            { name: 'Honolulu', code: 'JP' },
            expect.any(Object)
        );
    });

    it('disables the clear button for an uncached city and falls back to the code', async () => {
        mockCountryResults = [JAPAN];
        mockCityStatus = {
            slug: 'nara--jp',
            cityName: 'Nara',
            countryName: '',
            countryCode: 'JP',
            detailsCached: false,
            detailsHits: 0,
            detailsUpdatedAt: null,
        };
        renderWithProviders(<CacheCard />);
        const section = sectionFor('City cache');
        await userEvent.type(
            within(section).getByPlaceholderText('e.g. Honolulu'),
            'Nara'
        );
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        await userEvent.click(
            within(section).getByRole('button', { name: 'Look up' })
        );
        // Empty countryName falls back to the code in the header.
        expect(within(section).getByText('Nara, JP')).toBeInTheDocument();
        expect(within(section).getByText('not cached')).toBeInTheDocument();
        expect(
            within(section).getByRole('button', { name: 'Clear city cache' })
        ).toBeDisabled();
    });

    it('shows searching + loading-status indicators for the city flow', async () => {
        mockCountriesFetching = true;
        mockCountryResults = [];
        renderWithProviders(<CacheCard />);
        const section = sectionFor('City cache');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country…'),
            'Ja'
        );
        expect(within(section).getByText('Searching…')).toBeInTheDocument();
    });

    it('shows the city loading-status placeholder after Look up', async () => {
        mockCountryResults = [JAPAN];
        mockCityStatus = undefined;
        mockStatusFetching = true;
        renderWithProviders(<CacheCard />);
        const section = sectionFor('City cache');
        await userEvent.type(
            within(section).getByPlaceholderText('e.g. Honolulu'),
            'Kyoto'
        );
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        await userEvent.click(
            within(section).getByRole('button', { name: 'Look up' })
        );
        expect(within(section).getByText('Loading status…')).toBeInTheDocument();
    });
});

describe('CacheCard — essential apps section', () => {
    it('shows AI-sourced apps and offers a regenerate clear', async () => {
        mockCountryResults = [JAPAN];
        mockEssentialStatus = {
            code: 'JP',
            name: 'Japan',
            source: 'ai',
            cached: true,
            hits: 4,
            updatedAt: '2026-07-01T00:00:00Z',
            categories: {
                navigation: [
                    { name: 'Google Maps', note: 'Offline maps', status: 'ok' },
                ],
            },
        };
        renderWithProviders(<CacheCard />);

        const section = sectionFor('Essential apps (AI)');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        expect(within(section).getByText('Google Maps')).toBeInTheDocument();
        expect(within(section).getByText(/AI-suggested/)).toBeInTheDocument();

        await userEvent.click(
            within(section).getByRole('button', {
                name: 'Clear AI apps (regenerate)',
            })
        );
        expect(mockClearEssential).toHaveBeenCalledWith(
            { code: 'JP' },
            expect.any(Object)
        );
    });

    it('shows a curated note and no clear button for curated countries', async () => {
        mockCountryResults = [JAPAN];
        mockEssentialStatus = {
            code: 'JP',
            name: 'Japan',
            source: 'curated',
            cached: true,
            hits: 0,
            updatedAt: null,
            categories: {
                navigation: [{ name: 'Google Maps', note: null, status: 'ok' }],
            },
        };
        renderWithProviders(<CacheCard />);

        const section = sectionFor('Essential apps (AI)');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        expect(within(section).getByText(/curated \(verified\)/)).toBeInTheDocument();
        expect(
            within(section).getByText(/hand-verified\. Edit in/)
        ).toBeInTheDocument();
        expect(
            within(section).queryByRole('button', {
                name: /Clear AI apps/,
            })
        ).not.toBeInTheDocument();
    });

    it('shows the empty-apps message when nothing is cached for a country', async () => {
        mockCountryResults = [JAPAN];
        mockEssentialStatus = {
            code: 'JP',
            name: 'Japan',
            source: 'none',
            cached: false,
            hits: 0,
            updatedAt: null,
            categories: {},
        };
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Essential apps (AI)');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        expect(within(section).getByText(/not cached/)).toBeInTheDocument();
        expect(
            within(section).getByText('Nothing shown for this country yet.')
        ).toBeInTheDocument();
    });

    it('shows searching + no-matches states for the app search', async () => {
        mockCountriesFetching = true;
        mockCountryResults = [];
        const { rerender } = renderWithProviders(<CacheCard />);
        const section = sectionFor('Essential apps (AI)');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Ja'
        );
        expect(within(section).getByText('Searching…')).toBeInTheDocument();

        mockCountriesFetching = false;
        rerender(<CacheCard />);
        expect(within(section).getByText('No matches.')).toBeInTheDocument();
    });

    it('shows the app loading-status placeholder before status resolves', async () => {
        mockCountryResults = [JAPAN];
        mockEssentialStatus = undefined;
        mockStatusFetching = true;
        renderWithProviders(<CacheCard />);
        const section = sectionFor('Essential apps (AI)');
        await userEvent.type(
            within(section).getByPlaceholderText('Type a country name…'),
            'Japan'
        );
        await userEvent.click(
            within(section).getByRole('button', { name: /Japan/ })
        );
        expect(within(section).getByText('Loading status…')).toBeInTheDocument();
    });
});
