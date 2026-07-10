import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

// Controlled hook state — flipped per test.
let mockPlaces: {
    data?: { items: unknown[]; total: number };
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
};
let mockCountries: {
    data?: { items: unknown[]; total: number };
    isLoading: boolean;
    isError: boolean;
};
let mockCities: {
    data?: { items: unknown[]; total: number };
    isLoading: boolean;
    isError: boolean;
};
const mockUnmark = vi.fn();
const mockUnmarkCountry = vi.fn();
const mockUnmarkCity = vi.fn();

vi.mock('api/hooks/useVisitedPlaces', () => ({
    useVisitedPlaces: () => mockPlaces,
    useUnmarkVisited: () => ({ mutate: mockUnmark }),
}));
vi.mock('api/hooks/useVisitedCountries', () => ({
    useVisitedCountries: () => mockCountries,
    useUnmarkVisitedCountry: () => ({ mutate: mockUnmarkCountry }),
}));
vi.mock('api/hooks/useVisitedCities', () => ({
    useVisitedCities: () => mockCities,
    useUnmarkVisitedCity: () => ({ mutate: mockUnmarkCity }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

import Visited from './index';

const country = (over: Record<string, unknown> = {}) => ({
    id: 'c1',
    countryId: 'cc1',
    countryName: 'United States',
    countryCode: 'US',
    countryImage: null,
    source: 'manual',
    visitedAt: '2026-01-02T00:00:00Z',
    ...over,
});

const city = (over: Record<string, unknown> = {}) => ({
    id: 'ci1',
    citySlug: 'paris-fr',
    cityName: 'Paris',
    countryName: 'France',
    countryCode: 'FR',
    latitude: null,
    longitude: null,
    source: 'itinerary',
    visitedAt: '2026-02-03T00:00:00Z',
    ...over,
});

const place = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    placeKey: 'eiffel-tower',
    placeName: 'Eiffel Tower',
    placeCity: 'Paris',
    placeCountry: 'France',
    countryCode: 'FR',
    source: 'itinerary',
    visitedAt: '2026-03-04T00:00:00Z',
    trips: [],
    ...over,
});

const state = (items: unknown[]) => ({
    data: { items, total: items.length },
    isLoading: false,
    isError: false,
});

beforeEach(() => {
    mockPlaces = { data: { items: [], total: 0 }, isLoading: false, isError: false };
    mockCountries = { data: { items: [], total: 0 }, isLoading: false, isError: false };
    mockCities = { data: { items: [], total: 0 }, isLoading: false, isError: false };
    mockNavigate.mockClear();
    mockUnmark.mockClear();
    mockUnmarkCountry.mockClear();
    mockUnmarkCity.mockClear();
});

describe('Visited', () => {
    it('renders the page heading and map link', () => {
        renderWithProviders(<Visited />);
        expect(
            screen.getByRole('heading', { name: /where you've been/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /view on map/i })
        ).toHaveAttribute('href', '/atlas-map');
    });

    it('shows the loading state', () => {
        mockCountries = { ...mockCountries, isLoading: true };
        renderWithProviders(<Visited />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows an error alert', () => {
        mockCities = { ...mockCities, isError: true };
        renderWithProviders(<Visited />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            /could not load your visited list/i
        );
    });

    it('appends the error message when an Error object is present', () => {
        mockPlaces = {
            data: undefined,
            isLoading: false,
            isError: true,
            error: new Error('boom'),
        };
        renderWithProviders(<Visited />);
        expect(screen.getByRole('alert')).toHaveTextContent(/boom/);
    });

    it('shows the empty state and routes to the trip builder from the CTA', async () => {
        renderWithProviders(<Visited />);
        expect(
            screen.getByText('No visited places yet.')
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /build your first trip/i })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/single');
    });

    it('renders the countries tab (default) with a link to the country page', () => {
        mockCountries = state([country()]);
        renderWithProviders(<Visited />);
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /united states/i })
        ).toHaveAttribute('href', '/country?code=US');
    });

    it('switches to the cities and places tabs', async () => {
        mockCountries = state([country()]);
        mockCities = state([city()]);
        mockPlaces = state([place()]);
        renderWithProviders(<Visited />);

        // Countries active by default.
        expect(screen.getByText('United States')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /cities/i }));
        expect(screen.getByText('Paris')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /paris/i })
        ).toHaveAttribute(
            'href',
            '/city?name=Paris&country=France&code=FR&mode=single'
        );

        await userEvent.click(screen.getByRole('button', { name: /places/i }));
        expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    });

    it('shows a per-tab empty message when a category has no items', async () => {
        mockCountries = state([country()]);
        renderWithProviders(<Visited />);
        await userEvent.click(screen.getByRole('button', { name: /cities/i }));
        expect(screen.getByText('No cities marked yet.')).toBeInTheDocument();
    });

    it('shows the countries and places empty messages when only cities exist', async () => {
        mockCities = state([city()]);
        renderWithProviders(<Visited />);
        // Countries is the default tab and is empty here.
        expect(
            screen.getByText('No countries marked yet.')
        ).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /places/i }));
        expect(screen.getByText('No places marked yet.')).toBeInTheDocument();
    });

    it('labels a manual place and collapses extra trips into "+N more"', async () => {
        mockPlaces = state([
            place({
                source: 'manual',
                trips: [
                    { tripId: 't1', tripName: 'Trip One' },
                    { tripId: 't2', tripName: 'Trip Two' },
                ],
            }),
        ]);
        renderWithProviders(<Visited />);
        await userEvent.click(screen.getByRole('button', { name: /places/i }));
        expect(screen.getByText(/marked manually/i)).toBeInTheDocument();
        expect(screen.getByText(/\+1 more/i)).toBeInTheDocument();
    });

    it('renders the trip chip and "View trip" link for a place from a trip', async () => {
        mockPlaces = state([
            place({ trips: [{ tripId: 't9', tripName: 'Euro Trip' }] }),
        ]);
        renderWithProviders(<Visited />);
        await userEvent.click(screen.getByRole('button', { name: /places/i }));
        expect(screen.getByText('Euro Trip')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /view trip/i })
        ).toHaveAttribute('href', '/trip-detail?id=t9');
    });

    it('unmarks a visited country through the confirm dialog', async () => {
        mockCountries = state([country()]);
        renderWithProviders(<Visited />);
        await userEvent.click(
            screen.getByRole('button', { name: /remove/i })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete' })
        );
        expect(mockUnmarkCountry).toHaveBeenCalledWith('US');
    });

    it('paginates a tab with more than one page of items', async () => {
        const many = Array.from({ length: 21 }, (_, i) =>
            country({
                id: `c${i}`,
                countryName: `Country ${i + 1}`,
                // Valid ISO alpha-2 so CountryFlag renders an <img> (alt),
                // not an svg <title> that would duplicate the name text.
                countryCode: `A${String.fromCharCode(65 + i)}`,
            })
        );
        mockCountries = state(many);
        renderWithProviders(<Visited />);
        expect(screen.getByText('Country 1')).toBeInTheDocument();
        expect(screen.queryByText('Country 21')).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Go to page 2' })
        );
        expect(screen.getByText('Country 21')).toBeInTheDocument();
        expect(screen.queryByText('Country 1')).not.toBeInTheDocument();
    });
});
