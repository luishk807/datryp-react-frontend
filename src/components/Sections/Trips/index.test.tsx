import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';
import type { TripBoxData } from 'components/common/TripBox';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

// Controlled hook state — flipped per test.
let mockItineraries: unknown[] = [];
let mockIsLoading = false;
let mockIsError = false;
let mockIsFetching = false;
const mockRefetch = vi.fn();
const mockDeleteAsync = vi.fn(() => Promise.resolve());
vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: () => ({
        data: mockItineraries,
        isLoading: mockIsLoading,
        isError: mockIsError,
        isFetching: mockIsFetching,
        refetch: mockRefetch,
    }),
    useDeleteItinerary: () => ({ mutateAsync: mockDeleteAsync }),
}));

// The adapter is exercised by its own tests; here it's an identity so the
// test can feed TripBox-ready fixtures straight through.
vi.mock('utils/itineraryAdapter', () => ({
    apiToTripEntry: (it: unknown) => it,
}));

// Both banners pull heavy data hooks (useAtlasStats / usePlaceSuggestions +
// PlaceCard). Stub them: Atlas self-hides, PYML gets a marker we can assert.
vi.mock('components/AtlasSummaryCard', () => ({ default: () => null }));
vi.mock('components/PlacesYouMightLove', () => ({
    default: () => <div>places-you-might-love</div>,
}));

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: { id: 'u1' } }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

import Trips from './index';

const trip = (over: Partial<TripBoxData> & { apiId?: string } = {}) =>
    ({
        id: 1,
        apiId: 't-conf',
        name: 'Tokyo',
        startDate: '2999-05-01',
        endDate: '2999-05-07',
        status: { id: 2, name: 'Confirmed' },
        country: { name: 'Japan', image: '' },
        image: '',
        friends: [],
        intenaryDates: [],
        ...over,
    }) as unknown as TripBoxData;

beforeEach(() => {
    mockItineraries = [];
    mockIsLoading = false;
    mockIsError = false;
    mockIsFetching = false;
    mockNavigate.mockClear();
    mockRefetch.mockClear();
    mockDeleteAsync.mockClear();
});

describe('Trips', () => {
    it('shows the loading state', () => {
        mockIsLoading = true;
        renderWithProviders(<Trips />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows the error state and retries on click', async () => {
        mockIsError = true;
        renderWithProviders(<Trips />);
        expect(
            screen.getByText(/couldn't load your trips/i)
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /try again/i })
        );
        expect(mockRefetch).toHaveBeenCalled();
    });

    it('shows the fully-empty state with the recommendations banner', () => {
        mockItineraries = [];
        renderWithProviders(<Trips />);
        expect(
            screen.getByText('No trips in this category yet.')
        ).toBeInTheDocument();
        expect(screen.getByText('places-you-might-love')).toBeInTheDocument();
    });

    it('renders trip cards for each itinerary', () => {
        mockItineraries = [
            trip(),
            trip({ apiId: 't-plan', name: 'Paris', status: { name: 'Planning' } }),
            trip({
                apiId: 't-comp',
                name: 'Rome',
                status: { name: 'Completed' },
                startDate: '2020-01-01',
                endDate: '2020-01-05',
            }),
        ];
        renderWithProviders(<Trips />);
        expect(
            screen.getByRole('heading', { name: 'Tokyo' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Paris' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Rome' })
        ).toBeInTheDocument();
        // Each card links to its trip-detail page (keyed on apiId).
        const link = screen.getByRole('link', { name: /tokyo/i });
        expect(link).toHaveAttribute('href', '/trip-detail?id=t-conf');
    });

    it('filters the list when a status tab is chosen', async () => {
        mockItineraries = [
            trip(),
            trip({ apiId: 't-plan', name: 'Paris', status: { name: 'Planning' } }),
        ];
        renderWithProviders(<Trips />);
        await userEvent.click(
            screen.getByRole('button', { name: /^Planning/ })
        );
        expect(
            screen.getByRole('heading', { name: 'Paris' })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Tokyo' })
        ).not.toBeInTheDocument();
    });

    it('shows the category-empty state without the banner when a filter is empty', async () => {
        mockItineraries = [trip()];
        renderWithProviders(<Trips />);
        await userEvent.click(
            screen.getByRole('button', { name: /^Completed/ })
        );
        expect(
            screen.getByText('No trips in this category yet.')
        ).toBeInTheDocument();
        // Not fully tripless → no recommendations banner.
        expect(
            screen.queryByText('places-you-might-love')
        ).not.toBeInTheDocument();
    });

    it('navigates to the planner from the New Trip action', async () => {
        mockItineraries = [trip()];
        renderWithProviders(<Trips />);
        await userEvent.click(
            screen.getAllByRole('button', { name: /new trip/i })[0]
        );
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('paginates when there are more than one page of trips', async () => {
        mockItineraries = Array.from({ length: 21 }, (_, i) =>
            trip({
                apiId: `t-${i}`,
                name: `Trip ${i + 1}`,
                startDate: `2999-05-${String(i + 1).padStart(2, '0')}`,
                endDate: `2999-05-${String(i + 1).padStart(2, '0')}`,
            })
        );
        renderWithProviders(<Trips />);
        expect(
            screen.getByRole('heading', { name: 'Trip 1' })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Trip 21' })
        ).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Go to page 2' })
        );
        expect(
            screen.getByRole('heading', { name: 'Trip 21' })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Trip 1' })
        ).not.toBeInTheDocument();
    });

    it('deletes selected trips through the confirm dialog', async () => {
        mockItineraries = [trip()];
        renderWithProviders(<Trips />);

        // Enter multi-select, pick the card, open the confirm dialog.
        await userEvent.click(screen.getByRole('button', { name: 'Select' }));
        await userEvent.click(
            screen.getByRole('button', { name: /select trip tokyo/i })
        );
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete 1' })
        );

        expect(mockDeleteAsync).toHaveBeenCalledWith('t-conf');
        await waitFor(() =>
            expect(screen.getByText('Trip deleted.')).toBeInTheDocument()
        );
    });

    it('can cancel out of select mode', async () => {
        mockItineraries = [trip()];
        renderWithProviders(<Trips />);
        await userEvent.click(screen.getByRole('button', { name: 'Select' }));
        expect(
            screen.getByRole('region', { name: /selection actions/i })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /cancel selection/i })
        );
        expect(
            screen.queryByRole('region', { name: /selection actions/i })
        ).not.toBeInTheDocument();
    });
});
