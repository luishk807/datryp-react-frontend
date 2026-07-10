import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, within } from '../../../../test/renderWithProviders';
import BarChart from './index';

describe('BarChart', () => {
    it('renders an accessible SVG describing category + series counts', () => {
        renderWithProviders(
            <BarChart
                categories={['2026-01', '2026-02']}
                series={[
                    { key: 'a', label: 'Alpha', values: [3, 7] },
                ]}
            />
        );
        expect(
            screen.getByRole('img', {
                name: /2 categories and 1 series/i,
            })
        ).toBeInTheDocument();
    });

    it('draws one rect per category per series', () => {
        const { container } = renderWithProviders(
            <BarChart
                categories={['a', 'b', 'c']}
                series={[{ key: 's', label: 'S', values: [1, 2, 3] }]}
            />
        );
        expect(container.querySelectorAll('rect').length).toBe(3);
    });

    it('renders a legend only when there is more than one series', () => {
        const { container, rerender } = renderWithProviders(
            <BarChart
                categories={['a']}
                series={[{ key: 's', label: 'Solo', values: [1] }]}
            />
        );
        expect(container.querySelector('.bar-chart-legend')).toBeNull();

        rerender(
            <BarChart
                categories={['a']}
                series={[
                    { key: 'x', label: 'Ex', values: [1], color: '#111' },
                    { key: 'y', label: 'Why', values: [2] },
                ]}
            />
        );
        const legend = container.querySelector('.bar-chart-legend');
        expect(legend).not.toBeNull();
        expect(within(legend as HTMLElement).getByText('Ex')).toBeInTheDocument();
        expect(within(legend as HTMLElement).getByText('Why')).toBeInTheDocument();
    });

    it('applies the custom x/y formatters to labels and tooltips', () => {
        renderWithProviders(
            <BarChart
                categories={['2026-05']}
                series={[{ key: 's', label: 'Events', values: [5] }]}
                formatX={(c) => `X:${c}`}
                formatY={(v) => `Y:${v}`}
            />
        );
        expect(screen.getByText('X:2026-05')).toBeInTheDocument();
        // Tooltip <title> carries both formatters.
        expect(
            screen.getByText('X:2026-05 · Events: Y:5')
        ).toBeInTheDocument();
    });

    it('renders without error when categories are empty', () => {
        const { container } = renderWithProviders(
            <BarChart categories={[]} series={[{ key: 's', label: 'S', values: [] }]} />
        );
        expect(container.querySelectorAll('rect').length).toBe(0);
    });
});
