import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import GoogleGlyph from './index';

describe('GoogleGlyph', () => {
    it('renders a decorative svg sized 16px by default', () => {
        const { container } = renderWithProviders(<GoogleGlyph />);
        const svg = container.querySelector('svg') as SVGElement;
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg.getAttribute('width')).toBe('16');
        expect(svg.getAttribute('height')).toBe('16');
    });

    it('honors a custom size', () => {
        const { container } = renderWithProviders(<GoogleGlyph size={32} />);
        const svg = container.querySelector('svg') as SVGElement;
        expect(svg.getAttribute('width')).toBe('32');
        expect(svg.getAttribute('height')).toBe('32');
    });

    it('applies a passed className', () => {
        const { container } = renderWithProviders(
            <GoogleGlyph className="attribution-glyph" />
        );
        expect(container.querySelector('svg')).toHaveClass('attribution-glyph');
    });
});
