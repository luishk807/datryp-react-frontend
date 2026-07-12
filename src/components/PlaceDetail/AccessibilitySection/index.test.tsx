import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import AccessibilitySection from './index';

beforeEach(() => {
    mockFacts = null;
});

describe('AccessibilitySection', () => {
    it('renders nothing when the facts payload is not loaded', () => {
        mockFacts = null;
        const { container } = renderWithProviders(
            <AccessibilitySection code="JP" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when accessibility is present but every field is empty', () => {
        mockFacts = {
            accessibility: {
                wheelchair: null,
                transit: null,
                sidewalks: null,
                signage: null,
            },
        };
        const { container } = renderWithProviders(
            <AccessibilitySection code="JP" />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a labelled row for each populated field', () => {
        mockFacts = {
            accessibility: {
                wheelchair: 'Fairly wheelchair-friendly',
                transit: null,
                sidewalks: 'Wide and well kept',
                signage: 'Widely bilingual',
            },
        };
        renderWithProviders(<AccessibilitySection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Accessibility' })
        ).toBeInTheDocument();
        expect(screen.getByText('Wheelchair')).toBeInTheDocument();
        expect(
            screen.getByText('Fairly wheelchair-friendly')
        ).toBeInTheDocument();
        expect(screen.getByText('Sidewalks')).toBeInTheDocument();
        expect(screen.getByText('Wide and well kept')).toBeInTheDocument();
        // "transit" was null → its label must be skipped.
        expect(screen.queryByText('Transit')).not.toBeInTheDocument();
        // English signage label.
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
});
