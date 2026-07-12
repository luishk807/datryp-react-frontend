import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { Airport } from 'types';
import AirportsSection from './index';

const airport = (over: Partial<Airport> = {}): Airport => ({
    iataCode: 'NRT',
    name: 'Narita International',
    distanceKm: 60,
    international: true,
    ...over,
});

describe('AirportsSection', () => {
    it('renders nothing when the source query errored', () => {
        const { container } = renderWithProviders(
            <AirportsSection airports={[airport()]} isError />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows a skeleton (title only, no list) while airports are undefined', () => {
        renderWithProviders(<AirportsSection airports={undefined} />);
        expect(
            screen.getByRole('heading', { name: 'Airports' })
        ).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('shows the unavailable note for a pre-feature empty array', () => {
        renderWithProviders(<AirportsSection airports={[]} />);
        expect(
            screen.getByText('Airport info unavailable.')
        ).toBeInTheDocument();
    });

    it('lists each airport with code, name, distance, and intl flag', () => {
        renderWithProviders(
            <AirportsSection
                airports={[
                    airport(),
                    airport({
                        iataCode: 'HND',
                        name: 'Haneda',
                        distanceKm: 0,
                        international: false,
                    }),
                ]}
            />
        );

        expect(screen.getByText('NRT')).toBeInTheDocument();
        expect(screen.getByText('Narita International')).toBeInTheDocument();
        // Distance shares its span with the " · International" flag, so match
        // the substring rather than the exact node text.
        expect(screen.getByText(/60 km away/)).toBeInTheDocument();
        expect(screen.getByText('International')).toBeInTheDocument();

        expect(screen.getByText('HND')).toBeInTheDocument();
        expect(screen.getByText('in the city')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
});
