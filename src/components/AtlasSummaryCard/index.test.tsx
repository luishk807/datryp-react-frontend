import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

// Drive the REAL `useAtlasStats` by controlling the three visited data hooks
// it aggregates — countries are the union of ISO codes across all three.
let mockCountries: { data: unknown; isLoading: boolean } = {
    data: { items: [] },
    isLoading: false,
};
let mockCities: { data: unknown; isLoading: boolean } = {
    data: { items: [] },
    isLoading: false,
};
let mockPlaces: { data: unknown; isLoading: boolean } = {
    data: { items: [] },
    isLoading: false,
};
vi.mock('api/hooks/useVisitedCountries', () => ({
    useVisitedCountries: () => mockCountries,
}));
vi.mock('api/hooks/useVisitedCities', () => ({
    useVisitedCities: () => mockCities,
}));
vi.mock('api/hooks/useVisitedPlaces', () => ({
    useVisitedPlaces: () => mockPlaces,
}));

import AtlasSummaryCard from './index';

beforeEach(() => {
    mockCountries = { data: { items: [] }, isLoading: false };
    mockCities = { data: { items: [] }, isLoading: false };
    mockPlaces = { data: { items: [] }, isLoading: false };
});

describe('AtlasSummaryCard', () => {
    it('renders nothing while the stats are loading', () => {
        mockCountries = { data: undefined, isLoading: true };
        const { container } = renderWithProviders(<AtlasSummaryCard />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the traveler has visited nothing', () => {
        const { container } = renderWithProviders(<AtlasSummaryCard />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the atlas stats and opens the map on click', async () => {
        // Codes union → JP, FR, IT, US = 4 countries; 2 cities; 1 place.
        mockCountries = {
            data: { items: [{ countryCode: 'JP' }, { countryCode: 'FR' }] },
            isLoading: false,
        };
        mockCities = {
            data: { items: [{ countryCode: 'JP' }, { countryCode: 'IT' }] },
            isLoading: false,
        };
        mockPlaces = {
            data: { items: [{ countryCode: 'US' }] },
            isLoading: false,
        };
        renderWithProviders(<AtlasSummaryCard />);

        const card = screen.getByRole('button', { name: /open atlas/i });
        expect(screen.getByText('Travel Atlas')).toBeInTheDocument();
        // explorerLevel(4) → beginnerExplorer.
        expect(screen.getByText('Beginner Explorer')).toBeInTheDocument();
        // Pluralized count line (singular "Place" for the lone place).
        expect(
            screen.getByText('4 Countries • 2 Cities • 1 Place')
        ).toBeInTheDocument();
        // 4 / 195 sovereign countries → 2.1%.
        expect(
            screen.getByText('2.1% of the world explored')
        ).toBeInTheDocument();

        await userEvent.click(card);
        expect(mockNavigate).toHaveBeenCalledWith('/atlas-map');
    });
});
