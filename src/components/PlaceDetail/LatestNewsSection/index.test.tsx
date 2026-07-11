import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { LatestNewsResult } from 'api/newsApi';

let mockData: LatestNewsResult | undefined;
let mockIsLoading = false;
let mockLastQuery = '';
vi.mock('api/hooks/useLatestNews', () => ({
    useLatestNews: (q: string) => {
        mockLastQuery = q;
        return { data: mockData, isLoading: mockIsLoading };
    },
}));

import LatestNewsSection from './index';

const item = (over: Partial<NonNullable<LatestNewsResult['item']>> = {}) => ({
    title: 'Bullet train adds a new night route',
    link: 'https://news.example/story',
    source: 'Japan Times',
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    ...over,
});

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
    mockLastQuery = '';
});

describe('LatestNewsSection', () => {
    it('renders nothing when neither country nor place is set', () => {
        const { container } = renderWithProviders(
            <LatestNewsSection country="" placeName={null} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('builds the query from place + country + "travel"', () => {
        mockData = { item: item() };
        renderWithProviders(
            <LatestNewsSection country="France" placeName="Paris" />
        );
        expect(mockLastQuery).toBe('Paris France travel');
    });

    it('renders skeleton bars while the headline is loading', () => {
        mockIsLoading = true;
        const { container } = renderWithProviders(
            <LatestNewsSection country="Japan" />
        );
        expect(
            screen.getByRole('heading', { name: /latest news/i })
        ).toBeInTheDocument();
        expect(container.querySelectorAll('.skeleton').length).toBe(2);
    });

    it('renders nothing once loaded with no top story', () => {
        mockData = { item: null };
        mockIsLoading = false;
        const { container } = renderWithProviders(
            <LatestNewsSection country="Japan" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the headline, source, relative time, and a go-to-source link', () => {
        mockData = { item: item() };
        renderWithProviders(<LatestNewsSection placeName="Tokyo" />);
        expect(
            screen.getByText(/bullet train adds a new night route/i)
        ).toBeInTheDocument();
        expect(screen.getByText('Japan Times')).toBeInTheDocument();
        expect(screen.getByText('3h ago')).toBeInTheDocument();
        const cta = screen.getByRole('link', { name: /go to source/i });
        expect(cta).toHaveAttribute('href', 'https://news.example/story');
        expect(cta).toHaveAttribute('target', '_blank');
    });

    it('formats an older story as a day-count', () => {
        mockData = {
            item: item({
                publishedAt: new Date(
                    Date.now() - 2 * 24 * 60 * 60 * 1000
                ).toISOString(),
            }),
        };
        renderWithProviders(<LatestNewsSection placeName="Tokyo" />);
        expect(screen.getByText('2d ago')).toBeInTheDocument();
    });
});
