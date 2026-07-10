import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';

let mockState: {
    data: unknown;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
} = { data: undefined, isLoading: false, isFetching: false, error: undefined };
const mockParams: Array<{ page: number; perPage: number; days: number }> = [];
vi.mock('api/hooks/useAdmin', () => ({
    useAdminTopSearches: (p: { page: number; perPage: number; days: number }) => {
        mockParams.push(p);
        return mockState;
    },
}));

import TopSearchesList from './index';

beforeEach(() => {
    mockState = {
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: undefined,
    };
    mockParams.length = 0;
});

describe('TopSearchesList', () => {
    it('shows the loading state', () => {
        mockState = { ...mockState, isLoading: true };
        renderWithProviders(<TopSearchesList />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('surfaces an error', () => {
        mockState = { ...mockState, error: new Error('search fail') };
        renderWithProviders(<TopSearchesList />);
        expect(screen.getByText('search fail')).toBeInTheDocument();
    });

    it('shows the empty state', () => {
        mockState = { ...mockState, data: { items: [], total: 0 } };
        renderWithProviders(<TopSearchesList />);
        expect(
            screen.getByText('No searches recorded in this window yet.')
        ).toBeInTheDocument();
    });

    it('renders ranked rows with query text and counts', () => {
        mockState = {
            ...mockState,
            data: {
                items: [
                    { query: 'bali', count: 42 },
                    { query: 'tokyo', count: 30 },
                ],
                total: 2,
            },
        };
        renderWithProviders(<TopSearchesList />);
        expect(screen.getByText('bali')).toBeInTheDocument();
        expect(screen.getByText('tokyo')).toBeInTheDocument();
        expect(screen.getByText('#1')).toBeInTheDocument();
        expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('switches the window and resets to page 1', async () => {
        mockState = {
            ...mockState,
            data: { items: [{ query: 'bali', count: 42 }], total: 1 },
        };
        renderWithProviders(<TopSearchesList />);
        await userEvent.click(screen.getByRole('button', { name: '30d' }));
        const last = mockParams[mockParams.length - 1];
        expect(last.days).toBe(30);
        expect(last.page).toBe(1);
        expect(screen.getByRole('button', { name: '30d' })).toHaveClass(
            'is-active'
        );
    });

    it('paginates through multiple pages', async () => {
        mockState = {
            ...mockState,
            data: { items: [{ query: 'bali', count: 42 }], total: 25 },
        };
        renderWithProviders(<TopSearchesList />);
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Prev/ })).toBeDisabled();
        await userEvent.click(screen.getByRole('button', { name: /Next/ }));
        expect(mockParams[mockParams.length - 1].page).toBe(2);
    });
});
