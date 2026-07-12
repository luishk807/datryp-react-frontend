import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    renderWithProviders,
    screen,
    within,
} from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | undefined;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import TippingSection from './index';

beforeEach(() => {
    mockFacts = undefined;
});

describe('TippingSection', () => {
    it('renders nothing when there is no tipping info', () => {
        mockFacts = { tipping: null } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<TippingSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows only the summary when there are no per-service rows', () => {
        mockFacts = {
            tipping: { summary: 'Not expected — service is included', categories: {} },
        } as Partial<CountryFactsResult>;
        renderWithProviders(<TippingSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: /tipping/i })
        ).toBeInTheDocument();
        expect(
            screen.getByText('Not expected — service is included')
        ).toBeInTheDocument();
        expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });

    it('labels known categories, passes unknown ones through, and keeps order', () => {
        mockFacts = {
            tipping: {
                summary: '10% is customary',
                categories: { restaurants: '10%', valet: '$2' },
            },
        } as Partial<CountryFactsResult>;
        renderWithProviders(<TippingSection code="US" />);

        const rows = screen.getAllByRole('listitem');
        expect(rows).toHaveLength(2);
        // Known ordered category comes first, unknown passthrough second.
        expect(within(rows[0]).getByText('Restaurants')).toBeInTheDocument();
        expect(within(rows[0]).getByText('10%')).toBeInTheDocument();
        expect(within(rows[1]).getByText('valet')).toBeInTheDocument();
        expect(within(rows[1]).getByText('$2')).toBeInTheDocument();
    });

    it('makes each service row a keyboard tab stop named "<label>: <value>"', () => {
        mockFacts = {
            tipping: {
                summary: '10% is customary',
                categories: { restaurants: '10%', valet: '$2' },
            },
        } as Partial<CountryFactsResult>;
        renderWithProviders(<TippingSection code="US" />);

        expect(
            screen.getByRole('listitem', { name: 'Restaurants: 10%' })
        ).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('listitem', { name: 'valet: $2' })
        ).toHaveAttribute('tabindex', '0');
    });
});
