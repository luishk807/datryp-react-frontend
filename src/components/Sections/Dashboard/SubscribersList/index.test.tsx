import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

let mockState: {
    data: unknown;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
} = { data: undefined, isLoading: false, isFetching: false, error: undefined };
const mockParams: Array<{ sort: string; page: number; perPage: number }> = [];
vi.mock('api/hooks/useAdmin', () => ({
    useAdminSubscribers: (p: { sort: string; page: number; perPage: number }) => {
        mockParams.push(p);
        return mockState;
    },
}));

import SubscribersList from './index';

const row = (over: Record<string, unknown> = {}) => ({
    id: 's1',
    email: 'sub@example.com',
    name: 'Sub',
    subscriptionPlan: 'pro',
    subscriptionStatus: 'active',
    subscriptionCancelAtPeriodEnd: false,
    currentPeriodEnd: '2026-08-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...over,
});

beforeEach(() => {
    mockState = {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: undefined,
    };
    mockParams.length = 0;
});

describe('SubscribersList', () => {
    it('shows the loading state', () => {
        mockState = { ...mockState, isLoading: true };
        renderWithProviders(<SubscribersList />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('surfaces an error', () => {
        mockState = { ...mockState, error: new Error('nope') };
        renderWithProviders(<SubscribersList />);
        expect(screen.getByText('nope')).toBeInTheDocument();
    });

    it('shows the empty state', () => {
        mockState = { ...mockState, data: { items: [], total: 0 } };
        renderWithProviders(<SubscribersList />);
        expect(screen.getByText('No paid subscribers yet.')).toBeInTheDocument();
    });

    it('renders subscriber rows with plan, status, and cancel tags', () => {
        mockState = {
            ...mockState,
            data: {
                items: [row({ subscriptionCancelAtPeriodEnd: true })],
                total: 1,
            },
        };
        renderWithProviders(<SubscribersList />);
        expect(screen.getByText('sub@example.com')).toBeInTheDocument();
        expect(screen.getByText('pro')).toBeInTheDocument();
        expect(screen.getByText('active')).toBeInTheDocument();
        expect(screen.getByText('cancelling')).toBeInTheDocument();
    });

    it('re-queries with the chosen sort and resets to page 1', async () => {
        mockState = { ...mockState, data: { items: [row()], total: 1 } };
        renderWithProviders(<SubscribersList />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Email A-Z' })
        );
        const last = mockParams[mockParams.length - 1];
        expect(last.sort).toBe('email');
        expect(last.page).toBe(1);
        expect(screen.getByRole('button', { name: 'Email A-Z' })).toHaveClass(
            'is-active'
        );
    });

    it('paginates: Prev disabled on page 1, Next advances the page', async () => {
        mockState = {
            ...mockState,
            data: { items: [row()], total: 25 },
        };
        renderWithProviders(<SubscribersList />);
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Prev/ })
        ).toBeDisabled();
        await userEvent.click(screen.getByRole('button', { name: /Next/ }));
        const last = mockParams[mockParams.length - 1];
        expect(last.page).toBe(2);
    });
});
