import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

let mockData: unknown = undefined;
let mockIsLoading = false;
const mockWindows: number[] = [];
vi.mock('api/hooks/useAdmin', () => ({
    useAdminPosthogStats: (days: number) => {
        mockWindows.push(days);
        return { data: mockData, isLoading: mockIsLoading };
    },
}));

vi.mock('../LineChart', () => ({
    default: () => <div data-testid="line-chart" />,
}));

import PosthogStatsCard from './index';

const configured = {
    configured: true,
    windowDays: 30,
    totalEvents: 1000,
    uniqueUsers: 200,
    topEvents: [
        { event: 'search', count: 500 },
        { event: 'view_place', count: 120 },
    ],
    dailyEvents: [
        { day: '2026-07-01', count: 100 },
        { day: '2026-07-02', count: 150 },
    ],
};

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
    mockWindows.length = 0;
});

describe('PosthogStatsCard', () => {
    it('renders the loading state before data arrives', () => {
        mockIsLoading = true;
        renderWithProviders(<PosthogStatsCard />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('shows the not-configured setup prompt', () => {
        mockData = { configured: false, dailyEvents: [], topEvents: [] };
        renderWithProviders(<PosthogStatsCard />);
        expect(
            screen.getByRole('heading', { name: /isn.t configured yet/i })
        ).toBeInTheDocument();
        expect(screen.getByText('POSTHOG_API_KEY')).toBeInTheDocument();
    });

    it('renders tiles, top-events list, and the daily chart when configured', () => {
        mockData = configured;
        renderWithProviders(<PosthogStatsCard />);
        expect(screen.getByText('1,000')).toBeInTheDocument();
        expect(screen.getByText('200')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Top events' })
        ).toBeInTheDocument();
        expect(screen.getByText('view_place')).toBeInTheDocument();
        // Top-event tile echoes the leader with its fire count in the hint.
        expect(screen.getByText('500 fires')).toBeInTheDocument();
    });

    it('changes the rolling window when a window button is clicked', async () => {
        mockData = configured;
        renderWithProviders(<PosthogStatsCard />);
        // Default fetch is 30 days.
        expect(mockWindows).toContain(30);
        await userEvent.click(screen.getByRole('button', { name: '90d' }));
        expect(mockWindows).toContain(90);
        expect(screen.getByRole('button', { name: '90d' })).toHaveClass(
            'is-active'
        );
    });

    it('handles a configured window with no daily data or events', () => {
        mockData = {
            configured: true,
            windowDays: 7,
            totalEvents: 0,
            uniqueUsers: 0,
            topEvents: [],
            dailyEvents: [],
        };
        renderWithProviders(<PosthogStatsCard />);
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
        // Top-event tile falls back to a dash.
        expect(screen.getByText('—')).toBeInTheDocument();
    });
});
