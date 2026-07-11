import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | undefined;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import ReligionSection from './index';

beforeEach(() => {
    mockFacts = undefined;
});

describe('ReligionSection', () => {
    it('renders nothing while the facts are still loading', () => {
        const { container } = renderWithProviders(<ReligionSection code="SA" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for a country with no curated religion', () => {
        mockFacts = { religion: null } as Partial<CountryFactsResult>;
        const { container } = renderWithProviders(<ReligionSection code="SA" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the dominant faith, note, and practical customs', () => {
        mockFacts = {
            religion: {
                main: 'Islam',
                emoji: '☪️',
                note: 'official religion',
                customs: ['Dress modestly at mosques', 'Remove shoes indoors'],
            },
        } as Partial<CountryFactsResult>;
        renderWithProviders(<ReligionSection code="SA" />);

        expect(
            screen.getByRole('heading', { name: /religion/i })
        ).toBeInTheDocument();
        expect(screen.getByText('Islam')).toBeInTheDocument();
        expect(screen.getByText(/official religion/)).toBeInTheDocument();
        expect(screen.getByText('Important customs')).toBeInTheDocument();
        const customs = screen.getAllByRole('listitem');
        expect(customs).toHaveLength(2);
        expect(customs[0]).toHaveTextContent('Dress modestly at mosques');
    });

    it('falls back to the icon and omits the customs block when there are none', () => {
        mockFacts = {
            religion: {
                main: 'Shinto & Buddhism',
                emoji: null,
                note: null,
                customs: [],
            },
        } as Partial<CountryFactsResult>;
        renderWithProviders(<ReligionSection code="JP" />);

        expect(screen.getByText('Shinto & Buddhism')).toBeInTheDocument();
        expect(screen.queryByText('Important customs')).not.toBeInTheDocument();
        expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
});
