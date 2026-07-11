import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { ReviewItem } from 'api/reviewsApi';

// Both like + delete come from the same hooks module — one mock covers the card.
const mockToggleLike = vi.fn();
const mockDeleteReview = vi.fn();
let mockLikePending = false;
let mockDeletePending = false;
vi.mock('api/hooks/useReviews', () => ({
    useToggleReviewLike: () => ({
        mutate: mockToggleLike,
        isPending: mockLikePending,
    }),
    useDeleteReview: () => ({
        mutate: mockDeleteReview,
        isPending: mockDeletePending,
    }),
}));

import ReviewCard from './index';

const review = (over: Partial<ReviewItem> = {}): ReviewItem => ({
    id: 'r1',
    author: { id: 'a1', name: 'Ana' },
    rating: 4,
    text: 'Loved every minute',
    tags: [],
    expectations: null,
    visibility: 'public',
    isVerifiedVisit: true,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    likeCount: 3,
    viewerHasLiked: false,
    isOwner: false,
    friendLikers: [],
    ...over,
});

beforeEach(() => {
    mockToggleLike.mockReset();
    mockDeleteReview.mockReset();
    mockLikePending = false;
    mockDeletePending = false;
});

describe('ReviewCard', () => {
    it('renders the author name, rating stars, and body text', () => {
        renderWithProviders(<ReviewCard review={review()} placeKey="paris" />);
        expect(screen.getByText('Ana')).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: '4 out of 5 stars' })
        ).toBeInTheDocument();
        expect(screen.getByText('Loved every minute')).toBeInTheDocument();
    });

    it('falls back to "Anonymous" when the author has no name', () => {
        renderWithProviders(
            <ReviewCard
                review={review({ author: { id: 'a1', name: null } })}
                placeKey="paris"
            />
        );
        expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });

    it('shows an "edited" marker when updatedAt differs from createdAt', () => {
        renderWithProviders(
            <ReviewCard
                review={review({ updatedAt: '2026-07-05T00:00:00Z' })}
                placeKey="paris"
            />
        );
        expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });

    it('likes an unliked review through the toggle mutation', async () => {
        renderWithProviders(<ReviewCard review={review()} placeKey="paris" />);
        const btn = screen.getByRole('button', { name: /^like review$/i });
        expect(screen.getByText('3')).toBeInTheDocument();
        await userEvent.click(btn);
        expect(mockToggleLike).toHaveBeenCalledWith({
            placeKey: 'paris',
            reviewId: 'r1',
            currentlyLiked: false,
        });
    });

    it('exposes an "Unlike" action for an already-liked review', async () => {
        renderWithProviders(
            <ReviewCard
                review={review({ viewerHasLiked: true })}
                placeKey="paris"
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /unlike review/i })
        );
        expect(mockToggleLike).toHaveBeenCalledWith({
            placeKey: 'paris',
            reviewId: 'r1',
            currentlyLiked: true,
        });
    });

    it('disables the like button while a like is in flight', () => {
        mockLikePending = true;
        renderWithProviders(<ReviewCard review={review()} placeKey="paris" />);
        expect(
            screen.getByRole('button', { name: /like review/i })
        ).toBeDisabled();
    });

    it('summarises a single friend liker', () => {
        renderWithProviders(
            <ReviewCard
                review={review({
                    friendLikers: [{ id: 'f1', name: 'Bob', email: 'b@x.io' }],
                })}
                placeKey="paris"
            />
        );
        expect(screen.getByText('Bob liked this')).toBeInTheDocument();
    });

    it('summarises multiple friend likers with an "other" count', () => {
        renderWithProviders(
            <ReviewCard
                review={review({
                    friendLikers: [
                        { id: 'f1', name: 'Bob', email: 'b@x.io' },
                        { id: 'f2', name: 'Cy', email: 'c@x.io' },
                    ],
                })}
                placeKey="paris"
            />
        );
        expect(
            screen.getByText(/bob and 1 other friend liked this/i)
        ).toBeInTheDocument();
    });

    it('hides owner actions for a review the viewer does not own', () => {
        renderWithProviders(
            <ReviewCard
                review={review({ isOwner: false })}
                placeKey="paris"
                onEditStart={vi.fn()}
            />
        );
        expect(
            screen.queryByRole('button', { name: /edit your review/i })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /delete your review/i })
        ).not.toBeInTheDocument();
    });

    it('fires onEditStart from the owner Edit affordance', async () => {
        const onEditStart = vi.fn();
        renderWithProviders(
            <ReviewCard
                review={review({ isOwner: true })}
                placeKey="paris"
                onEditStart={onEditStart}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /edit your review/i })
        );
        expect(onEditStart).toHaveBeenCalledTimes(1);
    });

    it('omits the Edit affordance when no onEditStart is provided', () => {
        renderWithProviders(
            <ReviewCard review={review({ isOwner: true })} placeKey="paris" />
        );
        expect(
            screen.queryByRole('button', { name: /edit your review/i })
        ).not.toBeInTheDocument();
        // Delete is still available to the owner.
        expect(
            screen.getByRole('button', { name: /delete your review/i })
        ).toBeInTheDocument();
    });

    it('deletes after the owner confirms the prompt', async () => {
        const confirmSpy = vi
            .spyOn(window, 'confirm')
            .mockReturnValue(true);
        renderWithProviders(
            <ReviewCard review={review({ isOwner: true })} placeKey="paris" />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /delete your review/i })
        );
        expect(mockDeleteReview).toHaveBeenCalledWith({
            placeKey: 'paris',
            reviewId: 'r1',
        });
        confirmSpy.mockRestore();
    });

    it('does not delete when the owner cancels the prompt', async () => {
        const confirmSpy = vi
            .spyOn(window, 'confirm')
            .mockReturnValue(false);
        renderWithProviders(
            <ReviewCard review={review({ isOwner: true })} placeKey="paris" />
        );
        await userEvent.click(
            screen.getByRole('button', { name: /delete your review/i })
        );
        expect(mockDeleteReview).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });
});
