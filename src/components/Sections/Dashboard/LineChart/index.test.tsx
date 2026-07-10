import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, within } from '../../../../test/renderWithProviders';
import LineChart from './index';

describe('LineChart', () => {
    it('renders an accessible SVG describing category + series counts', () => {
        renderWithProviders(
            <LineChart
                categories={['2026-01', '2026-02', '2026-03']}
                series={[{ key: 'a', label: 'A', values: [1, 2, 3] }]}
            />
        );
        expect(
            screen.getByRole('img', {
                name: /3 categories and 1 series/i,
            })
        ).toBeInTheDocument();
    });

    it('draws a polyline plus one point dot per value', () => {
        const { container } = renderWithProviders(
            <LineChart
                categories={['a', 'b', 'c']}
                series={[{ key: 's', label: 'S', values: [4, 8, 2] }]}
            />
        );
        expect(container.querySelectorAll('polyline').length).toBe(1);
        expect(container.querySelectorAll('circle').length).toBe(3);
    });

    it('centers a single-category point without dividing by zero', () => {
        const { container } = renderWithProviders(
            <LineChart
                categories={['only']}
                series={[{ key: 's', label: 'S', values: [5] }]}
            />
        );
        expect(container.querySelectorAll('circle').length).toBe(1);
        expect(screen.getByText('only')).toBeInTheDocument();
    });

    it('renders a legend with labels only for multi-series charts', () => {
        const { container } = renderWithProviders(
            <LineChart
                categories={['a', 'b']}
                series={[
                    { key: 'x', label: 'Signups', values: [1, 2] },
                    { key: 'y', label: 'Churn', values: [0, 1], color: '#abc' },
                ]}
            />
        );
        const legend = container.querySelector('.line-chart-legend');
        expect(legend).not.toBeNull();
        expect(
            within(legend as HTMLElement).getByText('Signups')
        ).toBeInTheDocument();
        expect(
            within(legend as HTMLElement).getByText('Churn')
        ).toBeInTheDocument();
    });

    it('applies the x formatter to axis labels', () => {
        renderWithProviders(
            <LineChart
                categories={['2026-05']}
                series={[{ key: 's', label: 'S', values: [1] }]}
                formatX={(c) => `M-${c}`}
            />
        );
        expect(screen.getByText('M-2026-05')).toBeInTheDocument();
    });
});
