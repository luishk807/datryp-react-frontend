import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import { QueryBlockedError } from 'api/moderationError';
import { SearchQuotaExceededError } from 'api/searchQuotaError';
import type { PlaceRecommendation } from 'types';

// Controlled query-hook state — flipped per test.
let mockData: unknown = undefined;
let mockIsLoading = false;
let mockIsError = false;
let mockError: unknown = null;

vi.mock('api/hooks/useSearchPlaces', () => ({
    useSearchPlaces: () => ({
        data: mockData,
        isLoading: mockIsLoading,
        isError: mockIsError,
        error: mockError,
    }),
}));

vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ title, children }: { title?: string; children: ReactNode }) => (
        <div>
            <h1>{title}</h1>
            {children}
        </div>
    ),
}));

vi.mock('components/PlaceResultCard', () => ({
    default: ({ place }: { place: PlaceRecommendation }) => (
        <div data-testid="place-card">{place.name}</div>
    ),
}));

vi.mock('components/PlaceResultCardSkeleton', () => ({
    default: ({ count }: { count?: number }) => (
        <div data-testid="place-skeleton" data-count={count ?? 1} />
    ),
}));

vi.mock('components/PlanCards', () => ({
    default: () => <div data-testid="plan-cards" />,
}));

import SearchResults from './index';

const place = (name: string): PlaceRecommendation => ({
    name,
    city: 'City',
    country: 'Country',
    countryCode: 'US',
    rating: 4.5,
    bestTimeToVisit: 'May',
    description: 'Nice',
    imageUrl: null,
    photographerName: null,
    photographerUrl: null,
    latitude: null,
    longitude: null,
});

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
});

describe('SearchResults', () => {
    it('prompts to start a search when there is no query', () => {
        renderWithProviders(<SearchResults />, { route: '/search' });
        expect(
            screen.getByText(/start a search from the homepage/i)
        ).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            /search/i
        );
    });

    it('titles the page for the active query', () => {
        mockData = { query: 'beaches', cached: false, items: [] };
        renderWithProviders(<SearchResults />, { route: '/search?q=beaches' });
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
            /beaches/i
        );
    });

    it('renders a busy skeleton grid while loading', () => {
        mockIsLoading = true;
        renderWithProviders(<SearchResults />, { route: '/search?q=beaches' });
        expect(screen.getByTestId('place-skeleton')).toBeInTheDocument();
    });

    it('previews the skeleton in debug mode with a custom count', () => {
        renderWithProviders(<SearchResults />, {
            route: '/search?debug=skeleton&count=3',
        });
        expect(screen.getByTestId('place-skeleton')).toHaveAttribute(
            'data-count',
            '3'
        );
    });

    it('renders result cards, the AI summary and related-search chips', () => {
        mockData = {
            query: 'ruins',
            cached: false,
            summary: 'Ancient ruins span the globe.',
            items: [place('Machu Picchu'), place('Colosseum')],
            relatedSearches: ['temples', 'castles'],
        };
        renderWithProviders(<SearchResults />, { route: '/search?q=ruins' });
        expect(screen.getAllByTestId('place-card')).toHaveLength(2);
        expect(screen.getByText('Machu Picchu')).toBeInTheDocument();
        expect(
            screen.getByText('Ancient ruins span the globe.')
        ).toBeInTheDocument();
        const related = screen.getByRole('navigation', {
            name: /related searches/i,
        });
        const chip = screen.getByRole('link', { name: 'temples' });
        expect(related).toContainElement(chip);
        expect(chip).toHaveAttribute('href', '/search?q=temples');
    });

    it('shows the empty "no matches" state', () => {
        mockData = { query: 'zzz', cached: false, items: [] };
        renderWithProviders(<SearchResults />, { route: '/search?q=zzz' });
        expect(screen.getByText(/no matches for/i)).toBeInTheDocument();
    });

    it('shows a generic load error as an alert', () => {
        mockIsError = true;
        mockError = new Error('backend exploded');
        renderWithProviders(<SearchResults />, { route: '/search?q=beaches' });
        expect(screen.getByRole('alert')).toHaveTextContent(/backend exploded/i);
    });

    it('renders the travel-scope blocked message', () => {
        mockIsError = true;
        mockError = new QueryBlockedError('off_topic');
        renderWithProviders(<SearchResults />, { route: '/search?q=stocks' });
        expect(screen.getByText(/travel planner/i)).toBeInTheDocument();
    });

    it('renders the quota-exceeded upsell with plan cards', () => {
        mockIsError = true;
        mockError = new SearchQuotaExceededError({ limit: 15, used: 15 });
        renderWithProviders(<SearchResults />, { route: '/search?q=beaches' });
        expect(
            screen.getByText(/free searches for today/i)
        ).toBeInTheDocument();
        expect(screen.getByTestId('plan-cards')).toBeInTheDocument();
    });
});
