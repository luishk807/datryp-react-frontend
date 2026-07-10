import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../../test/renderWithProviders';
import StatTile from './index';

describe('StatTile', () => {
    it('renders the value and label', () => {
        renderWithProviders(<StatTile label="Trips" value={42} />);
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Trips')).toBeInTheDocument();
    });

    it('renders a string value and an optional hint', () => {
        renderWithProviders(
            <StatTile label="Cost" value="$1.50" hint="spend avoided" />
        );
        expect(screen.getByText('$1.50')).toBeInTheDocument();
        expect(screen.getByText('spend avoided')).toBeInTheDocument();
    });

    it('applies the tone modifier class when a tone is given', () => {
        const { container } = renderWithProviders(
            <StatTile label="X" value={1} tone="warning" />
        );
        expect(container.querySelector('.stat-tile-warning')).toBeInTheDocument();
    });

    it('omits the tone modifier and hint when not provided', () => {
        const { container } = renderWithProviders(
            <StatTile label="Y" value={2} />
        );
        expect(container.querySelector('.stat-tile-hint')).toBeNull();
        expect(
            container.querySelector('.stat-tile')?.className
        ).not.toMatch(/stat-tile-(positive|accent|warning)/);
    });
});
