import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { CountryFactsResult } from 'api/countryFactsApi';

let mockFacts: Partial<CountryFactsResult> | null = null;
vi.mock('api/hooks/useCountryFacts', () => ({
    useCountryFacts: () => ({ data: mockFacts }),
}));

import FestivalsSection from './index';

beforeEach(() => {
    mockFacts = null;
});

describe('FestivalsSection', () => {
    it('renders nothing when there are no festivals', () => {
        mockFacts = { festivals: [] };
        const { container } = renderWithProviders(<FestivalsSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the payload is missing entirely', () => {
        mockFacts = null;
        const { container } = renderWithProviders(<FestivalsSection code="JP" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('lists each festival, showing timing only when present', () => {
        mockFacts = {
            festivals: [
                { name: 'Cherry Blossom', when: 'Late March' },
                { name: 'Obon', when: null },
            ],
        };
        renderWithProviders(<FestivalsSection code="JP" />);

        expect(
            screen.getByRole('heading', { name: 'Festivals & holidays' })
        ).toBeInTheDocument();
        expect(screen.getByText('Cherry Blossom')).toBeInTheDocument();
        expect(screen.getByText('Late March')).toBeInTheDocument();
        expect(screen.getByText('Obon')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('makes each festival a keyboard tab stop that voices its name and timing', () => {
        mockFacts = {
            festivals: [
                { name: 'Cherry Blossom', when: 'Late March' },
                { name: 'Obon', when: null },
            ],
        };
        renderWithProviders(<FestivalsSection code="JP" />);

        // Each festival is its own tab stop (so Tab walks through them) and
        // carries an accessible name of "<name>. <when>" — screen readers voice
        // the whole entry on focus, not just the card title.
        const cherry = screen.getByRole('listitem', {
            name: 'Cherry Blossom. Late March',
        });
        expect(cherry).toHaveAttribute('tabindex', '0');
        // A timing-less festival is named by its name alone.
        expect(
            screen.getByRole('listitem', { name: 'Obon' })
        ).toHaveAttribute('tabindex', '0');
    });
});
