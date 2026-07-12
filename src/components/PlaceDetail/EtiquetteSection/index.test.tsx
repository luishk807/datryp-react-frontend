import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import EtiquetteSection from './index';

beforeEach(() => {
    mockFacts = null;
});

describe('EtiquetteSection', () => {
    it('renders nothing when the payload is missing', () => {
        mockFacts = null;
        const { container } = renderWithProviders(<EtiquetteSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the etiquette list is empty', () => {
        mockFacts = { etiquette: [] };
        const { container } = renderWithProviders(<EtiquetteSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders one list item per tip under the heading', () => {
        mockFacts = {
            etiquette: ['Bow when greeting', 'Take your shoes off indoors'],
        };
        renderWithProviders(<EtiquetteSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Local etiquette' })
        ).toBeInTheDocument();
        expect(screen.getByText('Bow when greeting')).toBeInTheDocument();
        expect(
            screen.getByText('Take your shoes off indoors')
        ).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
});
