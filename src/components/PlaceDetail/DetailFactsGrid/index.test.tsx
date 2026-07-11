import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import DetailFactsGrid from './index';

describe('DetailFactsGrid', () => {
    it('wraps its children in the grid container', () => {
        const { container } = renderWithProviders(
            <DetailFactsGrid>
                <div>Tap water</div>
                <div>Air quality</div>
            </DetailFactsGrid>
        );

        const grid = container.querySelector('.detail-facts-grid');
        expect(grid).toBeInTheDocument();
        expect(screen.getByText('Tap water')).toBeInTheDocument();
        expect(screen.getByText('Air quality')).toBeInTheDocument();
    });

    it('collapses to an empty grid when every child self-hides', () => {
        const { container } = renderWithProviders(
            <DetailFactsGrid>{null}</DetailFactsGrid>
        );
        const grid = container.querySelector('.detail-facts-grid');
        expect(grid).toBeInTheDocument();
        expect(grid).toBeEmptyDOMElement();
    });
});
