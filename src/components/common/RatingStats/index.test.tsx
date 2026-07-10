import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import RatingStats from './index';

describe('RatingStats', () => {
    it('renders nothing when there are no reviews yet', () => {
        const { container } = renderWithProviders(
            <RatingStats average={4.5} total={0} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the average is null', () => {
        const { container } = renderWithProviders(
            <RatingStats average={null} total={5} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows rounded stars, the average, and a pluralized count', () => {
        renderWithProviders(<RatingStats average={4.2} total={12} />);
        // The readonly StarInput exposes its rounded value as an image label.
        expect(
            screen.getByRole('img', { name: '4 out of 5 stars' })
        ).toBeInTheDocument();
        expect(screen.getByText('4.2')).toBeInTheDocument();
        expect(screen.getByText('(12 reviews)')).toBeInTheDocument();
    });

    it('uses the singular label for a single review', () => {
        renderWithProviders(<RatingStats average={5} total={1} />);
        expect(screen.getByText('(1 review)')).toBeInTheDocument();
    });
});
