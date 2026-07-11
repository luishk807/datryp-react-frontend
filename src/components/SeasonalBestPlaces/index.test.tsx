import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type {
    SeasonalBestPlaces as SeasonalBestPlacesResult,
    SeasonalPlace,
} from 'api/seasonalBestPlacesApi';

let mockUser: unknown = { isPaidMember: true };
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

let mockData: SeasonalBestPlacesResult | undefined;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('api/hooks/useSeasonalBestPlaces', () => ({
    // Fixed so the title's month is deterministic and the data-vs-local
    // month drift effect stays quiet (mockData.monthKey matches this).
    currentMonthKey: () => '2026-07',
    useSeasonalBestPlaces: () => ({
        data: mockData,
        isLoading: mockIsLoading,
        isError: mockIsError,
    }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

import SeasonalBestPlaces from './index';

const place = (over: Partial<SeasonalPlace> = {}): SeasonalPlace => ({
    name: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    why: 'Azaleas are blooming this month',
    imageUrl: 'http://img/kyoto.jpg',
    photographerName: null,
    photographerUrl: null,
    ...over,
});

const data = (places: SeasonalPlace[]): SeasonalBestPlacesResult => ({
    monthKey: '2026-07',
    places,
    cached: true,
});

beforeEach(() => {
    mockUser = { isPaidMember: true };
    mockIsAdmin = false;
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockNavigate.mockReset();
});

describe('SeasonalBestPlaces', () => {
    it('renders nothing for free (non-Pro) users', () => {
        mockUser = { isPaidMember: false };
        const { container } = renderWithProviders(<SeasonalBestPlaces />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for signed-out users', () => {
        mockUser = null;
        const { container } = renderWithProviders(<SeasonalBestPlaces />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a loading state for Pro users', () => {
        mockIsLoading = true;
        renderWithProviders(<SeasonalBestPlaces />);
        expect(screen.getByText('Best places this month')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                name: /Curating this month’s seasonal picks/i,
            })
        ).toBeInTheDocument();
    });

    it('renders nothing on error', () => {
        mockIsError = true;
        const { container } = renderWithProviders(<SeasonalBestPlaces />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the pick list is empty', () => {
        mockData = data([]);
        const { container } = renderWithProviders(<SeasonalBestPlaces />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the season title and a card per place, navigating on click', async () => {
        mockData = data([place(), place({ name: 'Reykjavik', country: 'Iceland', countryCode: 'IS' })]);
        renderWithProviders(<SeasonalBestPlaces />);
        expect(
            screen.getByRole('heading', {
                name: /Where the season is right in July 2026/i,
            })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Kyoto' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Reykjavik' })
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Kyoto/ }));
        expect(mockNavigate).toHaveBeenCalledWith(
            '/city?name=Kyoto&country=Japan&code=JP&mode=single'
        );
    });
});
