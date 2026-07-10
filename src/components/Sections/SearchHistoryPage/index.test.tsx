import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';

// Controlled query-hook state — flipped per test.
let mockData: unknown = undefined;
let mockIsLoading = false;
let mockIsError = false;
let mockError: unknown = null;

vi.mock('api/hooks/useSearchHistory', () => ({
    useSearchHistory: () => ({
        data: mockData,
        isLoading: mockIsLoading,
        isError: mockIsError,
        error: mockError,
    }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import SearchHistoryPage from './index';

const item = (query: string) => ({
    query,
    lastSearchedAt: new Date().toISOString(),
});

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
});

describe('SearchHistoryPage', () => {
    it('renders the title and skeleton rows while loading', () => {
        mockIsLoading = true;
        const { container } = renderWithProviders(<SearchHistoryPage />);
        expect(
            screen.getByRole('heading', { name: /your recent searches/i })
        ).toBeInTheDocument();
        expect(
            container.querySelectorAll('.search-history-page-row-skeleton')
        ).toHaveLength(6);
    });

    it('shows the empty state when there is no history', () => {
        mockData = { items: [], total: 0 };
        renderWithProviders(<SearchHistoryPage />);
        expect(screen.getByText(/no searches yet/i)).toBeInTheDocument();
    });

    it('shows a load error as an alert', () => {
        mockIsError = true;
        mockError = new Error('offline');
        renderWithProviders(<SearchHistoryPage />);
        expect(screen.getByRole('alert')).toHaveTextContent(/offline/i);
    });

    it('renders rows that deep-link back to the search, plus the unique-count', () => {
        mockData = { items: [item('bali'), item('kyoto temples')], total: 2 };
        renderWithProviders(<SearchHistoryPage />);
        expect(screen.getByText(/2 unique searches/i)).toBeInTheDocument();
        const row = screen.getByRole('link', { name: /bali/i });
        expect(row).toHaveAttribute('href', '/search?q=bali');
        // A query with spaces is URL-encoded in the deep link.
        expect(
            screen.getByRole('link', { name: /kyoto temples/i })
        ).toHaveAttribute('href', '/search?q=kyoto%20temples');
    });

    it('renders the pager and scrolls to top on page change', async () => {
        const scrollSpy = vi
            .spyOn(window, 'scrollTo')
            .mockImplementation(() => {});
        mockData = {
            items: Array.from({ length: 20 }, (_, i) => item(`q${i}`)),
            total: 45,
        };
        renderWithProviders(<SearchHistoryPage />);
        const pager = screen.getByRole('navigation', {
            name: /recent searches pagination/i,
        });
        expect(pager).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: /go to page 2/i })
        );
        expect(scrollSpy).toHaveBeenCalled();
    });
});
