import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import HealthSection from './index';

beforeEach(() => {
    mockFacts = null;
});

describe('HealthSection', () => {
    it('renders nothing when there is no health data', () => {
        mockFacts = null;
        const { container } = renderWithProviders(<HealthSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when every health field is empty', () => {
        mockFacts = {
            health: { vaccinations: null, mosquitoes: null, malaria: null },
        };
        const { container } = renderWithProviders(<HealthSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders populated rows plus the travel-clinic note', () => {
        mockFacts = {
            health: {
                vaccinations: 'Routine only',
                mosquitoes: null,
                malaria: 'No risk',
            },
        };
        renderWithProviders(<HealthSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Health' })
        ).toBeInTheDocument();
        expect(screen.getByText('Vaccines')).toBeInTheDocument();
        expect(screen.getByText('Routine only')).toBeInTheDocument();
        expect(screen.getByText('Malaria')).toBeInTheDocument();
        expect(screen.getByText('No risk')).toBeInTheDocument();
        // mosquitoes was null → skipped.
        expect(screen.queryByText('Mosquitoes')).not.toBeInTheDocument();
        expect(
            screen.getByText(
                'General guidance — consult a travel clinic before you go.'
            )
        ).toBeInTheDocument();
    });
});
