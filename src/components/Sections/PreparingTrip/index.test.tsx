import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../../test/renderWithProviders';

const { mockNavigate, mockFetch, mockDispatch, mockAddPlace } = vi.hoisted(
    () => ({
        mockNavigate: vi.fn(),
        mockFetch: vi.fn(),
        mockDispatch: vi.fn(),
        mockAddPlace: vi.fn((payload: unknown) => ({ __addPlace: payload })),
    })
);

let mockState: unknown = null;

vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockState, pathname: '/preparing-trip' }),
}));

vi.mock('components/common/Layout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('api/placeRecommendationsApi', () => ({
    fetchPlaceRecommendations: (...args: unknown[]) => mockFetch(...args),
}));

vi.mock('context/TripContext', () => ({
    useTripDispatch: () => mockDispatch,
    addPlace: (payload: unknown) => mockAddPlace(payload),
}));

import PreparingTrip from './index';

const seedState = () => ({
    targetRoute: '/single',
    today: '2026-07-10',
    country: {
        id: 'PT',
        name: 'Portugal',
        code: 'PT',
        local: null,
        image: 'http://hero',
    },
    fallbackLocation: 'Lisbon, Portugal',
    highlights: [
        { title: 'Belém Tower', description: 'A riverside fortress' },
        { title: 'Alfama', description: 'Old town streets' },
    ],
});

beforeEach(() => {
    mockNavigate.mockReset();
    mockFetch.mockReset();
    mockDispatch.mockReset();
    mockAddPlace.mockClear();
    mockState = null;
    mockFetch.mockResolvedValue({
        items: [
            {
                name: 'Resolved Spot',
                city: 'Lisbon',
                country: 'Portugal',
                imageUrl: 'http://img',
            },
        ],
    });
});

describe('PreparingTrip', () => {
    it('bounces home when there is no seed state', () => {
        renderWithProviders(<PreparingTrip />);
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
        expect(
            screen.queryByText(/Finding the best spots/i)
        ).not.toBeInTheDocument();
    });

    it('renders the loading card, progress bar, and each highlight step', () => {
        mockState = seedState();
        renderWithProviders(<PreparingTrip />);
        expect(
            screen.getByRole('heading', {
                name: /Finding the best spots in Portugal/i,
            })
        ).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        const steps = screen.getByRole('list', {
            name: 'Itinerary preparation steps',
        });
        expect(
            within(steps).getByText('Belém Tower')
        ).toBeInTheDocument();
        expect(within(steps).getByText('Alfama')).toBeInTheDocument();
    });

    it('resolves each highlight into an activity and lands on the trip builder', async () => {
        mockState = seedState();
        renderWithProviders(<PreparingTrip />);

        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith('/single', {
                replace: true,
            })
        );
        // One dispatch per highlight.
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenCalledWith('Belém Tower', 1, 'Portugal');
        expect(mockAddPlace).toHaveBeenCalledWith(
            expect.objectContaining({
                value: expect.objectContaining({
                    name: 'Resolved Spot',
                    location: 'Lisbon, Portugal',
                    image: { url: 'http://img', name: 'Resolved Spot' },
                }),
            })
        );
    });
});
