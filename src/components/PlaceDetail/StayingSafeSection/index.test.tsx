import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | undefined;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import StayingSafeSection from './index';

beforeEach(() => {
    mockFacts = undefined;
});

describe('StayingSafeSection', () => {
    it('renders nothing while loading', () => {
        const { container } = renderWithProviders(
            <StayingSafeSection code="BR" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there are no safety tips', () => {
        mockFacts = { safetyTips: [] } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(
            <StayingSafeSection code="BR" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('lists each safety tip under the heading', () => {
        mockFacts = {
            safetyTips: ['Avoid displaying valuables', 'Use registered taxis'],
        } as Partial<CountryFactsResult>;
        renderWithProviders(<StayingSafeSection code="BR" />);

        expect(
            screen.getByRole('heading', { name: /staying safe/i })
        ).toBeInTheDocument();
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent('Avoid displaying valuables');
    });
});
