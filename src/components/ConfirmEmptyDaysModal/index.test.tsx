import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
    act,
    waitFor,
} from '../../test/renderWithProviders';
import ConfirmEmptyDaysModal, {
    type ConfirmEmptyDaysModalHandle,
} from './index';

const noop = () => {};

const setup = (over: Partial<Parameters<typeof ConfirmEmptyDaysModal>[0]> = {}) => {
    const ref = createRef<ConfirmEmptyDaysModalHandle>();
    const props = {
        emptyDates: ['2026-01-15', '2026-01-16'],
        onConfirm: vi.fn(),
        onFillIn: vi.fn(),
        onEditDates: vi.fn(),
        ...over,
    };
    renderWithProviders(<ConfirmEmptyDaysModal ref={ref} {...props} />);
    act(() => ref.current?.openModel());
    return props;
};

describe('ConfirmEmptyDaysModal', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders no content until opened via its ref', () => {
        const ref = createRef<ConfirmEmptyDaysModalHandle>();
        renderWithProviders(
            <ConfirmEmptyDaysModal
                ref={ref}
                emptyDates={['2026-01-15']}
                onConfirm={noop}
                onFillIn={noop}
                onEditDates={noop}
            />
        );
        expect(
            screen.queryByRole('heading', { name: 'Some days are empty' })
        ).not.toBeInTheDocument();
    });

    it('opens with a friendly-formatted list of the empty days', () => {
        setup();
        expect(
            screen.getByRole('heading', { name: 'Some days are empty' })
        ).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByText('Thu, Jan 15')).toBeInTheDocument();
        expect(screen.getByText('Fri, Jan 16')).toBeInTheDocument();
    });

    it('falls back to the raw value for an unparseable date', () => {
        setup({ emptyDates: ['not-a-date'] });
        expect(screen.getByText('not-a-date')).toBeInTheDocument();
    });

    it('fires each action from its own button', async () => {
        const props = setup();
        await userEvent.click(
            screen.getByRole('button', { name: 'Fill them in' })
        );
        expect(props.onFillIn).toHaveBeenCalledTimes(1);
        await userEvent.click(
            screen.getByRole('button', { name: 'Update trip dates' })
        );
        expect(props.onEditDates).toHaveBeenCalledTimes(1);
        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm anyway' })
        );
        expect(props.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('shows a saving label and disables every action while saving', () => {
        setup({ isSaving: true });
        const confirm = screen.getByRole('button', { name: 'Saving…' });
        expect(confirm).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Fill them in' })).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Update trip dates' })
        ).toBeDisabled();
    });

    it('closes when dismissed via the ref', async () => {
        const ref = createRef<ConfirmEmptyDaysModalHandle>();
        renderWithProviders(
            <ConfirmEmptyDaysModal
                ref={ref}
                emptyDates={['2026-01-15']}
                onConfirm={noop}
                onFillIn={noop}
                onEditDates={noop}
            />
        );
        act(() => ref.current?.openModel());
        expect(
            screen.getByRole('heading', { name: 'Some days are empty' })
        ).toBeInTheDocument();
        act(() => ref.current?.closeModal());
        await waitFor(() =>
            expect(
                screen.queryByRole('heading', { name: 'Some days are empty' })
            ).not.toBeInTheDocument()
        );
    });
});
