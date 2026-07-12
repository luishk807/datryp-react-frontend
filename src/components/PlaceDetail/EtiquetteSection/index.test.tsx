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

    it('makes each tip a keyboard tab stop that voices the tip', () => {
        mockFacts = {
            etiquette: ['Bow when greeting', 'Take your shoes off indoors'],
        };
        renderWithProviders(<EtiquetteSection code="JP" />);

        // Each tip is its own tab stop (so Tab walks through them) with an
        // accessible name of the tip — screen readers voice it on focus, not
        // just the card title.
        const bow = screen.getByRole('listitem', { name: 'Bow when greeting' });
        expect(bow).toHaveAttribute('tabindex', '0');
        expect(
            screen.getByRole('listitem', {
                name: 'Take your shoes off indoors',
            })
        ).toHaveAttribute('tabindex', '0');
    });
});
