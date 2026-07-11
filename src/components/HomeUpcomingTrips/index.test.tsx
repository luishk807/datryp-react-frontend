import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

let mockItins: unknown[] = [];
vi.mock('api/hooks/useItineraries', () => ({
    useMyItineraries: (opts?: { enabled?: boolean }) => ({
        data: opts?.enabled === false ? undefined : mockItins,
    }),
}));

import HomeUpcomingTrips from './index';

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
    ],
    destinations: [],
    ...over,
});

beforeEach(() => {
    mockUser = { id: 'u1' };
    mockItins = [];
});

describe('HomeUpcomingTrips', () => {
    it('renders nothing for a signed-out visitor', () => {
        mockUser = null;
        mockItins = [apiTrip({ id: 'a' }), apiTrip({ id: 'b' })];
        const { container } = renderWithProviders(<HomeUpcomingTrips />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when only the hero trip is in progress', () => {
        // A single in-progress trip belongs to the Continue-planning hero;
        // slice(1) leaves this list empty.
        mockItins = [apiTrip()];
        const { container } = renderWithProviders(<HomeUpcomingTrips />);
        expect(container).toBeEmptyDOMElement();
    });

    it('lists every in-progress trip after the hero, in priority order', () => {
        mockItins = [
            apiTrip({ id: 'tA', name: 'Alpha', startDate: '2999-01-01' }),
            apiTrip({ id: 'tB', name: 'Bravo', startDate: '2999-02-01' }),
            apiTrip({
                id: 'tC',
                name: 'Charlie',
                startDate: '2999-03-01',
                status: { id: 's2', name: 'Confirmed' },
            }),
        ];
        renderWithProviders(<HomeUpcomingTrips />);

        expect(
            screen.getByRole('heading', { name: /upcoming trips/i })
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /see all/i })).toHaveAttribute(
            'href',
            '/trips'
        );

        // Alpha is the hero (index 0) — excluded here; Bravo + Charlie listed.
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(
            screen.queryByRole('link', { name: /Alpha/i })
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Bravo/i })
        ).toHaveAttribute('href', '/trip-detail?id=tB');
        expect(
            screen.getByRole('link', { name: /Charlie/i })
        ).toHaveAttribute('href', '/trip-detail?id=tC');
    });
});
