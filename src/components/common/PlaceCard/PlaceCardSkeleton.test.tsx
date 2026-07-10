import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import PlaceCardSkeleton from './PlaceCardSkeleton';

describe('PlaceCardSkeleton', () => {
    it('renders a single decorative skeleton card by default', () => {
        const { container } = renderWithProviders(<PlaceCardSkeleton />);
        const cards = container.querySelectorAll('.place-card-skeleton');
        expect(cards).toHaveLength(1);
        const card = cards[0] as HTMLElement;
        expect(card).toHaveAttribute('aria-hidden', 'true');
        expect(card).toHaveAttribute('aria-busy', 'true');
    });

    it('is hidden from assistive tech (no exposed content)', () => {
        const { container } = renderWithProviders(<PlaceCardSkeleton />);
        // The shimmer bars themselves are decorative too.
        const bars = container.querySelectorAll('.skeleton');
        expect(bars.length).toBeGreaterThan(0);
        bars.forEach((bar) =>
            expect(bar).toHaveAttribute('aria-hidden', 'true')
        );
    });

    it('renders N copies when count is set', () => {
        const { container } = renderWithProviders(<PlaceCardSkeleton count={3} />);
        expect(
            container.querySelectorAll('.place-card-skeleton')
        ).toHaveLength(3);
    });

    it('renders nothing card-wise when count is 0', () => {
        const { container } = renderWithProviders(<PlaceCardSkeleton count={0} />);
        expect(
            container.querySelectorAll('.place-card-skeleton')
        ).toHaveLength(0);
    });
});
