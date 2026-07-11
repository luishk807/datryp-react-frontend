import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    waitFor,
    within,
} from '../../test/renderWithProviders';
import type { TripState } from 'types';

// TripStatusBadge is a separately-tested child that needs the status lookup —
// stub it to a marker so the status pill's presence is still observable.
vi.mock('components/TripStatusBadge', () => ({
    default: () => <div data-testid="status-badge" />,
}));

import BasicTripInfo from './index';

const planning = {
    name: 'Tokyo Trip',
    status: { id: 's1', name: 'Planning' },
    budget: 2000,
    startDate: '2999-05-01',
    endDate: '2999-05-07',
    organizer: [{ id: 1, label: 'Alice' }],
    friends: [
        { id: 1, label: 'Bob' },
        { id: 2, label: 'Carol' },
    ],
    destinations: [
        { id: 1, country: { name: 'Japan', code: 'JP' }, itinerary: [] },
    ],
} as unknown as TripState;

const withStatus = (name: string) =>
    ({ ...planning, status: { id: 's', name } }) as TripState;

describe('BasicTripInfo', () => {
    it('renders the trip name, organizer, destination, dates and budget', () => {
        renderWithProviders(
            <BasicTripInfo data={planning} onChangeStep={vi.fn()} />
        );
        expect(
            screen.getByRole('heading', { name: 'Tokyo Trip' })
        ).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('$2,000.00')).toBeInTheDocument();
        expect(screen.getByText(/May 1/)).toBeInTheDocument();
    });

    it('renders each destination country as a link to its detail page', () => {
        renderWithProviders(
            <BasicTripInfo data={planning} onChangeStep={vi.fn()} />
        );
        expect(screen.getByRole('link', { name: 'Japan' })).toHaveAttribute(
            'href',
            '/country?code=JP'
        );
    });

    it('lists the friends going on the trip', () => {
        renderWithProviders(
            <BasicTripInfo data={planning} onChangeStep={vi.fn()} />
        );
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('Carol')).toBeInTheDocument();
    });

    it('lets the organizer jump to the editor via the name pencil', async () => {
        const onChangeStep = vi.fn();
        renderWithProviders(
            <BasicTripInfo data={planning} onChangeStep={onChangeStep} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Edit trip' })
        );
        expect(onChangeStep).toHaveBeenCalledWith(0);
    });

    it('renders the status pill for a Planning trip that can be promoted', () => {
        renderWithProviders(
            <BasicTripInfo
                data={planning}
                onChangeStep={vi.fn()}
                onStatusChange={vi.fn()}
            />
        );
        expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    });

    it('fires onEnterEditMode from the "Edit Trip" button', async () => {
        const onEnterEditMode = vi.fn();
        renderWithProviders(
            <BasicTripInfo
                data={planning}
                onChangeStep={vi.fn()}
                onEnterEditMode={onEnterEditMode}
                onSaveTrip={vi.fn()}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Edit Trip' })
        );
        expect(onEnterEditMode).toHaveBeenCalledTimes(1);
    });

    it('disables "Save Trip" until the form is dirty, then saves', async () => {
        const onSaveTrip = vi.fn();
        const { rerender } = renderWithProviders(
            <BasicTripInfo
                data={planning}
                onChangeStep={vi.fn()}
                onSaveTrip={onSaveTrip}
                isEditMode
            />
        );
        expect(
            screen.getByRole('button', { name: 'Save Trip' })
        ).toBeDisabled();
        rerender(
            <BasicTripInfo
                data={planning}
                onChangeStep={vi.fn()}
                onSaveTrip={onSaveTrip}
                isEditMode
                isDirty
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Trip' })
        );
        expect(onSaveTrip).toHaveBeenCalledTimes(1);
    });

    it('marks a Confirmed trip completed via the confirmation dialog', async () => {
        const onMarkCompleted = vi.fn();
        renderWithProviders(
            <BasicTripInfo
                data={withStatus('Confirmed')}
                onChangeStep={vi.fn()}
                onMarkCompleted={onMarkCompleted}
            />
        );
        expect(
            screen.getByLabelText('Trip status: Confirmed')
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark Completed' })
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Mark this trip as completed?',
        });
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Confirm' })
        );
        expect(onMarkCompleted).toHaveBeenCalledTimes(1);
    });

    it('deletes the trip via the confirmation dialog', async () => {
        const onDeleteTrip = vi.fn();
        renderWithProviders(
            <BasicTripInfo
                data={planning}
                onChangeStep={vi.fn()}
                onDeleteTrip={onDeleteTrip}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete Trip' })
        );
        const dialog = screen.getByRole('dialog', { name: 'Delete this trip?' });
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Confirm' })
        );
        expect(onDeleteTrip).toHaveBeenCalledTimes(1);
    });

    it('exports the trip to Excel from the download modal', async () => {
        const onExportExcel = vi.fn();
        renderWithProviders(
            <BasicTripInfo
                data={planning}
                onChangeStep={vi.fn()}
                onExportExcel={onExportExcel}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Download trip' })
        );
        await userEvent.click(
            await screen.findByRole('button', { name: /Download Excel/ })
        );
        expect(onExportExcel).toHaveBeenCalledTimes(1);
    });

    it('shows a save error banner', () => {
        renderWithProviders(
            <BasicTripInfo
                data={planning}
                onChangeStep={vi.fn()}
                saveError="Something broke"
            />
        );
        expect(screen.getByText('Something broke')).toBeInTheDocument();
    });

    it('shows the cancelled status inline for a cancelled trip', () => {
        renderWithProviders(
            <BasicTripInfo data={withStatus('Cancelled')} onChangeStep={vi.fn()} />
        );
        expect(
            screen.getByLabelText('Trip status: Cancelled')
        ).toBeInTheDocument();
    });
});
