import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    waitFor,
} from '../../test/renderWithProviders';
import type { ModalButtonHandle } from 'components/ModalButton';
import type { TripState } from 'types';

// FriendPicker fetches the friends list over the network — stub it so the
// modal renders offline. The two labelled fields are all this test needs.
vi.mock('components/DestinationDetail/FriendPicker', () => ({
    default: ({ title }: { title?: string }) => (
        <div data-testid="friend-picker">{title}</div>
    ),
}));

import EditBasicInfoModal from './index';

const tripData: TripState = {
    name: 'Trip',
    budget: 500,
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    organizer: [],
    friends: [],
    destinations: [{ id: 1, country: { id: 1, name: 'Japan' }, itinerary: [] }],
};

const open = (over: Partial<Parameters<typeof EditBasicInfoModal>[0]> = {}) => {
    const ref = createRef<ModalButtonHandle>();
    const onSave = vi.fn().mockResolvedValue(true);
    renderWithProviders(
        <EditBasicInfoModal
            ref={ref}
            data={tripData}
            isSaving={false}
            onSave={onSave}
            {...over}
        />
    );
    act(() => ref.current?.openModel());
    return { ref, onSave };
};

describe('EditBasicInfoModal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders no content until opened via its ref', () => {
        const ref = createRef<ModalButtonHandle>();
        renderWithProviders(
            <EditBasicInfoModal
                ref={ref}
                data={tripData}
                isSaving={false}
                onSave={vi.fn().mockResolvedValue(true)}
            />
        );
        expect(
            screen.queryByRole('heading', { name: 'Edit basic info' })
        ).not.toBeInTheDocument();
    });

    it('opens with labelled fields and the read-only destination', () => {
        open();
        expect(
            screen.getByRole('heading', { name: 'Edit basic info' })
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Trip Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Budget')).toBeInTheDocument();
        const where = screen.getByLabelText('Where');
        expect(where).toHaveValue('Japan');
        expect(where).toBeDisabled();
        expect(screen.getAllByTestId('friend-picker')).toHaveLength(2);
    });

    it('keeps Save disabled until an edit makes the draft dirty, then saves', async () => {
        const { onSave } = open();
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

        const name = screen.getByLabelText('Trip Name');
        await userEvent.clear(name);
        await userEvent.type(name, 'Rome');

        const save = screen.getByRole('button', { name: 'Save' });
        expect(save).toBeEnabled();
        await userEvent.click(save);
        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Rome' })
        );
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Edit basic info' })
            ).not.toBeInTheDocument()
        );
    });

    it('surfaces a save error inline', () => {
        open({ saveError: 'Server rejected the change' });
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Server rejected the change'
        );
    });

    it('shows a saving label and disables the actions while saving', () => {
        open({ isSaving: true });
        expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('closes on Cancel', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Edit basic info' })
            ).not.toBeInTheDocument()
        );
    });
});
