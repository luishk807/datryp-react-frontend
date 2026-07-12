import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import Stars from './index';

describe('Stars', () => {
    it('exposes the rating via a single accessible label and a numeric value', () => {
        const { container } = renderWithProviders(<Stars rating={4.5} />);
        expect(
            screen.getByLabelText('Rating 4.5 out of 5')
        ).toBeInTheDocument();
        // Numeric text stays visible but is hidden from the a11y tree so it
        // doesn't double-read against the wrapper label.
        expect(screen.getByText('4.5')).toHaveAttribute('aria-hidden', 'true');
        // Every star glyph is decorative.
        container
            .querySelectorAll('.stars-display-star')
            .forEach((star) =>
                expect(star).toHaveAttribute('aria-hidden', 'true')
            );
    });

    it('hides the numeric value when showValue is false but keeps the label', () => {
        renderWithProviders(<Stars rating={3} showValue={false} />);
        expect(screen.getByLabelText('Rating 3 out of 5')).toBeInTheDocument();
        expect(screen.queryByText('3.0')).not.toBeInTheDocument();
    });

    it('clamps a rating above 5', () => {
        renderWithProviders(<Stars rating={7} />);
        expect(screen.getByLabelText('Rating 5 out of 5')).toBeInTheDocument();
        expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    it('clamps a negative rating to zero', () => {
        renderWithProviders(<Stars rating={-2} />);
        expect(screen.getByLabelText('Rating 0 out of 5')).toBeInTheDocument();
        expect(screen.getByText('0.0')).toBeInTheDocument();
    });
});
