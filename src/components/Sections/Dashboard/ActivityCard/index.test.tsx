import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

let mockState: { data: unknown; isLoading: boolean; error: unknown } = {
    data: undefined,
    isLoading: false,
    error: undefined,
};
vi.mock('api/hooks/useAdmin', () => ({
    useAdminActivityStats: () => mockState,
}));

vi.mock('../TopSearchesList', () => ({
    default: () => <div data-testid="top-searches" />,
}));

import ActivityCard from './index';

const fullData = {
    totalTrips: 50,
    totalReviews: 30,
    totalSearchEvents: 1000,
    searchEventsLast30Days: 200,
    topCountries: [
        { countryId: 'c1', countryName: 'Japan', countryCode: 'JP', searchClicks: 80 },
    ],
    topSavedPlaces: [
        {
            placeKey: 'k1',
            placeName: 'Eiffel Tower',
            placeCity: 'Paris',
            placeCountry: 'France',
            uniqueSavers: 25,
        },
    ],
};

beforeEach(() => {
    mockState = { data: undefined, isLoading: false, error: undefined };
});

describe('ActivityCard', () => {
    it('shows the loading state', () => {
        mockState = { data: undefined, isLoading: true, error: undefined };
        renderWithProviders(<ActivityCard />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('surfaces an error message', () => {
        mockState = {
            data: undefined,
            isLoading: false,
            error: new Error('boom'),
        };
        renderWithProviders(<ActivityCard />);
        expect(screen.getByText('boom')).toBeInTheDocument();
    });

    it('renders the stat tiles and top lists', () => {
        mockState = { data: fullData, isLoading: false, error: undefined };
        renderWithProviders(<ActivityCard />);
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
        expect(screen.getByText('Japan')).toBeInTheDocument();
        expect(screen.getByText('(JP)')).toBeInTheDocument();
        expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
        expect(screen.getByText('Paris, France')).toBeInTheDocument();
        expect(screen.getByTestId('top-searches')).toBeInTheDocument();
    });

    it('renders empty states when there are no clicks or bookmarks', () => {
        mockState = {
            data: { ...fullData, topCountries: [], topSavedPlaces: [] },
            isLoading: false,
            error: undefined,
        };
        renderWithProviders(<ActivityCard />);
        expect(screen.getByText('No clicks recorded yet.')).toBeInTheDocument();
        expect(screen.getByText('No bookmarks yet.')).toBeInTheDocument();
    });
});
