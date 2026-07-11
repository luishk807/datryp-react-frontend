import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    waitFor,
} from '../../test/renderWithProviders';
import type { Friend } from 'types';

let mockUser: { id?: string } | null = null;

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import MarkPaidModal, { type MarkPaidModalHandle } from './index';

const alice: Friend = { id: 1, userId: 'u-alice', name: 'Alice', label: 'Alice' };
const bob: Friend = { id: 2, userId: 'u-bob', name: 'Bob', label: 'Bob' };

const open = (over: Partial<Parameters<typeof MarkPaidModal>[0]> = {}) => {
    const ref = createRef<MarkPaidModalHandle>();
    const onSubmit = vi.fn();
    const onClear = vi.fn();
    renderWithProviders(
        <MarkPaidModal
            ref={ref}
            participants={[alice]}
            onSubmit={onSubmit}
            onClear={onClear}
            {...over}
        />
    );
    act(() => ref.current?.open());
    return { ref, onSubmit, onClear };
};

beforeEach(() => {
    mockUser = null;
});

describe('MarkPaidModal', () => {
    it('renders no content until opened via its ref', () => {
        const ref = createRef<MarkPaidModalHandle>();
        renderWithProviders(
            <MarkPaidModal ref={ref} participants={[alice]} onSubmit={vi.fn()} />
        );
        expect(
            screen.queryByRole('heading', { name: 'Mark as paid' })
        ).not.toBeInTheDocument();
    });

    it('opens in add mode with the solo payer pinned and saves', async () => {
        const { onSubmit } = open();
        expect(
            screen.getByRole('heading', { name: 'Mark as paid' })
        ).toBeInTheDocument();
        // Solo trip → static "Paid by" line showing the only participant.
        expect(screen.getByText('Alice')).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Mark as paid' })
        );
        expect(onSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
                paidBy: { id: 'u-alice', name: 'Alice' },
                paidAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            })
        );
    });

    it('opens in edit mode and clears the payment', async () => {
        const { onClear } = open({
            initialPaidAt: '2026-08-01',
            initialPaidBy: { id: 'u-alice', name: 'Alice' },
        });
        expect(
            screen.getByRole('heading', { name: 'Edit payment' })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Mark as unpaid' })
        );
        expect(onClear).toHaveBeenCalledTimes(1);
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Edit payment' })
            ).not.toBeInTheDocument()
        );
    });

    it('disables Save when no payer is chosen among several participants', () => {
        open({ participants: [alice, bob] });
        expect(screen.getByRole('button', { name: 'Mark as paid' })).toBeDisabled();
    });

    it('closes on Cancel', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Mark as paid' })
            ).not.toBeInTheDocument()
        );
    });
});
