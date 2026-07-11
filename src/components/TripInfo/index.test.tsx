import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '../../test/renderWithProviders';
import type { TripState } from 'types';

// SubLayout wraps the app chrome; DestinationDetail is a heavy itinerary
// editor with its own hooks — stub both so this read-only summary renders in
// isolation.
vi.mock('components/common/Layout/SubLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('components/DestinationDetail', () => ({
    default: () => <div data-testid="destination-detail" />,
}));

import TripInfo from './index';

const trip = {
    name: 'Tokyo Trip',
    budget: 500,
    total: 320,
    startDate: '2999-05-01',
    endDate: '2999-05-07',
    people: 3,
    destinations: [],
} as unknown as TripState;

describe('TripInfo', () => {
    it('renders the trip name and the budget / total / date / people rows', () => {
        renderWithProviders(<TripInfo data={trip} />);
        expect(screen.getByText('Trip: Tokyo Trip')).toBeInTheDocument();
        expect(screen.getByText('Budget:')).toBeInTheDocument();
        expect(screen.getByText('$500')).toBeInTheDocument();
        expect(screen.getByText('Total:')).toBeInTheDocument();
        expect(screen.getByText('$320')).toBeInTheDocument();
        expect(
            screen.getByText('2999-05-01 - 2999-05-07')
        ).toBeInTheDocument();
        expect(screen.getByText('People:')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows the completed status column and the destination detail region', () => {
        renderWithProviders(<TripInfo data={trip} />);
        expect(screen.getByText('Completed?')).toBeInTheDocument();
        expect(
            screen.getByTestId('destination-detail')
        ).toBeInTheDocument();
    });
});
