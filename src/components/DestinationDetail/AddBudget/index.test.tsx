import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders';
import type { BudgetItem, Friend } from 'types';
import AddBudget from './index';

const friend = (id: number, name: string): Friend =>
    ({ id, label: name, name }) as unknown as Friend;

const two = [friend(1, 'Ana'), friend(2, 'Bob')];

const openWhoIsPaying = async () =>
    userEvent.click(screen.getByRole('button', { name: /paying/i }));

describe('AddBudget — visibility', () => {
    it('renders a trigger when editable', () => {
        const { container } = renderWithProviders(
            <AddBudget participants={two} onSubmit={vi.fn()} />
        );
        expect(container).not.toBeEmptyDOMElement();
    });

    it('hides entirely when isViewMode is set', () => {
        const { container } = renderWithProviders(
            <AddBudget participants={two} isViewMode onSubmit={vi.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the "Who is paying?" trigger with no budget and the edit trigger with one', () => {
        const { rerender } = renderWithProviders(
            <AddBudget participants={two} onSubmit={vi.fn()} />
        );
        expect(screen.getByRole('button', { name: /paying/i })).toBeInTheDocument();

        const budget: BudgetItem[] = [
            { id: 1, user: friend(1, 'Ana'), budget: '20' },
        ];
        rerender(<AddBudget participants={two} budget={budget} onSubmit={vi.fn()} />);
        expect(
            screen.getByRole('button', { name: /edit budget/i })
        ).toBeInTheDocument();
    });
});

describe('AddBudget — solo participant', () => {
    it('shows a static "Paid by" row (no picker/toggle) for a one-person trip', async () => {
        renderWithProviders(
            <AddBudget
                participants={[friend(9, 'Solo')]}
                cost={50}
                onSubmit={vi.fn()}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /edit budget|paying/i })
        );
        expect(screen.getByText('Solo')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('saves the full cost against the sole payer resolved from a prior budget', async () => {
        const onSubmit = vi.fn();
        renderWithProviders(
            <AddBudget
                participants={[friend(9, 'Solo')]}
                budget={[{ id: 1, user: friend(9, 'Solo'), budget: '10' }]}
                cost={50}
                onSubmit={onSubmit}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /edit budget/i })
        );
        await userEvent.click(
            screen.getByRole('button', { name: /save budget/i })
        );
        expect(onSubmit).toHaveBeenCalledWith([
            { user: expect.objectContaining({ id: 9 }), budget: '50' },
        ]);
    });
});

describe('AddBudget — multi participant', () => {
    it('offers a payer picker + split toggle and clears the budget when nobody is chosen', async () => {
        const onSubmit = vi.fn();
        renderWithProviders(
            <AddBudget participants={two} cost={80} onSubmit={onSubmit} />
        );
        await openWhoIsPaying();
        expect(
            screen.getByRole('combobox', { name: /select a payer/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('checkbox', { name: /split payment/i })
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /save budget/i })
        );
        expect(onSubmit).toHaveBeenCalledWith([]);
    });

    it('split mode records per-person amounts and totals them', async () => {
        const onSubmit = vi.fn();
        renderWithProviders(
            <AddBudget participants={two} cost={80} onSubmit={onSubmit} />
        );
        await openWhoIsPaying();
        await userEvent.click(
            screen.getByRole('checkbox', { name: /split payment/i })
        );
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs).toHaveLength(2);
        await userEvent.type(inputs[0], '30');
        await userEvent.type(inputs[1], '20');
        expect(screen.getByText(/\$50\.00/)).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /save budget/i })
        );
        expect(onSubmit).toHaveBeenCalledWith(
            expect.arrayContaining([
                { user: expect.objectContaining({ id: 1 }), budget: '30' },
                { user: expect.objectContaining({ id: 2 }), budget: '20' },
            ])
        );
    });

    it('reverts an unsaved split toggle when the modal is dismissed', async () => {
        renderWithProviders(
            <AddBudget participants={two} cost={80} onSubmit={vi.fn()} />
        );
        await openWhoIsPaying();
        const toggle = screen.getByRole('checkbox', { name: /split payment/i });
        await userEvent.click(toggle);
        expect(toggle).toBeChecked();
        // Dismiss via the modal's close (X) button.
        await userEvent.click(screen.getByRole('button', { name: /close/i }));
        await openWhoIsPaying();
        expect(
            screen.getByRole('checkbox', { name: /split payment/i })
        ).not.toBeChecked();
    });
});

describe('AddBudget — prefilled budget', () => {
    it('opens straight into split mode with two prior entries', async () => {
        const budget: BudgetItem[] = [
            { id: 1, user: friend(1, 'Ana'), budget: '30' },
            { id: 2, user: friend(2, 'Bob'), budget: '50' },
        ];
        renderWithProviders(
            <AddBudget participants={two} budget={budget} cost={80} onSubmit={vi.fn()} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /edit budget/i })
        );
        await waitFor(() =>
            expect(
                screen.getByRole('checkbox', { name: /split payment/i })
            ).toBeChecked()
        );
        expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
    });
});
