import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { TripState } from 'types';

// The confirm button is TripStatusBadge (separately tested + it needs the
// status lookup) — stub it to a marker that echoes its past-due mode.
vi.mock('components/TripStatusBadge', () => ({
    default: (props: { pastDue?: boolean }) => (
        <div data-testid="status-badge" data-pastdue={String(!!props.pastDue)} />
    ),
}));

import PlanningBox from './index';

const isoDaysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
};

const planning = {
    status: { id: 's1', name: 'Planning' },
    budget: 1000,
    startDate: '2999-05-01',
    endDate: '2999-05-05',
    destinations: [
        {
            id: 1,
            country: { name: 'Japan', code: 'JP' },
            itinerary: [
                {
                    id: 1,
                    date: '2999-05-01',
                    activities: [{ id: 1, name: 'Louvre', kind: 'place' }],
                },
            ],
        },
    ],
} as unknown as TripState;

const pastDue = {
    ...planning,
    endDate: isoDaysAgo(2),
} as unknown as TripState;

describe('PlanningBox', () => {
    it('shows a read-only banner to non-organizers with no checklist', () => {
        renderWithProviders(
            <PlanningBox
                data={planning}
                isOrganizer={false}
                canPromoteStatus
                onStatusChange={vi.fn()}
            />
        );
        expect(screen.getByText('Trip in planning')).toBeInTheDocument();
        expect(
            screen.getByText(
                'The organizer is still arranging activities. Check back soon.'
            )
        ).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
        expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    });

    it('gives organizers the readiness checklist + confirm button', () => {
        renderWithProviders(
            <PlanningBox
                data={planning}
                isOrganizer
                canPromoteStatus
                onStatusChange={vi.fn()}
            />
        );
        expect(screen.getByText('Trip in planning')).toBeInTheDocument();
        const badge = screen.getByTestId('status-badge');
        expect(badge).toHaveAttribute('data-pastdue', 'false');
        expect(screen.getByText('Budget set')).toBeInTheDocument();
        expect(screen.getByText('Daily activities added')).toBeInTheDocument();
    });

    it('collapses the checklist via the toggle', async () => {
        renderWithProviders(
            <PlanningBox
                data={planning}
                isOrganizer
                canPromoteStatus
                onStatusChange={vi.fn()}
            />
        );
        const toggle = screen.getByRole('button', {
            name: 'Hide readiness checklist',
        });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(toggle);
        expect(screen.queryByText('Budget set')).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Show readiness checklist' })
        ).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders the past-due action hub when the dates have passed', async () => {
        const onShiftDates = vi.fn();
        renderWithProviders(
            <PlanningBox
                data={pastDue}
                isOrganizer
                canPromoteStatus
                onStatusChange={vi.fn()}
                onShiftDates={onShiftDates}
            />
        );
        expect(screen.getByText('Trip ended')).toBeInTheDocument();
        expect(screen.getByText(/ended 2 days ago/)).toBeInTheDocument();
        // The confirm badge switches into "complete" (past-due) mode.
        expect(screen.getByTestId('status-badge')).toHaveAttribute(
            'data-pastdue',
            'true'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Shift dates' })
        );
        expect(onShiftDates).toHaveBeenCalledTimes(1);
    });

    it('lets the organizer dismiss the past-due prompt with "Continue planning"', async () => {
        renderWithProviders(
            <PlanningBox
                data={pastDue}
                isOrganizer
                canPromoteStatus
                onStatusChange={vi.fn()}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Continue planning' })
        );
        // Collapsing the box hides the checklist body.
        expect(screen.queryByText('Budget set')).not.toBeInTheDocument();
    });
});
