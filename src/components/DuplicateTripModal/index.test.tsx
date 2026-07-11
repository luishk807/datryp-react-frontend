import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    waitFor,
} from '../../test/renderWithProviders';
import { now } from 'utils';
import type { ModalButtonHandle } from 'components/ModalButton';
import type { TripState } from 'types';
import DuplicateTripModal from './index';

const tripData: TripState = {
    name: 'Tokyo 2026',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    destinations: [
        {
            id: 1,
            country: { id: 1, name: 'Japan' },
            itinerary: [
                {
                    date: '2026-08-01',
                    activities: [{ id: 1, name: 'Museum', kind: 'place' }],
                } as never,
                { date: '2026-08-02', activities: [] } as never,
            ],
        },
    ],
};

const open = (over: Partial<Parameters<typeof DuplicateTripModal>[0]> = {}) => {
    const ref = createRef<ModalButtonHandle>();
    const onConfirm = vi.fn();
    renderWithProviders(
        <DuplicateTripModal
            ref={ref}
            data={tripData}
            onConfirm={onConfirm}
            {...over}
        />
    );
    act(() => ref.current?.openModel());
    return { ref, onConfirm };
};

describe('DuplicateTripModal', () => {
    it('renders no content until opened via its ref', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(
            <DuplicateTripModal ref={ref} data={tripData} onConfirm={vi.fn()} />
        );
        expect(
            screen.queryByRole('heading', { name: 'Duplicate this trip' })
        ).not.toBeInTheDocument();
    });

    it('opens naming the trip and previewing every itinerary day', () => {
        open();
        expect(
            screen.getByRole('heading', { name: 'Duplicate this trip' })
        ).toBeInTheDocument();
        expect(screen.getByText('Tokyo 2026')).toBeInTheDocument();
        expect(screen.getByText('Day 1')).toBeInTheDocument();
        expect(screen.getByText('Day 2')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create copy' })
        ).toBeInTheDocument();
    });

    it('warns about a date overlap with another trip', () => {
        open({ otherTrips: [{ name: 'Bali Trip', startDate: now(), endDate: now() }] });
        expect(screen.getByText(/Overlaps with Bali Trip/)).toBeInTheDocument();
    });

    it('confirms with the chosen start date and closes', async () => {
        const today = now();
        const { onConfirm } = open();
        await userEvent.click(
            screen.getByRole('button', { name: 'Create copy' })
        );
        expect(onConfirm).toHaveBeenCalledWith(today);
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Duplicate this trip' })
            ).not.toBeInTheDocument()
        );
    });

    it('closes without confirming when Cancel is clicked', async () => {
        const { onConfirm } = open();
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onConfirm).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Duplicate this trip' })
            ).not.toBeInTheDocument()
        );
    });
});
