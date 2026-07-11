import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import CurrencyTipsSection from './index';

beforeEach(() => {
    mockFacts = null;
});

describe('CurrencyTipsSection', () => {
    it('renders nothing when there are no money tips', () => {
        mockFacts = null;
        const { container } = renderWithProviders(
            <CurrencyTipsSection code="JP" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when every row is blank and unrated', () => {
        mockFacts = {
            currencyTips: {
                cards: null,
                cash: null,
                atm: null,
                applePay: null,
                cardsRating: null,
                cashRating: null,
            },
        };
        const { container } = renderWithProviders(
            <CurrencyTipsSection code="JP" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a star rating for rated rows and text for the rest', () => {
        mockFacts = {
            currencyTips: {
                cards: 'Accepted almost everywhere',
                cash: 'Handy for small shops',
                atm: 'Everywhere in cities',
                applePay: null,
                cardsRating: 4,
                cashRating: null,
            },
        };
        renderWithProviders(<CurrencyTipsSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Cards & cash' })
        ).toBeInTheDocument();
        expect(screen.getByText('Cards')).toBeInTheDocument();
        // Cards is rated → shown as an accessible star image, not the text.
        expect(
            screen.getByRole('img', { name: '4 out of 5' })
        ).toBeInTheDocument();
        expect(
            screen.queryByText('Accepted almost everywhere')
        ).not.toBeInTheDocument();
        // Cash has no valid rating → falls back to its text value.
        expect(screen.getByText('Cash')).toBeInTheDocument();
        expect(screen.getByText('Handy for small shops')).toBeInTheDocument();
        expect(screen.getByText('ATMs')).toBeInTheDocument();
        expect(screen.getByText('Everywhere in cities')).toBeInTheDocument();
    });

    it('treats an out-of-range rating as unrated and shows the text', () => {
        mockFacts = {
            currencyTips: {
                cards: 'Cards ok',
                cash: null,
                atm: null,
                applePay: null,
                cardsRating: 9,
                cashRating: null,
            },
        };
        renderWithProviders(<CurrencyTipsSection code="JP" />);
        expect(screen.getByText('Cards ok')).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
});
