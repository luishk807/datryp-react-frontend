import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, within } from '../../../../test/renderWithProviders';
import PieChart from './index';

describe('PieChart', () => {
    it('renders the empty state when every slice is zero', () => {
        renderWithProviders(
            <PieChart
                slices={[
                    { key: 'a', label: 'A', count: 0 },
                    { key: 'b', label: 'B', count: 0 },
                ]}
            />
        );
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('draws one path per positive slice and a legend with percentages', () => {
        const { container } = renderWithProviders(
            <PieChart
                slices={[
                    { key: 'free', label: 'Free', count: 75 },
                    { key: 'pro', label: 'Pro', count: 25 },
                    { key: 'zero', label: 'Zero', count: 0 },
                ]}
            />
        );
        // Zero-count slice is filtered out.
        expect(container.querySelectorAll('path').length).toBe(2);
        const legend = container.querySelector('.pie-chart-legend');
        expect(
            within(legend as HTMLElement).getByText('Free')
        ).toBeInTheDocument();
        expect(within(legend as HTMLElement).getByText('75 · 75%')).toBeInTheDocument();
        expect(within(legend as HTMLElement).getByText('25 · 25%')).toBeInTheDocument();
    });

    it('renders a single 100% slice as one closed full-circle path', () => {
        const { container } = renderWithProviders(
            <PieChart slices={[{ key: 'only', label: 'Only', count: 10 }]} />
        );
        expect(container.querySelectorAll('path').length).toBe(1);
        expect(
            screen.getByRole('img', { name: /10 across 1 buckets/i })
        ).toBeInTheDocument();
    });

    it('honors a per-key color map when provided', () => {
        const { container } = renderWithProviders(
            <PieChart
                slices={[
                    { key: 'male', label: 'Male', count: 4 },
                    { key: 'female', label: 'Female', count: 6 },
                ]}
                colorByKey={{ male: '#3a86ff', female: '#f38e40' }}
            />
        );
        const fills = Array.from(container.querySelectorAll('path')).map((p) =>
            p.getAttribute('fill')
        );
        expect(fills).toContain('#3a86ff');
        expect(fills).toContain('#f38e40');
    });
});
