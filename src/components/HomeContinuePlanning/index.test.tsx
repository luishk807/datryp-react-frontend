import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

// Signed-in gate — flipped per test.
let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

// Raw itineraries the hook hands back; the component runs the REAL
// `selectInProgressTrips` + `apiToTripEntry` over them. The mock honors the
// `enabled` gate so a signed-out render truly yields no data.
let mockItins: unknown[] = [];
vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: (opts?: { enabled?: boolean }) => ({
        data: opts?.enabled === false ? undefined : mockItins,
    }),
}));

import HomeContinuePlanning from './index';

const apiTrip = (over: Record<string, unknown> = {}) => ({
    id: 't1',
    name: 'Kyoto Getaway',
    startDate: '2999-05-01',
    endDate: '2999-05-07',
    status: { id: 's1', name: 'Planning' },
    interaryType: { id: 'it1', name: 'Single Destination Trip' },
    user: { id: 'u1', name: 'Me', email: 'me@x.com' },
    friends: [],
    organizers: [],
    budget: 0,
    image: null,
    note: null,
    country: { id: 'c1', name: 'Japan', code: 'JP', local: null, image: null },
    transport: null,
    intenaryDates: [
        {
            id: 'd1',
            date: '2999-05-01',
            activities: [{ id: 'a1', name: 'Temple', kind: 'place' }],
        },
        { id: 'd2', date: '2999-05-02', activities: [] },
    ],
    destinations: [],
    ...over,
});

beforeEach(() => {
    mockUser = { id: 'u1' };
    mockItins = [];
});

describe('HomeContinuePlanning', () => {
    it('renders nothing for a signed-out visitor', () => {
        mockUser = null;
        mockItins = [apiTrip()];
        const { container } = renderWithProviders(<HomeContinuePlanning />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there are no in-progress trips', () => {
        mockItins = [apiTrip({ status: { id: 's3', name: 'Completed' } })];
        const { container } = renderWithProviders(<HomeContinuePlanning />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the top in-progress trip as a link into its detail page', () => {
        mockItins = [apiTrip()];
        renderWithProviders(<HomeContinuePlanning />);

        expect(
            screen.getByRole('heading', { name: /continue planning/i })
        ).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /Kyoto Getaway/i });
        expect(link).toHaveAttribute('href', '/trip-detail?id=t1');
        // Country + date range meta.
        expect(link).toHaveTextContent(/Japan/);
        expect(link).toHaveTextContent(/May 1/);
    });

    it('shows the planning-completeness percentage (1 of 2 days filled)', () => {
        mockItins = [apiTrip()];
        renderWithProviders(<HomeContinuePlanning />);
        expect(screen.getByText('50% planned')).toBeInTheDocument();
    });

    it('shows the earliest Planning trip as the hero when several exist', () => {
        mockItins = [
            apiTrip({ id: 'later', name: 'Later Trip', startDate: '2999-09-01' }),
            apiTrip({ id: 'sooner', name: 'Sooner Trip', startDate: '2999-01-01' }),
        ];
        renderWithProviders(<HomeContinuePlanning />);
        expect(
            screen.getByRole('link', { name: /Sooner Trip/i })
        ).toHaveAttribute('href', '/trip-detail?id=sooner');
        expect(
            screen.queryByRole('link', { name: /Later Trip/i })
        ).not.toBeInTheDocument();
    });
});
