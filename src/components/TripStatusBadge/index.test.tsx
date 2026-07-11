import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../test/renderWithProviders';
import type { TripState } from 'types';

const mockTripStatuses = [
    { id: 's1', name: 'Planning' },
    { id: 's2', name: 'Confirmed' },
    { id: 's3', name: 'Completed' },
];
vi.mock('api/hooks/useLookups', () => ({
    useTripStatuses: () => ({ data: mockTripStatuses }),
}));

import TripStatusBadge from './index';

const act = (name: string, statusName: string) => ({
    id: name.length,
    name,
    status: { id: 'a', name: statusName },
});

// A Planning trip whose single day is fully populated (no empty days) and whose
// activity is Confirmed — the "clean" happy path straight to the confirm dialog.
const planningAllConfirmed = {
    name: 'Tokyo',
    status: { id: 's1', name: 'Planning' },
    destinations: [
        {
            id: 1,
            country: { name: 'Japan', code: 'JP' },
            itinerary: [
                {
                    id: 1,
                    date: '2999-05-01',
                    activities: [act('Louvre', 'Confirmed')],
                },
            ],
        },
    ],
} as unknown as TripState;

const planningUnconfirmed = {
    name: 'Tokyo',
    status: { id: 's1', name: 'Planning' },
    destinations: [
        {
            id: 1,
            country: { name: 'Japan', code: 'JP' },
            itinerary: [
                {
                    id: 1,
                    date: '2999-05-01',
                    activities: [act('Eiffel Tower', 'Planning')],
                },
            ],
        },
    ],
} as unknown as TripState;

const withStatus = (statusName: string) =>
    ({ ...planningAllConfirmed, status: { id: 's', name: statusName } }) as TripState;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('TripStatusBadge', () => {
    it('shows "Confirm trip" on a Planning trip', () => {
        renderWithProviders(
            <TripStatusBadge
                data={planningAllConfirmed}
                onStatusChange={vi.fn()}
            />
        );
        expect(
            screen.getByRole('button', { name: 'Confirm trip' })
        ).toBeInTheDocument();
    });

    it('shows "Mark complete" on a Confirmed trip', () => {
        renderWithProviders(
            <TripStatusBadge data={withStatus('Confirmed')} onStatusChange={vi.fn()} />
        );
        expect(
            screen.getByRole('button', { name: 'Mark complete' })
        ).toBeInTheDocument();
    });

    it('renders nothing for a Completed trip', () => {
        const { container } = renderWithProviders(
            <TripStatusBadge data={withStatus('Completed')} onStatusChange={vi.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when disabled', () => {
        const { container } = renderWithProviders(
            <TripStatusBadge
                data={planningAllConfirmed}
                onStatusChange={vi.fn()}
                disabled
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('surfaces the readiness percent alongside the confirm label', () => {
        renderWithProviders(
            <TripStatusBadge
                data={planningAllConfirmed}
                onStatusChange={vi.fn()}
                readiness={{ percent: 80, checks: [], freeDays: [] }}
            />
        );
        expect(screen.getByText('80% ready')).toBeInTheDocument();
    });

    it('switches to "Complete trip" copy in past-due mode', () => {
        renderWithProviders(
            <TripStatusBadge
                data={planningAllConfirmed}
                onStatusChange={vi.fn()}
                pastDue
            />
        );
        expect(
            screen.getByRole('button', { name: 'Complete trip' })
        ).toBeInTheDocument();
    });

    it('confirms an all-confirmed trip through the dialog', async () => {
        const onStatusChange = vi.fn();
        renderWithProviders(
            <TripStatusBadge
                data={planningAllConfirmed}
                onStatusChange={onStatusChange}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm trip' })
        );
        const dialog = screen.getByRole('dialog', { name: 'Confirm this trip?' });
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Confirm trip' })
        );
        await waitFor(() =>
            expect(onStatusChange).toHaveBeenCalledWith({
                id: 's2',
                name: 'Confirmed',
            })
        );
    });

    it('offers "confirm all" when activities are still in Planning', async () => {
        const onStatusChange = vi.fn();
        renderWithProviders(
            <TripStatusBadge
                data={planningUnconfirmed}
                onStatusChange={onStatusChange}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm trip' })
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Some activities aren\'t confirmed',
        });
        expect(within(dialog).getByText('Eiffel Tower')).toBeInTheDocument();
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Confirm all' })
        );
        await waitFor(() =>
            expect(onStatusChange).toHaveBeenCalledWith(
                { id: 's2', name: 'Confirmed' },
                { confirmAllActivities: true }
            )
        );
    });
});
