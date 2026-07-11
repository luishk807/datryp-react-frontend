import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import { TripCheckupBackendError } from 'api/tripCheckupApi';
import type { TripCheckupResult } from 'api/tripCheckupApi';

// Hoisted so the eager `capture: mockCapture` factory read isn't in the TDZ.
const { mockCapture } = vi.hoisted(() => ({ mockCapture: vi.fn() }));
vi.mock('lib/posthog', () => ({ capture: mockCapture }));

const mockRefetch = vi.fn();
// Mutable query stand-in flipped per test; keep the real backend-error class so
// the component's `instanceof` branch resolves.
let mockQuery: {
    data: TripCheckupResult | null;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: typeof mockRefetch;
};
vi.mock('api/hooks/useTripCheckup', () => ({
    useTripCheckup: () => mockQuery,
}));

import TripCheckupCard from './index';

const result: TripCheckupResult = {
    score: 88,
    verdict: 'Strong',
    summary: 'Looking solid overall.',
    strengths: ['Great budget headroom'],
    gaps: ['Add lodging'],
    budgetAssessment: { verdict: 'Strong', why: 'Budget is comfortable', score: 90 },
    timeAssessment: { verdict: 'On track', why: 'Pacing is fine', score: 70 },
    activityAssessment: { verdict: 'Needs work', why: 'Thin on activities', score: 55 },
    quota: { used: 1, cap: 5, remaining: 4, resetsAt: null, window: 'day' },
};

const baseQuery = () => ({
    data: result as TripCheckupResult | null,
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null as unknown,
    refetch: mockRefetch,
});

beforeEach(() => {
    mockCapture.mockReset();
    mockRefetch.mockReset();
    mockQuery = baseQuery();
});

describe('TripCheckupCard', () => {
    it('renders nothing for a non-Pro viewer', () => {
        const { container } = renderWithProviders(
            <TripCheckupCard tripId="t1" isPro={false} isPlanning />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing once the trip is past Planning', () => {
        const { container } = renderWithProviders(
            <TripCheckupCard tripId="t1" isPro isPlanning={false} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a collapsed summary with verdict and score for an enabled Pro trip', () => {
        renderWithProviders(<TripCheckupCard tripId="t1" isPro isPlanning />);
        expect(
            screen.getByRole('region', { name: 'Trip readiness checkup' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Trip review' })
        ).toBeInTheDocument();
        expect(screen.getByText('Strong')).toBeInTheDocument();
        expect(screen.getByLabelText('Score 88')).toBeInTheDocument();
        // Collapsed by default → the expand affordance is present.
        expect(
            screen.getByRole('button', { name: 'Expand trip review' })
        ).toBeInTheDocument();
    });

    it('reveals dimensions, strengths and gaps when expanded', async () => {
        renderWithProviders(<TripCheckupCard tripId="t1" isPro isPlanning />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Expand trip review' })
        );
        expect(
            screen.getByRole('button', { name: /Budget/ })
        ).toBeInTheDocument();
        expect(screen.getByText("What's working")).toBeInTheDocument();
        expect(screen.getByText('Great budget headroom')).toBeInTheDocument();
        expect(screen.getByText('What to address')).toBeInTheDocument();
        expect(screen.getByText('Add lodging')).toBeInTheDocument();
    });

    it('opens a dimension to reveal its rationale', async () => {
        renderWithProviders(<TripCheckupCard tripId="t1" isPro isPlanning />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Expand trip review' })
        );
        expect(screen.queryByText('Budget is comfortable')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Budget/ }));
        expect(screen.getByText('Budget is comfortable')).toBeInTheDocument();
    });

    it('re-checks the trip: captures the event and refetches', async () => {
        renderWithProviders(<TripCheckupCard tripId="t1" isPro isPlanning />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Expand trip review' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Re-check trip' })
        );
        expect(mockCapture).toHaveBeenCalledWith('trip_checkup_refreshed', {
            trip_id: 't1',
        });
        expect(mockRefetch).toHaveBeenCalled();
    });

    it('shows a quota-specific error message with a retry action', async () => {
        mockQuery = {
            ...baseQuery(),
            data: null,
            isError: true,
            error: new TripCheckupBackendError('nope', 429, 'trip_checkup_quota'),
        };
        renderWithProviders(<TripCheckupCard tripId="t1" isPro isPlanning />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Expand trip review' })
        );
        expect(
            screen.getByText(
                "You've used today's trip reviews. Resets at UTC midnight."
            )
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Retry' })
        ).toBeInTheDocument();
    });
});
