import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { PopularityInfo } from 'types';
import PopularityWidget from './index';

const info = (over: Partial<PopularityInfo> = {}): PopularityInfo => ({
    score: 82,
    trend: 'rising',
    summary: 'Search interest is up sharply this year.',
    ...over,
});

describe('PopularityWidget', () => {
    it('renders the score, its meter, and the summary', () => {
        renderWithProviders(<PopularityWidget info={info()} />);
        const meter = screen.getByRole('meter', { name: 'Popularity score' });
        expect(meter).toHaveAttribute('aria-valuenow', '82');
        expect(meter).toHaveAttribute('aria-valuemin', '0');
        expect(meter).toHaveAttribute('aria-valuemax', '100');
        // Human phrasing folds score + level + trend (reusing the widget's own
        // translated strings) so the aria-hidden visual rows read only once.
        expect(meter).toHaveAttribute(
            'aria-valuetext',
            '82, Trending, Rising this year'
        );
        expect(screen.getByText('82')).toBeInTheDocument();
        expect(screen.getByText('/100')).toBeInTheDocument();
        expect(
            screen.getByText('Search interest is up sharply this year.')
        ).toBeInTheDocument();
        // Disclaimer always shows so the number isn't over-read.
        expect(screen.getByText(/Approximate/i)).toBeInTheDocument();
    });

    it.each([
        [85, 'Trending'],
        [55, 'Popular'],
        [12, 'Off the radar'],
    ])('labels score %s with its band (%s) — colour paired with text', (score, label) => {
        renderWithProviders(<PopularityWidget info={info({ score })} />);
        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it.each([
        ['rising', 'Rising this year'],
        ['steady', 'Steady this year'],
        ['falling', 'Cooling this year'],
    ] as const)('renders the %s trend label', (trend, label) => {
        renderWithProviders(<PopularityWidget info={info({ trend })} />);
        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it.each([
        [150, '100'],
        [-5, '0'],
        [45.4, '45'],
        [69.6, '70'],
    ])('clamps + rounds score %s to %s', (score, shown) => {
        renderWithProviders(<PopularityWidget info={info({ score })} />);
        expect(screen.getByRole('meter')).toHaveAttribute(
            'aria-valuenow',
            shown
        );
    });
});
