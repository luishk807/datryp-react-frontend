import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { TripState } from 'types';
import TripDestinationChip from './index';

const tripWith = (country: string, activityName?: string): TripState => ({
    destinations: [
        {
            id: 1,
            country: { id: 1, name: country },
            itinerary: activityName
                ? [
                      {
                          id: 1,
                          date: '2026-08-01',
                          activities: [{ id: 1, name: activityName } as never],
                      },
                  ]
                : [],
        },
    ],
});

describe('TripDestinationChip', () => {
    it('renders nothing before a country is set', () => {
        const { container } = renderWithProviders(
            <TripDestinationChip data={{ destinations: [] }} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when data is undefined', () => {
        const { container } = renderWithProviders(
            <TripDestinationChip data={undefined} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the "Going to <country>" label with an accessible name', () => {
        const { container } = renderWithProviders(
            <TripDestinationChip data={tripWith('France')} />
        );
        expect(screen.getByText('Going to')).toBeInTheDocument();
        expect(screen.getByText('France')).toBeInTheDocument();
        expect(
            container.querySelector('[aria-label="Trip destination"]')
        ).toBeInTheDocument();
    });

    it('reads "City, Country" when a seeded flight activity names a city', () => {
        renderWithProviders(
            <TripDestinationChip data={tripWith('France', 'Flight to Paris')} />
        );
        expect(screen.getByText('Paris, France')).toBeInTheDocument();
    });

    it('reads the train destination city too', () => {
        renderWithProviders(
            <TripDestinationChip data={tripWith('Japan', 'Train to Kyoto')} />
        );
        expect(screen.getByText('Kyoto, Japan')).toBeInTheDocument();
    });

    it('dedupes a city that just echoes the country name', () => {
        renderWithProviders(
            <TripDestinationChip
                data={tripWith('Iceland', 'Flight to Iceland')}
            />
        );
        expect(screen.getByText('Iceland')).toBeInTheDocument();
        expect(
            screen.queryByText('Iceland, Iceland')
        ).not.toBeInTheDocument();
    });
});
