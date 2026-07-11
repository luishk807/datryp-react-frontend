import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | undefined;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import TapWaterSection from './index';

beforeEach(() => {
    mockFacts = undefined;
});

describe('TapWaterSection', () => {
    it('renders nothing when there is no verdict', () => {
        mockFacts = { water: null } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<TapWaterSection code="MX" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the safe verdict with its note', () => {
        mockFacts = {
            water: { status: 'safe', note: 'Perfectly fine everywhere' },
        } as Partial<CountryFactsResult>;
        renderWithProviders(<TapWaterSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: /tap water/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Safe to drink')).toBeInTheDocument();
        expect(
            screen.getByText('Perfectly fine everywhere')
        ).toBeInTheDocument();
    });

    it('shows the caution verdict', () => {
        mockFacts = {
            water: { status: 'caution', note: null },
        } as Partial<CountryFactsResult>;
        renderWithProviders(<TapWaterSection code="TH" />);
        expect(screen.getByText('Use caution')).toBeInTheDocument();
    });

    it('shows the unsafe verdict and omits the note when absent', () => {
        mockFacts = {
            water: { status: 'unsafe', note: null },
        } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<TapWaterSection code="IN" />);
        expect(screen.getByText('Not recommended')).toBeInTheDocument();
        expect(
            container.querySelector('.tap-water-note')
        ).not.toBeInTheDocument();
    });
});
