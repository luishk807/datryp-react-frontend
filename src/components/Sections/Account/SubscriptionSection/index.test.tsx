import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../test/renderWithProviders';
import { SUBSCRIPTION_STATUS } from 'constants';

const mockPortalMutate = vi.fn();
let mockUser: Record<string, unknown> | null = null;
let mockIsAdmin = false;
let mockPortalPending = false;
let mockPortalError: Error | null = null;

vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

vi.mock('api/hooks/useBilling', () => ({
    useOpenBillingPortal: () => ({
        mutate: mockPortalMutate,
        isPending: mockPortalPending,
        error: mockPortalError,
    }),
}));

vi.mock('components/PlanCards', () => ({
    default: ({ headline, body }: { headline?: string; body?: string }) => (
        <div data-testid="plan-cards">
            <span>{headline}</span>
            <span>{body}</span>
        </div>
    ),
}));

import SubscriptionSection from './index';

const makeUser = (over: Record<string, unknown> = {}) => ({
    subscriptionStatus: SUBSCRIPTION_STATUS.NONE,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    effectiveTripCap: 1,
    freeEverythingActive: false,
    freeEverythingUntil: null,
    ...over,
});

beforeEach(() => {
    mockUser = makeUser();
    mockIsAdmin = false;
    mockPortalPending = false;
    mockPortalError = null;
    mockPortalMutate.mockReset();
});

describe('SubscriptionSection', () => {
    it('renders nothing when there is no user', () => {
        mockUser = null;
        const { container } = renderWithProviders(<SubscriptionSection />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the admin bypass callout for admins', () => {
        mockIsAdmin = true;
        renderWithProviders(<SubscriptionSection />);
        expect(
            screen.getByRole('heading', { name: 'Subscription' })
        ).toBeInTheDocument();
        expect(screen.getByText('Admin account')).toBeInTheDocument();
        expect(
            screen.getByText(/paywalls don't apply to you/i)
        ).toBeInTheDocument();
    });

    it('shows the trial state with the end date and a Manage billing button', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.TRIALING,
            trialEndsAt: '2026-05-18T00:00:00Z',
        });
        renderWithProviders(<SubscriptionSection />);
        expect(screen.getByText('DaTryp.com Pro')).toBeInTheDocument();
        expect(screen.getByText(/Free trial ends/i)).toBeInTheDocument();
        // Date text is timezone-formatted (toLocaleDateString) — assert the
        // year is present rather than an exact day that shifts across TZs.
        expect(screen.getByText(/2026/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Manage billing' })
        ).toBeInTheDocument();
    });

    it('shows the active/renews state and opens the billing portal on click', async () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodEnd: '2026-06-17T00:00:00Z',
        });
        renderWithProviders(<SubscriptionSection />);
        expect(screen.getByText(/Renews/i)).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Manage billing' })
        );
        expect(mockPortalMutate).toHaveBeenCalledTimes(1);
    });

    it('hides the renews line when there is no period end date', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodEnd: null,
        });
        renderWithProviders(<SubscriptionSection />);
        expect(screen.queryByText(/Renews/i)).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Manage billing' })
        ).toBeInTheDocument();
    });

    it('shows the past-due state with an Update payment method button', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.PAST_DUE,
            currentPeriodEnd: '2026-06-17T00:00:00Z',
        });
        renderWithProviders(<SubscriptionSection />);
        expect(
            screen.getByText(/Your last payment failed/i)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Update payment method' })
        ).toBeInTheDocument();
    });

    it('shows a cancelling subscription with the access-ends line and resume button', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodEnd: '2026-06-17T00:00:00Z',
            cancelAtPeriodEnd: true,
        });
        renderWithProviders(<SubscriptionSection />);
        expect(
            screen.getByText('DaTryp.com Pro — Cancelling')
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Your subscription is cancelled/i)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Resume or update billing' })
        ).toBeInTheDocument();
    });

    it('shows a cancelling trial with the trial-cancelled copy', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.TRIALING,
            trialEndsAt: '2026-05-18T00:00:00Z',
            cancelAtPeriodEnd: true,
        });
        renderWithProviders(<SubscriptionSection />);
        expect(
            screen.getByText(/Your trial is cancelled/i)
        ).toBeInTheDocument();
    });

    it('surfaces a portal error and a disabled Opening… button while pending', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodEnd: '2026-06-17T00:00:00Z',
        });
        mockPortalPending = true;
        mockPortalError = new Error('portal down');
        renderWithProviders(<SubscriptionSection />);
        const btn = screen.getByRole('button', { name: 'Opening…' });
        expect(btn).toBeDisabled();
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/portal down/);
    });

    it('shows the free-everything override with an expiry date', () => {
        mockUser = makeUser({
            freeEverythingActive: true,
            freeEverythingUntil: '2026-07-30T12:04:00Z',
        });
        renderWithProviders(<SubscriptionSection />);
        expect(
            screen.getByText(/Pro is currently free for everyone/)
        ).toBeInTheDocument();
        expect(
            screen.getByText(/All accounts have full Pro access until/i)
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /See plan comparison/i })
        ).toBeInTheDocument();
    });

    it('shows the free-everything override without a date', () => {
        mockUser = makeUser({
            freeEverythingActive: true,
            freeEverythingUntil: null,
        });
        renderWithProviders(<SubscriptionSection />);
        expect(
            screen.getByText(
                'All accounts have full Pro access right now — no subscription needed.'
            )
        ).toBeInTheDocument();
    });

    it('shows the free plan with a trip cap and the upgrade PlanCards', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.NONE,
            effectiveTripCap: 1,
        });
        renderWithProviders(<SubscriptionSection />);
        expect(screen.getByText('Free plan')).toBeInTheDocument();
        expect(screen.getByText(/Save up to/i)).toBeInTheDocument();
        expect(screen.getByTestId('plan-cards')).toHaveTextContent(
            'Upgrade to Pro'
        );
    });

    it('shows the canceled state with the resubscribe headline', () => {
        mockUser = makeUser({
            subscriptionStatus: SUBSCRIPTION_STATUS.CANCELED,
        });
        renderWithProviders(<SubscriptionSection />);
        expect(
            screen.getByText('Your previous subscription has ended.')
        ).toBeInTheDocument();
        expect(screen.getByTestId('plan-cards')).toHaveTextContent(
            'Resubscribe to Pro'
        );
    });
});
