import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

let mockState: { data: unknown; isLoading: boolean; error: unknown } = {
    data: undefined,
    isLoading: false,
    error: undefined,
};
vi.mock('api/hooks/useAdmin', () => ({
    useAdminSubscriptionStats: () => mockState,
}));

vi.mock('../SubscribersList', () => ({
    default: () => <div data-testid="subscribers-list" />,
}));

import SubscriptionCard from './index';

const data = {
    activeTrials: 3,
    cancellingAtPeriodEnd: 1,
    byStatus: [
        { key: 'active', count: 10 },
        { key: 'canceled', count: 4 },
        { key: 'none', count: 90 },
        // Unknown key falls back to the raw key in the bar label.
        { key: 'incomplete', count: 2 },
    ],
    byPlan: [
        { key: 'free', count: 90 },
        { key: 'pro', count: 10 },
    ],
};

beforeEach(() => {
    mockState = { data: undefined, isLoading: false, error: undefined };
});

describe('SubscriptionCard', () => {
    it('shows the loading state', () => {
        mockState = { data: undefined, isLoading: true, error: undefined };
        renderWithProviders(<SubscriptionCard />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('surfaces an error', () => {
        mockState = {
            data: undefined,
            isLoading: false,
            error: new Error('sub fail'),
        };
        renderWithProviders(<SubscriptionCard />);
        expect(screen.getByText('sub fail')).toBeInTheDocument();
    });

    it('renders the trial/cancel tiles, a status bar, and the subscribers list', () => {
        mockState = { data, isLoading: false, error: undefined };
        renderWithProviders(<SubscriptionCard />);
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        // Status bar maps raw keys to friendly labels.
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Canceled')).toBeInTheDocument();
        expect(screen.getByText('No sub')).toBeInTheDocument();
        // Unknown status key renders verbatim.
        expect(screen.getByText('incomplete')).toBeInTheDocument();
        expect(screen.getByTestId('subscribers-list')).toBeInTheDocument();
    });

    it('falls back to a generic message for a non-Error failure', () => {
        mockState = { data: undefined, isLoading: false, error: 'weird' };
        renderWithProviders(<SubscriptionCard />);
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
});
