import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    within,
} from '../../test/renderWithProviders';
import { TripSuggestionsBackendError } from 'api/tripSuggestionsApi';
import type { TripSuggestionsResult } from 'api/tripSuggestionsApi';
import type { Destination } from 'types';

// Hoisted so the eager `capture: mockCapture` factory read isn't in the TDZ.
const { mockCapture } = vi.hoisted(() => ({ mockCapture: vi.fn() }));
vi.mock('lib/posthog', () => ({ capture: mockCapture }));

const mockMutate = vi.fn();
let mockMutation: {
    mutate: typeof mockMutate;
    data?: TripSuggestionsResult;
    isPending: boolean;
    isError: boolean;
    error: unknown;
};
vi.mock('api/hooks/useTripSuggestions', () => ({
    useTripSuggestions: () => mockMutation,
}));

import TripSuggestionsCard from './index';

const destinations = [
    {
        id: 1,
        country: { name: 'Japan', code: 'JP' },
        itinerary: [
            { id: 1, date: '2999-05-01', activities: [{ kind: 'place' }] },
            { id: 2, date: '2999-05-02', activities: [] },
        ],
    },
] as unknown as Destination[];

const results: TripSuggestionsResult = {
    suggestions: [
        {
            name: 'Tea Ceremony',
            place: 'Gion',
            category: 'Culture',
            why: 'A calm cultural highlight',
            estimatedCostUsd: 40,
            durationHours: 2,
            imageUrl: null,
            photographerName: null,
            photographerUrl: null,
        },
    ],
    dontForget: 'Bring cash for small shops',
    quota: { used: 1, cap: 5, remaining: 4, resetsAt: null, window: 'day' },
};

const idle = () => ({
    mutate: mockMutate,
    data: undefined,
    isPending: false,
    isError: false,
    error: null as unknown,
});

const renderCard = (
    over: Partial<Parameters<typeof TripSuggestionsCard>[0]> = {}
) =>
    renderWithProviders(
        <TripSuggestionsCard
            tripId="t1"
            isPro
            isPlanning
            isOrganizer
            destinations={destinations}
            onAddPlace={vi.fn()}
            {...over}
        />
    );

beforeEach(() => {
    mockCapture.mockReset();
    mockMutate.mockReset();
    mockMutation = idle();
});

describe('TripSuggestionsCard', () => {
    it('renders nothing for a non-Pro viewer', () => {
        const { container } = renderCard({ isPro: false });
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing once the trip is past Planning', () => {
        const { container } = renderCard({ isPlanning: false });
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the trip has no days yet', () => {
        const { container } = renderCard({ destinations: [] });
        expect(container).toBeEmptyDOMElement();
    });

    it('fires the AI call (and captures) when the trigger is clicked', async () => {
        renderCard();
        await userEvent.click(
            screen.getByRole('button', { name: 'Get activity ideas' })
        );
        expect(mockCapture).toHaveBeenCalledWith('lightbulb_clicked', {
            trip_id: 't1',
        });
        expect(mockMutate).toHaveBeenCalledWith({ tripId: 't1' });
    });

    it('shows a loading panel while the mutation is pending', () => {
        mockMutation = { ...idle(), isPending: true };
        renderCard();
        expect(
            screen.getByText('Finding ideas that fit your trip…')
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Conjuring ideas…' })
        ).toBeDisabled();
    });

    it('renders suggestion cards and the "don\'t forget" tip on success', () => {
        mockMutation = { ...idle(), data: results };
        renderCard();
        expect(
            screen.getByRole('heading', { name: 'Tea Ceremony' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('A calm cultural highlight')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Bring cash for small shops')
        ).toBeInTheDocument();
    });

    it('adds a suggestion to a chosen day via the day picker', async () => {
        const onAddPlace = vi.fn();
        mockMutation = { ...idle(), data: results };
        renderCard({ onAddPlace });
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Tea Ceremony to trip' })
        );
        const dialog = screen.getByRole('dialog', { name: /Add to which day/ });
        await userEvent.click(
            within(dialog).getByRole('button', { name: /Day 1/ })
        );
        expect(onAddPlace).toHaveBeenCalledWith(
            expect.objectContaining({
                date: '2999-05-01',
                activity: expect.objectContaining({
                    type: 'add',
                    destinationIndx: 0,
                    value: expect.objectContaining({
                        name: 'Tea Ceremony',
                        kind: 'place',
                    }),
                }),
            })
        );
    });

    it('disables the Add button for non-organizers', () => {
        mockMutation = { ...idle(), data: results };
        renderCard({ isOrganizer: false });
        expect(
            screen.getByRole('button', { name: 'Add Tea Ceremony to trip' })
        ).toBeDisabled();
    });

    it('renders the Pro error with a retry when the mutation errors', () => {
        mockMutation = {
            ...idle(),
            isError: true,
            error: new TripSuggestionsBackendError('nope', 402, null),
        };
        renderCard();
        expect(
            screen.getByText(
                'Lightbulb suggestions are a Pro feature. Upgrade to unlock.'
            )
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Retry' })
        ).toBeInTheDocument();
    });
});
