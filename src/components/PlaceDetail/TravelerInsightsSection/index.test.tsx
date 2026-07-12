import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { ReviewInsights } from 'api/reviewsApi';

let mockData: ReviewInsights | undefined;
vi.mock('api/hooks/useReviews', () => ({
    usePlaceReviewInsights: () => ({ data: mockData }),
}));

import TravelerInsightsSection from './index';

const insights = (over: Partial<ReviewInsights> = {}): ReviewInsights => ({
    placeKey: 'senso-ji',
    total: 8,
    verifiedCount: 8,
    averageRating: 4.5,
    expectations: {
        total: 8,
        better: 5,
        asExpected: 2,
        overhyped: 1,
        livedUpPct: 75,
    },
    topTags: [
        { slug: 'delicious', count: 6, pct: 80 },
        { slug: 'hidden_gem', count: 4, pct: 50 },
    ],
    ...over,
});

beforeEach(() => {
    mockData = undefined;
});

describe('TravelerInsightsSection', () => {
    it('renders nothing until at least one traveler has reviewed', () => {
        const { container } = renderWithProviders(
            <TravelerInsightsSection placeKey="senso-ji" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the total is zero', () => {
        mockData = insights({ total: 0 });
        const { container } = renderWithProviders(
            <TravelerInsightsSection placeKey="senso-ji" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the based-on count, expectations breakdown, and top chips', () => {
        mockData = insights();
        renderWithProviders(<TravelerInsightsSection placeKey="senso-ji" />);

        expect(
            screen.getByRole('heading', { name: /verified traveler insights/i })
        ).toBeInTheDocument();
        expect(screen.getByText('From 8 verified visits')).toBeInTheDocument();
        expect(
            screen.getByText('75% said it lived up to expectations')
        ).toBeInTheDocument();
        expect(screen.getByText('Better than expected')).toBeInTheDocument();
        expect(screen.getByText('As expected')).toBeInTheDocument();
        expect(screen.getByText('Overhyped')).toBeInTheDocument();

        expect(screen.getByText('Most mentioned')).toBeInTheDocument();
        expect(screen.getByText('Delicious')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('uses the singular based-on copy for a single verified visit', () => {
        mockData = insights({
            total: 1,
            verifiedCount: 1,
            expectations: {
                total: 0,
                better: 0,
                asExpected: 0,
                overhyped: 0,
                livedUpPct: 0,
            },
            topTags: [],
        });
        renderWithProviders(<TravelerInsightsSection placeKey="senso-ji" />);
        expect(screen.getByText('From 1 verified visit')).toBeInTheDocument();
    });

    it('hides the expectations block when no one answered it', () => {
        mockData = insights({
            expectations: {
                total: 0,
                better: 0,
                asExpected: 0,
                overhyped: 0,
                livedUpPct: 0,
            },
        });
        const { container } = renderWithProviders(
            <TravelerInsightsSection placeKey="senso-ji" />
        );
        expect(container.querySelector('.ti-expect')).not.toBeInTheDocument();
        // Chips still render.
        expect(screen.getByText('Most mentioned')).toBeInTheDocument();
    });

    it('hides the chips block when there are no top tags', () => {
        mockData = insights({ topTags: [] });
        const { container } = renderWithProviders(
            <TravelerInsightsSection placeKey="senso-ji" />
        );
        expect(container.querySelector('.ti-chips')).not.toBeInTheDocument();
        // Expectations still render.
        expect(
            screen.getByText('75% said it lived up to expectations')
        ).toBeInTheDocument();
    });

    it('makes each expectation row and chip a tab stop named "label: percent"', () => {
        mockData = insights();
        renderWithProviders(<TravelerInsightsSection placeKey="senso-ji" />);
        // Expectation shares: 5/8 = 63%, 2/8 = 25%.
        expect(
            screen.getByRole('listitem', { name: 'Better than expected: 63%' })
        ).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('listitem', { name: 'As expected: 25%' })
        ).toHaveAttribute('tabindex', '0');
        // Chips carry their own pct.
        expect(
            screen.getByRole('listitem', { name: 'Delicious: 80%' })
        ).toHaveAttribute('tabindex', '0');
        // The rows voice themselves, so the card announces only its title.
        expect(
            screen.getByRole('region', { name: /verified traveler insights/i })
        ).not.toHaveAttribute('aria-describedby');
    });
});
