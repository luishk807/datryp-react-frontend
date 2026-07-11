import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { ReviewsResponse } from 'api/reviewsApi';

let mockData: Partial<ReviewsResponse> | undefined;
let mockIsLoading = false;
vi.mock('api/hooks/useReviews', () => ({
    usePlaceReviews: () => ({ data: mockData, isLoading: mockIsLoading }),
}));

import ReviewSummary from './index';

const baseProps = {
    placeName: 'Louvre',
    placeCity: 'Paris',
    placeCountry: 'France',
};

beforeEach(() => {
    mockData = undefined;
    mockIsLoading = false;
});

describe('ReviewSummary', () => {
    it('shows a skeleton (no stats, no CTA) while loading', () => {
        mockIsLoading = true;
        renderWithProviders(<ReviewSummary {...baseProps} />);
        expect(
            screen.queryByRole('button', { name: /view all/i })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders an empty hint when a place has no traveler reviews', () => {
        mockData = { total: 0, averageRating: null };
        renderWithProviders(<ReviewSummary {...baseProps} />);
        expect(screen.getByText('No reviews yet')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /view all/i })
        ).not.toBeInTheDocument();
    });

    it('renders the rating stats + View all when there are reviews', () => {
        mockData = { total: 8, averageRating: 4.4 };
        renderWithProviders(<ReviewSummary {...baseProps} />);
        expect(
            screen.getByRole('img', { name: '4 out of 5 stars' })
        ).toBeInTheDocument();
        expect(screen.getByText('(8 reviews)')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /view all/i })
        ).toBeInTheDocument();
    });

    it('exposes the icon with an accessible label', () => {
        mockData = { total: 8, averageRating: 4.4 };
        renderWithProviders(<ReviewSummary {...baseProps} />);
        expect(
            screen.getByRole('img', { name: /traveler tips/i })
        ).toBeInTheDocument();
    });

    it('scrolls to the target section when View all is clicked', async () => {
        mockData = { total: 3, averageRating: 5 };
        const scrollIntoView = vi.fn();
        const target = document.createElement('div');
        target.id = 'reviews';
        target.scrollIntoView = scrollIntoView;
        document.body.appendChild(target);

        renderWithProviders(<ReviewSummary {...baseProps} />);
        await userEvent.click(
            screen.getByRole('button', { name: /view all/i })
        );
        expect(scrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'start',
        });
        document.body.removeChild(target);
    });
});
