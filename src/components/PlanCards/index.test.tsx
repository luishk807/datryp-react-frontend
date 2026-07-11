import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

const mockStartCheckout = vi.fn();
let mockIsPending = false;
let mockError: Error | null = null;
vi.mock('api/hooks/useBilling', () => ({
    useStartCheckout: () => ({
        mutate: mockStartCheckout,
        isPending: mockIsPending,
        error: mockError,
    }),
}));

import PlanCards from './index';

beforeEach(() => {
    mockStartCheckout.mockReset();
    mockIsPending = false;
    mockError = null;
});

describe('PlanCards', () => {
    it('renders both plan tiers with their prices', () => {
        renderWithProviders(<PlanCards />);
        expect(screen.getByText('Monthly')).toBeInTheDocument();
        expect(screen.getByText('$3.99')).toBeInTheDocument();
        expect(screen.getByText('Yearly')).toBeInTheDocument();
        expect(screen.getByText('$29')).toBeInTheDocument();
        expect(screen.getByText('Save 39%')).toBeInTheDocument();
    });

    it('renders an optional headline and body', () => {
        renderWithProviders(
            <PlanCards headline="You hit the cap" body="Upgrade to keep going" />
        );
        expect(screen.getByText('You hit the cap')).toBeInTheDocument();
        expect(screen.getByText('Upgrade to keep going')).toBeInTheDocument();
    });

    it('starts monthly checkout when the monthly card is clicked', async () => {
        renderWithProviders(<PlanCards />);
        await userEvent.click(
            screen.getByRole('button', { name: /\$3\.99/ })
        );
        expect(mockStartCheckout).toHaveBeenCalledWith('monthly');
    });

    it('starts yearly checkout when the yearly card is clicked', async () => {
        renderWithProviders(<PlanCards />);
        await userEvent.click(screen.getByRole('button', { name: /\$29/ }));
        expect(mockStartCheckout).toHaveBeenCalledWith('yearly');
    });

    it('shows the trial note by default and hides it when disabled', () => {
        const { rerender } = renderWithProviders(<PlanCards />);
        expect(
            screen.getByText(/30-day free trial/)
        ).toBeInTheDocument();
        rerender(<PlanCards showTrialNote={false} />);
        expect(screen.queryByText(/30-day free trial/)).not.toBeInTheDocument();
    });

    it('disables both plan buttons while checkout is pending', () => {
        mockIsPending = true;
        renderWithProviders(<PlanCards />);
        expect(screen.getByRole('button', { name: /\$3\.99/ })).toBeDisabled();
        expect(screen.getByRole('button', { name: /\$29/ })).toBeDisabled();
    });

    it('surfaces a checkout error as an alert', () => {
        mockError = new Error('card declined');
        renderWithProviders(<PlanCards />);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(
            'Could not start checkout: card declined'
        );
    });
});
