import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import RatingBadge from './index';

// usePlaceRating pulls in useUser (throws outside a UserProvider) and hits the
// network — mock it so the badge renders offline + deterministically.
const { mockUsePlaceRating } = vi.hoisted(() => ({
    mockUsePlaceRating: vi.fn(),
}));

vi.mock('api/hooks/usePlaceRating', () => ({
    usePlaceRating: mockUsePlaceRating,
}));

beforeEach(() => {
    mockUsePlaceRating.mockReturnValue({ data: undefined });
});

describe('RatingBadge', () => {
    it('renders nothing without a snapshot or a live match', () => {
        const { container } = renderWithProviders(
            <RatingBadge name="Nowhere Cafe" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a persisted snapshot as a non-link chip with an accessible label', () => {
        renderWithProviders(
            <RatingBadge name="Eiffel Tower" rating={4.6} ratingCount={374000} />
        );
        expect(
            screen.getByLabelText(/Rated 4\.6 out of 5 based on 374k reviews/)
        ).toBeInTheDocument();
        expect(screen.getByText('4.6')).toBeInTheDocument();
        expect(screen.getByText(/374k/)).toBeInTheDocument();
        // A snapshot carries no maps URI → renders as a span, not a link.
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('omits the review count in the compact variant', () => {
        renderWithProviders(
            <RatingBadge
                name="Eiffel Tower"
                rating={4.6}
                ratingCount={374000}
                variant="compact"
            />
        );
        expect(screen.getByText('4.6')).toBeInTheDocument();
        expect(screen.queryByText(/374k/)).not.toBeInTheDocument();
    });

    it('links to Google Maps when the live lookup returns a URI', () => {
        mockUsePlaceRating.mockReturnValue({
            data: {
                rating: 4.2,
                userRatingCount: 100,
                googleMapsUri: 'https://maps.google.com/?cid=1',
            },
        });
        renderWithProviders(<RatingBadge name="Hilton" location="Tokyo" />);
        const link = screen.getByRole('link', {
            name: /Rated 4\.2 out of 5 based on 100 reviews \(opens Google Maps\)/,
        });
        expect(link).toHaveAttribute('href', 'https://maps.google.com/?cid=1');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders a plain span (no link) when linkToMaps is false', () => {
        mockUsePlaceRating.mockReturnValue({
            data: {
                rating: 4.2,
                userRatingCount: 100,
                googleMapsUri: 'https://maps.google.com/?cid=1',
            },
        });
        renderWithProviders(
            <RatingBadge name="Hilton" location="Tokyo" linkToMaps={false} />
        );
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(
            screen.getByLabelText(/Rated 4\.2 out of 5 based on 100 reviews/)
        ).toBeInTheDocument();
    });
});
