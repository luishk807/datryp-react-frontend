import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { TripState } from 'types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => mockNavigate,
}));

import TripAtlasConfirmation from './index';

// Two real places (name + city + country) in one country → 1 country, 1 city,
// 2 places recorded by `deriveAtlasRecord`.
const recordedTrip = {
    destinations: [
        {
            id: 1,
            country: { name: 'France', code: 'FR' },
            itinerary: [
                {
                    id: 1,
                    date: '2999-05-01',
                    activities: [
                        {
                            id: 1,
                            name: 'Louvre',
                            placeCity: 'Paris',
                            placeCountry: 'France',
                        },
                        {
                            id: 2,
                            name: 'Eiffel Tower',
                            placeCity: 'Paris',
                            placeCountry: 'France',
                        },
                    ],
                },
            ],
        },
    ],
} as unknown as TripState;

// A country but no place-identified activities → countries 1, places 0.
const countryOnlyTrip = {
    destinations: [
        {
            id: 1,
            country: { name: 'Spain', code: 'ES' },
            itinerary: [
                { id: 1, date: '2999-05-01', activities: [{ id: 1, note: 'free text' }] },
            ],
        },
    ],
} as unknown as TripState;

beforeEach(() => {
    mockNavigate.mockReset();
});

describe('TripAtlasConfirmation', () => {
    it('renders nothing when the trip recorded no countries or places', () => {
        const { container } = renderWithProviders(
            <TripAtlasConfirmation data={{ destinations: [] } as TripState} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('celebrates the Atlas write with the recorded stats', () => {
        renderWithProviders(<TripAtlasConfirmation data={recordedTrip} />);
        expect(
            screen.getByText('Added to your Travel Atlas')
        ).toBeInTheDocument();
        // stats joined "1 country • 1 city • 2 places" then "… recorded".
        expect(
            screen.getByText(/1 country • 1 city • 2 places recorded/)
        ).toBeInTheDocument();
    });

    it('renders even when only a country was recorded (no places)', () => {
        renderWithProviders(<TripAtlasConfirmation data={countryOnlyTrip} />);
        expect(
            screen.getByText('Added to your Travel Atlas')
        ).toBeInTheDocument();
        expect(screen.getByText(/1 country recorded/)).toBeInTheDocument();
    });

    it('navigates to the Atlas map when the CTA is clicked', async () => {
        renderWithProviders(<TripAtlasConfirmation data={recordedTrip} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'View Atlas' })
        );
        expect(mockNavigate).toHaveBeenCalledWith('/atlas-map');
    });
});
