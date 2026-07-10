import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../test/renderWithProviders';

// Controlled hook state — flipped per test.
let mockPlaces: { data?: { items: unknown[] } };
let mockCities: { data?: { items: unknown[] } };
let mockCountries: { data?: { items: unknown[] } };
const mockUnsavePlace = vi.fn();
const mockUnsaveCity = vi.fn();
const mockUnsaveCountry = vi.fn();

vi.mock('api/hooks/useSavedPlaces', () => ({
    useSavedPlaces: () => mockPlaces,
    useUnsavePlace: () => ({ mutate: mockUnsavePlace }),
}));
vi.mock('api/hooks/useSavedCities', () => ({
    useSavedCities: () => mockCities,
    useUnsaveCity: () => ({ mutate: mockUnsaveCity }),
}));
vi.mock('api/hooks/useSavedCountries', () => ({
    useSavedCountries: () => mockCountries,
    useUnsaveCountry: () => ({ mutate: mockUnsaveCountry }),
}));

// Pulls its own data hooks (useBucketList) + ModalButton — stub it out.
vi.mock('components/AddToBucketButton', () => ({
    default: () => <button type="button">bucket</button>,
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

import Saved from './index';

const country = (over: Record<string, unknown> = {}) => ({
    id: 'c1',
    countryId: 'cc1',
    countryName: 'United States',
    countryCode: 'US',
    countryImage: null,
    source: 'manual',
    savedAt: '2026-01-02T00:00:00Z',
    ...over,
});

const city = (over: Record<string, unknown> = {}) => ({
    id: 'ci1',
    citySlug: 'paris-fr',
    cityName: 'Paris',
    countryName: 'France',
    countryCode: 'FR',
    imageUrl: null,
    source: 'manual',
    savedAt: '2026-02-03T00:00:00Z',
    ...over,
});

const place = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    placeKey: 'eiffel-tower',
    placeName: 'Eiffel Tower',
    placeCity: 'Paris',
    placeCountry: 'France',
    countryCode: 'FR',
    imageUrl: null,
    source: 'manual',
    savedAt: '2026-03-04T00:00:00Z',
    ...over,
});

beforeEach(() => {
    mockPlaces = { data: { items: [] } };
    mockCities = { data: { items: [] } };
    mockCountries = { data: { items: [] } };
    mockUnsavePlace.mockClear();
    mockUnsaveCity.mockClear();
    mockUnsaveCountry.mockClear();
});

describe('Saved', () => {
    it('renders the page heading', () => {
        renderWithProviders(<Saved />);
        expect(
            screen.getByRole('heading', { name: /your bookmarks/i })
        ).toBeInTheDocument();
    });

    it('shows the empty state with a home link when nothing is saved', () => {
        renderWithProviders(<Saved />);
        expect(
            screen.getByText(/you haven't saved anything yet/i)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /home page/i })
        ).toHaveAttribute('href', '/');
    });

    it('renders a summary line and all three sections when items exist', () => {
        mockCountries = { data: { items: [country()] } };
        mockCities = { data: { items: [city()] } };
        mockPlaces = { data: { items: [place()] } };
        renderWithProviders(<Saved />);

        expect(screen.getByText(/bookmarked/i)).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /countries/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /cities/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: /places/i })
        ).toBeInTheDocument();
    });

    it('links each saved country / city / place to its detail page', () => {
        mockCountries = { data: { items: [country()] } };
        mockCities = { data: { items: [city()] } };
        // Place in a different city so `/paris/i` uniquely matches the city row.
        mockPlaces = { data: { items: [place({ placeCity: 'Nice' })] } };
        renderWithProviders(<Saved />);

        expect(
            screen.getByRole('link', { name: /united states/i })
        ).toHaveAttribute('href', '/country?code=US');
        expect(
            screen.getByRole('link', { name: /paris/i })
        ).toHaveAttribute(
            'href',
            '/city?name=Paris&country=France&code=FR&mode=single'
        );
        expect(
            screen.getByRole('link', { name: /eiffel tower/i })
        ).toBeInTheDocument();
    });

    it('unsaves a country through the confirm dialog', async () => {
        mockCountries = { data: { items: [country()] } };
        renderWithProviders(<Saved />);
        await userEvent.click(
            screen.getByRole('button', { name: /remove/i })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete' })
        );
        expect(mockUnsaveCountry).toHaveBeenCalledWith('US');
    });

    it('unsaves a place through the confirm dialog', async () => {
        mockPlaces = { data: { items: [place()] } };
        renderWithProviders(<Saved />);
        await userEvent.click(
            screen.getByRole('button', { name: /remove/i })
        );
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete' })
        );
        expect(mockUnsavePlace).toHaveBeenCalledWith('eiffel-tower');
    });
});
