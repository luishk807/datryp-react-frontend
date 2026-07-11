import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { ReviewItem, ReviewsResponse } from 'api/reviewsApi';

let mockData: ReviewsResponse | undefined;
let mockIsLoading = false;
let mockIsError = false;
vi.mock('api/hooks/useReviews', () => ({
    usePlaceReviews: () => ({
        data: mockData,
        isLoading: mockIsLoading,
        isError: mockIsError,
    }),
    // Nested ReviewCard reaches for these — keep them inert.
    useToggleReviewLike: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteReview: () => ({ mutate: vi.fn(), isPending: false }),
}));

import ReviewSection from './index';

const item = (id: string, over: Partial<ReviewItem> = {}): ReviewItem => ({
    id,
    author: { id: `a-${id}`, name: `Author ${id}` },
    rating: 4,
    text: `Body ${id}`,
    tags: [],
    expectations: null,
    visibility: 'public',
    isVerifiedVisit: true,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    likeCount: 0,
    viewerHasLiked: false,
    isOwner: false,
    friendLikers: [],
    ...over,
});

const response = (over: Partial<ReviewsResponse> = {}): ReviewsResponse => ({
    placeKey: 'paris',
    total: 2,
    averageRating: 4.5,
    ratingCounts: {},
    viewerReviewId: null,
    items: [item('r1'), item('r2')],
    page: 1,
    pageSize: 10,
    totalPages: 1,
    sort: 'recent',
    ...over,
});

const baseProps = {
    placeName: 'Louvre',
    placeCity: 'Paris',
    placeCountry: 'France',
};

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
    mockIsError = false;
});

describe('ReviewSection — place page (no rating breakdown)', () => {
    it('renders nothing when there are no reviews', () => {
        mockData = response({ total: 0, items: [] });
        const { container } = renderWithProviders(
            <ReviewSection {...baseProps} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing while data is still undefined', () => {
        mockData = undefined;
        const { container } = renderWithProviders(
            <ReviewSection {...baseProps} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the traveler-reviews heading, stat, and one row per item', () => {
        mockData = response();
        renderWithProviders(<ReviewSection {...baseProps} />);
        expect(
            screen.getByRole('heading', { name: /traveler tips/i })
        ).toBeInTheDocument();
        expect(screen.getByText('(2 reviews)')).toBeInTheDocument();
        expect(screen.getByText('Body r1')).toBeInTheDocument();
        expect(screen.getByText('Body r2')).toBeInTheDocument();
    });

    it('switches the active sort tab when another option is chosen', async () => {
        mockData = response();
        renderWithProviders(<ReviewSection {...baseProps} />);
        const recent = screen.getByRole('tab', { name: /most recent/i });
        const highest = screen.getByRole('tab', { name: /highest rated/i });
        expect(recent).toHaveAttribute('aria-selected', 'true');
        expect(highest).toHaveAttribute('aria-selected', 'false');

        await userEvent.click(highest);
        expect(highest).toHaveAttribute('aria-selected', 'true');
        expect(recent).toHaveAttribute('aria-selected', 'false');
    });
});

describe('ReviewSection — activity entry (rating breakdown)', () => {
    it('lists each rating source and the blended overall', () => {
        mockData = response();
        renderWithProviders(
            <ReviewSection
                {...baseProps}
                googleRating={4.2}
                googleRatingCount={1200}
                openaiRating={4.6}
            />
        );
        expect(
            screen.getByRole('heading', { name: /ratings & reviews/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Overall')).toBeInTheDocument();
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('OpenAI')).toBeInTheDocument();
        expect(screen.getByText(/datryp travelers/i)).toBeInTheDocument();
        expect(screen.getByText('(1,200)')).toBeInTheDocument();
    });

    it('still renders (with the breakdown) when the list errors', () => {
        mockData = undefined;
        mockIsError = true;
        renderWithProviders(
            <ReviewSection {...baseProps} googleRating={4} />
        );
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/couldn.t load reviews/i);
    });

    it('shows the section heading while the list is loading', () => {
        mockData = undefined;
        mockIsLoading = true;
        renderWithProviders(
            <ReviewSection {...baseProps} openaiRating={4.3} />
        );
        expect(
            screen.getByRole('heading', { name: /ratings & reviews/i })
        ).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
