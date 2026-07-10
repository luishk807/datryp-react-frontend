import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

interface HookState {
    data: unknown;
    isLoading: boolean;
}
let mockOverview: HookState = { data: undefined, isLoading: false };
let mockSubGrowth: HookState = { data: undefined, isLoading: false };
let mockAi: HookState = { data: undefined, isLoading: false };

vi.mock('api/hooks/useAdmin', () => ({
    useAdminOverview: () => mockOverview,
    useAdminSubscriptionGrowth: () => mockSubGrowth,
    useAdminAiUsage: () => mockAi,
}));

vi.mock('../BarChart', () => ({
    default: () => <div data-testid="bar-chart" />,
}));
vi.mock('../LineChart', () => ({
    default: () => <div data-testid="line-chart" />,
}));
vi.mock('../PosthogStatsCard', () => ({
    default: () => <div data-testid="posthog-card" />,
}));

import OverviewCard from './index';

const aiData = {
    months: [{ month: '2026-06', aiCalls: 40, cacheHits: 60 }],
    totalAiCalls: 40,
    totalCacheHits: 60,
    totalEstimatedCostUsd: 0.4,
    estimatedCostPerCallUsd: 0.01,
};

const overviewData = {
    recentSignups: [
        {
            id: 'u1',
            email: 'al@example.com',
            name: 'Al',
            role: 'user',
            subscriptionPlan: 'free',
            createdAt: '2026-01-01T00:00:00Z',
        },
    ],
};

beforeEach(() => {
    mockOverview = { data: undefined, isLoading: false };
    mockSubGrowth = { data: undefined, isLoading: false };
    mockAi = { data: undefined, isLoading: false };
});

describe('OverviewCard', () => {
    it('renders all section headings', () => {
        renderWithProviders(<OverviewCard />);
        expect(
            screen.getByRole('heading', { name: 'Subscription growth' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'AI search expense' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Recent signups' })
        ).toBeInTheDocument();
    });

    it('shows loading states across the sections', () => {
        mockSubGrowth = { data: undefined, isLoading: true };
        mockAi = { data: undefined, isLoading: true };
        mockOverview = { data: undefined, isLoading: true };
        renderWithProviders(<OverviewCard />);
        expect(screen.getAllByText('Loading…').length).toBeGreaterThanOrEqual(3);
    });

    it('renders the subscription-growth line chart when data arrives', () => {
        mockSubGrowth = {
            data: { months: [{ month: '2026-01', count: 5 }] },
            isLoading: false,
        };
        renderWithProviders(<OverviewCard />);
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('renders AI usage totals, cost, and the bar chart', () => {
        mockAi = { data: aiData, isLoading: false };
        renderWithProviders(<OverviewCard />);
        expect(screen.getByText('40')).toBeInTheDocument();
        expect(screen.getByText('60')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        // Both the total cost and the per-call footnote format as USD.
        expect(screen.getByText('$0.40')).toBeInTheDocument();
        expect(screen.getAllByText(/\$0\.01/).length).toBeGreaterThanOrEqual(1);
    });

    it('lists recent signups with plan + admin tags', () => {
        mockOverview = {
            data: {
                recentSignups: [
                    { ...overviewData.recentSignups[0] },
                    {
                        id: 'u2',
                        email: 'boss@example.com',
                        name: null,
                        role: 'admin',
                        subscriptionPlan: 'pro',
                        createdAt: '2026-02-01T00:00:00Z',
                    },
                ],
            },
            isLoading: false,
        };
        renderWithProviders(<OverviewCard />);
        expect(screen.getByText('al@example.com')).toBeInTheDocument();
        expect(screen.getByText('boss@example.com')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('pro')).toBeInTheDocument();
    });

    it('shows the empty signups state', () => {
        mockOverview = { data: { recentSignups: [] }, isLoading: false };
        renderWithProviders(<OverviewCard />);
        expect(screen.getByText('No signups yet.')).toBeInTheDocument();
    });
});
