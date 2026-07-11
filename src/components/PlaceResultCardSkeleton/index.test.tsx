import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import PlaceResultCardSkeleton from './index';

describe('PlaceResultCardSkeleton', () => {
    it('renders a single busy card when no count is given', () => {
        renderWithProviders(<PlaceResultCardSkeleton />);
        const cards = screen.getAllByRole('article');
        expect(cards).toHaveLength(1);
        expect(cards[0]).toHaveAttribute('aria-busy', 'true');
    });

    it('renders one busy card per requested count', () => {
        renderWithProviders(<PlaceResultCardSkeleton count={3} />);
        expect(screen.getAllByRole('article')).toHaveLength(3);
    });

    it('is purely decorative — its shimmer bars are hidden from assistive tech', () => {
        const { container } = renderWithProviders(
            <PlaceResultCardSkeleton />
        );
        const bars = container.querySelectorAll('.skeleton');
        expect(bars.length).toBeGreaterThan(0);
        bars.forEach((bar) =>
            expect(bar).toHaveAttribute('aria-hidden', 'true')
        );
    });
});
