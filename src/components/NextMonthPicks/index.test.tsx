import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type {
    NextMonthPickItem,
    NextMonthPicksResult,
} from 'api/nextMonthPicksApi';

let mockUser: unknown = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

let mockData: NextMonthPicksResult | undefined;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('api/hooks/useNextMonthPicks', () => ({
    useNextMonthPicks: () => ({
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

import NextMonthPicks from './index';

const item = (over: Partial<NextMonthPickItem> = {}): NextMonthPickItem => ({
    kind: 'place',
    key: 'louvre',
    name: 'Louvre',
    location: 'France (FR)',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    imageUrl: 'http://img/louvre.jpg',
    bestTimeToVisit: 'April to June',
    savedAt: '2026-06-01T00:00:00Z',
    ...over,
});

const data = (items: NextMonthPickItem[]): NextMonthPicksResult => ({
    items,
    monthLabel: 'July',
});

beforeEach(() => {
    mockUser = { id: 'u1' };
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockNavigate.mockReset();
});

describe('NextMonthPicks', () => {
    it('renders nothing for signed-out users', () => {
        mockUser = null;
        const { container } = renderWithProviders(<NextMonthPicks />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a loading state', () => {
        mockIsLoading = true;
        renderWithProviders(<NextMonthPicks />);
        expect(
            screen.getByRole('heading', { name: 'Coming up next month' })
        ).toBeInTheDocument();
    });

    it('renders nothing on error', () => {
        mockIsError = true;
        const { container } = renderWithProviders(<NextMonthPicks />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there are no matching saves', () => {
        mockData = data([]);
        const { container } = renderWithProviders(<NextMonthPicks />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the month title and a card per pick', () => {
        mockData = data([item(), item({ key: 'eiffel', name: 'Eiffel Tower' })]);
        renderWithProviders(<NextMonthPicks />);
        expect(
            screen.getByRole('heading', { name: 'Best for July' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Louvre' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Eiffel Tower' })
        ).toBeInTheDocument();
        expect(
            screen.getAllByText(/Best time: April to June/)
        ).toHaveLength(2);
    });

    it('navigates go-direct for a saved place card', async () => {
        mockData = data([item()]);
        renderWithProviders(<NextMonthPicks />);
        await userEvent.click(screen.getByRole('button', { name: /Louvre/ }));
        expect(mockNavigate).toHaveBeenCalledWith(
            '/place?q=Louvre&city=Paris&country=France'
        );
    });

    it('navigates by code for a saved country card', async () => {
        mockData = data([
            item({
                kind: 'country',
                key: 'FR',
                name: 'France',
                city: null,
                country: null,
                countryCode: 'FR',
            }),
        ]);
        renderWithProviders(<NextMonthPicks />);
        await userEvent.click(screen.getByRole('button', { name: /France/ }));
        expect(mockNavigate).toHaveBeenCalledWith('/country?code=FR');
    });
});
