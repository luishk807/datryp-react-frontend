import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { TripState } from 'types';
import TripCompletionSummary from './index';

// A completed two-country trip with three activities carrying real costs so
// `deriveTripStats` produces stable, hand-checkable recap numbers.
const trip = {
    startDate: '2999-05-01',
    endDate: '2999-05-05',
    budget: 1000,
    destinations: [
        {
            id: 1,
            country: { name: 'France', code: 'FR' },
            itinerary: [
                {
                    id: 1,
                    date: '2999-05-01',
                    activities: [
                        { id: 1, name: 'Louvre', cost: 100 },
                        { id: 2, name: 'Eiffel', cost: 50 },
                    ],
                },
            ],
        },
        {
            id: 2,
            country: { name: 'Italy', code: 'IT' },
            itinerary: [
                {
                    id: 2,
                    date: '2999-05-04',
                    activities: [{ id: 3, name: 'Colosseum', cost: 25 }],
                },
            ],
        },
    ],
} as unknown as TripState;

const singleTrip = {
    startDate: '2999-06-01',
    endDate: '2999-06-01',
    destinations: [
        {
            id: 1,
            country: { name: 'Japan', code: 'JP' },
            itinerary: [
                {
                    id: 1,
                    date: '2999-06-01',
                    activities: [{ id: 1, name: 'Shrine', cost: 10 }],
                },
            ],
        },
    ],
} as unknown as TripState;

describe('TripCompletionSummary', () => {
    it('renders the recap region and heading', () => {
        renderWithProviders(<TripCompletionSummary data={trip} travelers={4} />);
        expect(
            screen.getByRole('region', { name: 'Trip recap' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Trip recap' })
        ).toBeInTheDocument();
        expect(
            screen.getByText('A snapshot of where you went and what you did.')
        ).toBeInTheDocument();
    });

    it('shows the derived day / activity / country / traveler counts and spend', () => {
        renderWithProviders(<TripCompletionSummary data={trip} travelers={4} />);
        // 5-day span, 3 activities, 2 countries, 4 travelers (prop), $175 spent.
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Days')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Activities')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Countries')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('Travelers')).toBeInTheDocument();
        expect(screen.getByText('$175.00')).toBeInTheDocument();
        expect(screen.getByText('Spent')).toBeInTheDocument();
    });

    it('uses singular stat labels for a one-of-each trip', () => {
        renderWithProviders(
            <TripCompletionSummary data={singleTrip} travelers={1} />
        );
        expect(screen.getByText('Day')).toBeInTheDocument();
        expect(screen.getByText('Activity')).toBeInTheDocument();
        expect(screen.getByText('Country')).toBeInTheDocument();
        expect(screen.getByText('Traveler')).toBeInTheDocument();
    });
});
