import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

import MembershipWelcome from './index';

const withSession = '/membership-welcome?session_id=cs_test_123';

describe('MembershipWelcome', () => {
    it('renders the confirmation hero when a Stripe session_id is present', () => {
        renderWithProviders(<MembershipWelcome />, { route: withSession });
        expect(
            screen.getByRole('heading', { name: /Welcome to DaTryp.com Pro/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'What you can do now' })
        ).toBeInTheDocument();
    });

    it('renders the four perk bullets', () => {
        renderWithProviders(<MembershipWelcome />, { route: withSession });
        expect(
            screen.getByText('Save as many trips as you like.')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Advanced AI Search is unlocked.')
        ).toBeInTheDocument();
        expect(screen.getByText('No daily limits.')).toBeInTheDocument();
        expect(screen.getByText('Manage anytime.')).toBeInTheDocument();
    });

    it('renders the two action links and the fineprint', () => {
        renderWithProviders(<MembershipWelcome />, { route: withSession });
        expect(
            screen.getByRole('link', { name: /Start planning/i })
        ).toHaveAttribute('href', '/');
        expect(
            screen.getByRole('link', { name: /View subscription/i })
        ).toHaveAttribute('href', '/account#subscription');
        expect(
            screen.getByText(/A receipt for your subscription/i)
        ).toBeInTheDocument();
    });

    it('redirects to home when no Stripe session_id is present', () => {
        renderWithProviders(<MembershipWelcome />, {
            route: '/membership-welcome',
        });
        expect(
            screen.queryByRole('heading', { name: /Welcome to DaTryp.com Pro/i })
        ).not.toBeInTheDocument();
    });
});
