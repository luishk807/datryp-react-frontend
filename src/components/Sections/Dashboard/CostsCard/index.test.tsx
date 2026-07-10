import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

let mockState: { data: unknown; isLoading: boolean; error: unknown } = {
    data: undefined,
    isLoading: false,
    error: undefined,
};
vi.mock('api/hooks/useAdmin', () => ({
    useAdminCostAnalytics: () => mockState,
}));

import CostsCard from './index';

const data = {
    totalEstimatedCostUsd: 12.5,
    totalOpenaiCalls: 1200,
    totalCachedServed: 3400,
    estimatedCostPerCallUsd: 0.015,
    features: [
        {
            feature: 'place_details',
            label: 'Place details',
            openaiCalls: 100,
            callsPerUnit: 3,
            estimatedCostUsd: 1.5,
            cachedServed: 200,
            tracked: true,
            note: 'prose + lists + facts',
        },
        {
            feature: 'google_places',
            label: 'Google Places ratings',
            openaiCalls: 0,
            callsPerUnit: 1,
            estimatedCostUsd: 0,
            cachedServed: 0,
            tracked: false,
            note: 'not persistently tracked',
        },
    ],
};

beforeEach(() => {
    mockState = { data: undefined, isLoading: false, error: undefined };
});

describe('CostsCard', () => {
    it('shows the loading state', () => {
        mockState = { data: undefined, isLoading: true, error: undefined };
        renderWithProviders(<CostsCard />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('surfaces an error message', () => {
        mockState = {
            data: undefined,
            isLoading: false,
            error: new Error('cost fail'),
        };
        renderWithProviders(<CostsCard />);
        expect(screen.getByText('cost fail')).toBeInTheDocument();
    });

    it('renders headline tiles and a per-feature cost table', () => {
        mockState = { data, isLoading: false, error: undefined };
        renderWithProviders(<CostsCard />);
        expect(screen.getByText('$12.50')).toBeInTheDocument();
        expect(screen.getByText('1,200')).toBeInTheDocument();
        expect(screen.getByText('3,400')).toBeInTheDocument();
        expect(screen.getByText('Place details')).toBeInTheDocument();
        // callsPerUnit > 1 renders the "×N/gen" sub-note.
        expect(screen.getByText('×3/gen')).toBeInTheDocument();
        expect(screen.getByText('prose + lists + facts')).toBeInTheDocument();
    });

    it('marks untracked features with a tag and dashes', () => {
        mockState = { data, isLoading: false, error: undefined };
        renderWithProviders(<CostsCard />);
        expect(screen.getByText('untracked')).toBeInTheDocument();
        expect(screen.getByText('Google Places ratings')).toBeInTheDocument();
        // The untracked row uses em-dashes for its numeric cells.
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
    });

    it('exposes the table with accessible row/columnheader roles', () => {
        mockState = { data, isLoading: false, error: undefined };
        renderWithProviders(<CostsCard />);
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Feature' })
        ).toBeInTheDocument();
    });
});
