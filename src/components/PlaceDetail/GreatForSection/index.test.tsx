import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import GreatForSection from './index';

beforeEach(() => {
    mockFacts = null;
});

describe('GreatForSection', () => {
    it('renders nothing when neither locale nor country tags exist', () => {
        mockFacts = { greatFor: [] };
        const { container } = renderWithProviders(<GreatForSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('falls back to the country tags when no locale tags are passed', () => {
        mockFacts = { greatFor: ['couples', 'foodies'] };
        renderWithProviders(<GreatForSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Great for' })
        ).toBeInTheDocument();
        expect(screen.getByText('Couples')).toBeInTheDocument();
        expect(screen.getByText('Foodies')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('prefers the locale tags over the country tags when provided', () => {
        mockFacts = { greatFor: ['couples'] };
        renderWithProviders(
            <GreatForSection code="US" greatFor={['beaches', 'nature']} />
        );
        expect(screen.getByText('Beaches')).toBeInTheDocument();
        expect(screen.getByText('Nature')).toBeInTheDocument();
        // Country tag must not leak through when locale tags win.
        expect(screen.queryByText('Couples')).not.toBeInTheDocument();
    });

    it('renders an unknown tag using its raw slug as the label', () => {
        mockFacts = { greatFor: [] };
        renderWithProviders(
            <GreatForSection code="US" greatFor={['stargazing']} />
        );
        expect(screen.getByText('stargazing')).toBeInTheDocument();
    });
});
