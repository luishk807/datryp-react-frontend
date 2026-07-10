import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, within } from '../../../test/renderWithProviders';

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// PlanCards owns the Stripe-checkout CTA (billing hooks); stub it so this
// marketing page renders offline. It appears twice (top + bottom).
vi.mock('components/PlanCards', () => ({
    default: () => <div data-testid="plan-cards">Plan cards</div>,
}));

import Membership from './index';

describe('Membership', () => {
    it('renders the pricing hero heading', () => {
        renderWithProviders(<Membership />);
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Plan smarter. Plan more.',
            })
        ).toBeInTheDocument();
    });

    it('renders the plan cards at the top and bottom of the page', () => {
        renderWithProviders(<Membership />);
        expect(screen.getAllByTestId('plan-cards')).toHaveLength(2);
    });

    it('renders the feature-comparison table with Free and Pro columns', () => {
        renderWithProviders(<Membership />);
        const table = screen.getByRole('table');
        expect(
            within(table).getByRole('columnheader', { name: 'Free' })
        ).toBeInTheDocument();
        expect(
            within(table).getByRole('columnheader', { name: /Pro/ })
        ).toBeInTheDocument();
        // 15 feature rows + the header row.
        expect(within(table).getAllByRole('row').length).toBeGreaterThanOrEqual(
            15
        );
    });

    it('marks included/excluded cells with accessible icon labels', () => {
        renderWithProviders(<Membership />);
        expect(screen.getAllByLabelText('Included').length).toBeGreaterThan(0);
        expect(
            screen.getAllByLabelText('Not included').length
        ).toBeGreaterThan(0);
    });

    it('renders the why-upgrade and FAQ sections', () => {
        renderWithProviders(<Membership />);
        expect(
            screen.getByRole('heading', { name: 'Why upgrade?' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Common questions' })
        ).toBeInTheDocument();
        // Five FAQ entries, each an h3.
        expect(
            screen.getAllByRole('heading', { level: 3 }).length
        ).toBeGreaterThanOrEqual(5);
    });
});
