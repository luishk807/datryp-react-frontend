import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { Coordinates } from 'types';

// TravelWidget renders a Leaflet map (no DOM map engine in jsdom) and fetches
// the traveler origin — stub it so this test covers only the section states.
vi.mock('components/PlaceDetail/TravelWidget', () => ({
    default: ({ placeName }: { placeName: string }) => (
        <div data-testid="travel-widget">{placeName}</div>
    ),
}));

import GettingThereSection from './index';

const coords: Coordinates = { lat: 35.6, lng: 139.7 };

describe('GettingThereSection', () => {
    it('renders the travel widget once coordinates resolve', () => {
        renderWithProviders(
            <GettingThereSection
                placeName="Tokyo Tower, Tokyo"
                coordinates={coords}
                isError={false}
            />
        );

        expect(
            screen.getByRole('heading', { name: 'Getting there' })
        ).toBeInTheDocument();
        expect(screen.getByTestId('travel-widget')).toHaveTextContent(
            'Tokyo Tower, Tokyo'
        );
    });

    it('shows an inline error when the source query failed', () => {
        renderWithProviders(
            <GettingThereSection
                placeName="Tokyo Tower"
                coordinates={undefined}
                isError
            />
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not load travel info.'
        );
    });

    it('shows the loading hint while coordinates are undefined', () => {
        renderWithProviders(
            <GettingThereSection
                placeName="Tokyo Tower"
                coordinates={undefined}
                isError={false}
            />
        );
        expect(
            screen.getByText('Calculating distance from your home base…')
        ).toBeInTheDocument();
        expect(screen.queryByTestId('travel-widget')).not.toBeInTheDocument();
    });
});
