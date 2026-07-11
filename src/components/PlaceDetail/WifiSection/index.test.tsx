import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | undefined;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import WifiSection from './index';

beforeEach(() => {
    mockFacts = undefined;
});

describe('WifiSection', () => {
    it('renders nothing when there is no connectivity info', () => {
        mockFacts = { wifi: null } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<WifiSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the rating, summary, mobile note, and eSIM picks', () => {
        mockFacts = {
            wifi: {
                rating: 4.3,
                summary: 'Fast and widely available',
                mobile: '5G in major cities',
            },
        } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<WifiSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: /connectivity/i })
        ).toBeInTheDocument();
        // 4.3 rounds to 4 → "4 out of 5" on the star row's aria-label.
        expect(
            container.querySelector('[aria-label="4 out of 5"]')
        ).toBeInTheDocument();
        expect(screen.getByText('Fast and widely available')).toBeInTheDocument();
        expect(screen.getByText('5G in major cities')).toBeInTheDocument();
        expect(screen.getByText('eSIM')).toBeInTheDocument();
        expect(
            screen.getByText('Airalo · Nomad · Holafly')
        ).toBeInTheDocument();
    });

    it('omits the mobile note when absent', () => {
        mockFacts = {
            wifi: { rating: 2, summary: 'Patchy outside cities', mobile: null },
        } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<WifiSection code="BO" />);
        expect(container.querySelector('.wifi-mobile')).not.toBeInTheDocument();
    });
});
