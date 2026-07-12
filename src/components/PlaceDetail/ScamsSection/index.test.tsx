import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | undefined;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import ScamsSection from './index';

beforeEach(() => {
    mockFacts = undefined;
});

describe('ScamsSection', () => {
    it('renders nothing while loading', () => {
        const { container } = renderWithProviders(<ScamsSection code="TH" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when there are no scams', () => {
        mockFacts = { scams: [] } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<ScamsSection code="TH" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('lists each common scam under the heading', () => {
        mockFacts = {
            scams: ['Taxi meter "broken"', 'Gem-shop redirect'],
        } as Partial<CountryFactsResult>;
        renderWithProviders(<ScamsSection code="TH" />);

        expect(
            screen.getByRole('heading', { name: /common scams/i })
        ).toBeInTheDocument();
        const items = screen.getAllByRole('listitem');
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent('Taxi meter "broken"');
        expect(items[1]).toHaveTextContent('Gem-shop redirect');
    });

    it('makes each scam a keyboard tab stop named by its text', () => {
        mockFacts = {
            scams: ['Taxi meter "broken"', 'Gem-shop redirect'],
        } as Partial<CountryFactsResult>;
        renderWithProviders(<ScamsSection code="TH" />);

        expect(
            screen.getByRole('listitem', { name: 'Taxi meter "broken"' })
        ).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('listitem', { name: 'Gem-shop redirect' })
        ).toHaveAttribute('tabindex', '0');
    });
});
