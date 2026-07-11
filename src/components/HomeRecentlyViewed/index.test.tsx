import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';

// The hook self-gates on the logged-in user internally; the component just
// reads `data?.items`. Control the returned page directly.
let mockData: { items: Array<{ query: string; lastSearchedAt: string }> } | undefined = {
    items: [],
};
vi.mock('api/hooks/useSearchHistory', () => ({
    useSearchHistory: () => ({ data: mockData }),
}));

import HomeRecentlyViewed from './index';

beforeEach(() => {
    mockData = { items: [] };
});

describe('HomeRecentlyViewed', () => {
    it('renders nothing when the history page has no items', () => {
        const { container } = renderWithProviders(<HomeRecentlyViewed />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there is no data yet', () => {
        mockData = undefined;
        const { container } = renderWithProviders(<HomeRecentlyViewed />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a re-runnable card per recent search', () => {
        mockData = {
            items: [
                { query: 'New York', lastSearchedAt: '2026-07-09T00:00:00Z' },
                { query: 'Bali', lastSearchedAt: '2026-07-08T00:00:00Z' },
            ],
        };
        renderWithProviders(<HomeRecentlyViewed />);

        expect(
            screen.getByRole('heading', { name: /recently viewed/i })
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /see all/i })).toHaveAttribute(
            'href',
            '/history'
        );

        // Each card links back to /search with the query URL-encoded.
        expect(
            screen.getByRole('link', { name: /New York/i })
        ).toHaveAttribute('href', '/search?q=New%20York');
        expect(screen.getByRole('link', { name: /Bali/i })).toHaveAttribute(
            'href',
            '/search?q=Bali'
        );
    });
});
