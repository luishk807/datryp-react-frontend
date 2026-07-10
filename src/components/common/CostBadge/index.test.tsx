import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import CostBadge from './index';

describe('CostBadge', () => {
    it.each([null, undefined, NaN, Infinity])(
        'renders nothing for a non-finite level (%s)',
        (level) => {
            const { container } = renderWithProviders(
                <CostBadge level={level as number} />
            );
            expect(container).toBeEmptyDOMElement();
        }
    );

    it('renders five dollar signs, clamped-many filled', () => {
        renderWithProviders(<CostBadge level={3} />);
        expect(screen.getAllByText('$')).toHaveLength(5);
        // Filled count is encoded in the title (`3/5 — …`).
        expect(screen.getByTitle(/^3\/5 —/)).toBeInTheDocument();
    });

    it.each([
        [7, 5],
        [0, 1],
        [3.6, 4],
    ])('clamps + rounds level %s to %s/5', (level, shown) => {
        renderWithProviders(<CostBadge level={level} />);
        expect(
            screen.getByTitle(new RegExp(`^${shown}/5 —`))
        ).toBeInTheDocument();
    });

    it('exposes an accessible label', () => {
        renderWithProviders(<CostBadge level={2} />);
        // aria-label comes from i18n; assert the badge is labelled (not silent).
        const badge = screen.getByTitle(/^2\/5 —/);
        expect(badge).toHaveAttribute('aria-label');
        expect(badge.getAttribute('aria-label')).toBeTruthy();
    });
});
