import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { BudgetVerdict } from 'hooks/useBudgetVerdict';
import type { TripState } from 'types';

// The AI budget verdict wraps a networked suggestion hook — stub it so the
// meter renders deterministically. Most tests want it absent (null).
let mockVerdict: BudgetVerdict | null = null;
vi.mock('hooks/useBudgetVerdict', () => ({
    useBudgetVerdict: () => mockVerdict,
}));

import BudgetSummary from './index';

const trip = (budget: number, spent: number) =>
    ({
        budget,
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
                        activities: [{ id: 1, name: 'x', cost: spent }],
                    },
                ],
            },
        ],
    }) as unknown as TripState;

beforeEach(() => {
    mockVerdict = null;
});

describe('BudgetSummary', () => {
    it('reads "on track" when spend is well under budget', () => {
        renderWithProviders(<BudgetSummary data={trip(1000, 200)} />);
        expect(screen.getByText('$200.00')).toBeInTheDocument();
        expect(screen.getByText('$1,000.00')).toBeInTheDocument();
        expect(
            screen.getByText('On track · $800.00 remaining')
        ).toBeInTheDocument();
        expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('warns when spend gets close to the budget', () => {
        renderWithProviders(<BudgetSummary data={trip(1000, 850)} />);
        expect(
            screen.getByText('Getting close · $150.00 left')
        ).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('flags an over-budget trip', () => {
        renderWithProviders(<BudgetSummary data={trip(1000, 1200)} />);
        expect(
            screen.getByText('Over budget by $200.00')
        ).toBeInTheDocument();
        expect(screen.getByText('120%')).toBeInTheDocument();
    });

    it('prompts to set a budget when none is set', () => {
        renderWithProviders(<BudgetSummary data={trip(0, 100)} />);
        expect(
            screen.getByText('Set a budget on the trip details to track spending.')
        ).toBeInTheDocument();
        // No progress percent is shown in the empty state.
        expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    });

    it('renders the AI budget verdict chip when available', () => {
        mockVerdict = {
            tone: 'on',
            label: 'On target',
            why: 'Your budget lines up with typical spend.',
        };
        renderWithProviders(<BudgetSummary data={trip(1000, 200)} />);
        expect(screen.getByText('On target')).toBeInTheDocument();
    });

    it('toggles the collapsible detail body', async () => {
        renderWithProviders(
            <BudgetSummary data={trip(1000, 200)} collapsible />
        );
        const toggle = screen.getByRole('button', {
            name: 'Hide budget details',
        });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(toggle);
        expect(
            screen.getByRole('button', { name: 'Show budget details' })
        ).toHaveAttribute('aria-expanded', 'false');
    });
});
