import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import AvgCostsSection from './index';

beforeEach(() => {
    mockFacts = null;
});

describe('AvgCostsSection', () => {
    it('renders nothing when there is no cost data', () => {
        mockFacts = null;
        const { container } = renderWithProviders(<AvgCostsSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when every cost field is empty', () => {
        mockFacts = {
            avgCosts: {
                budget: null,
                midrange: null,
                luxury: null,
                meal: null,
                coffee: null,
                transit: null,
                beer: null,
            },
        };
        const { container } = renderWithProviders(<AvgCostsSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('groups populated daily bands and sample prices with the USD note', () => {
        mockFacts = {
            avgCosts: {
                budget: '$60/day',
                midrange: '$150/day',
                luxury: null,
                meal: '$12',
                coffee: null,
                transit: null,
                beer: '$4',
            },
        };
        renderWithProviders(<AvgCostsSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Average costs' })
        ).toBeInTheDocument();
        expect(screen.getByText('Daily budget')).toBeInTheDocument();
        expect(screen.getByText('Sample prices')).toBeInTheDocument();
        expect(screen.getByText('Budget')).toBeInTheDocument();
        expect(screen.getByText('$60/day')).toBeInTheDocument();
        expect(screen.getByText('Meal')).toBeInTheDocument();
        expect(screen.getByText('$12')).toBeInTheDocument();
        // luxury / coffee / transit were null → their labels are absent.
        expect(screen.queryByText('Luxury')).not.toBeInTheDocument();
        expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
        expect(
            screen.getByText('≈ USD · prices vary by city and season')
        ).toBeInTheDocument();
    });

    it('omits a whole group when none of its rows have data', () => {
        mockFacts = {
            avgCosts: {
                budget: null,
                midrange: null,
                luxury: null,
                meal: '$12',
                coffee: '$3',
                transit: null,
                beer: null,
            },
        };
        renderWithProviders(<AvgCostsSection code="JP" />);
        expect(screen.getByText('Sample prices')).toBeInTheDocument();
        expect(screen.queryByText('Daily budget')).not.toBeInTheDocument();
    });
});
