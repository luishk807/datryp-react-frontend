import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
    renderWithProviders,
    screen,
} from '../../../../../test/renderWithProviders';
import type { FlightDepartureOption } from 'api/flightDeparturesApi';
import FlightDepartureRow from './index';

const baseItem: FlightDepartureOption = {
    flightNumber: 'UA100',
    airline: 'United',
    airlineIata: 'UA',
    departAirport: 'EWR',
    departDate: '2026-08-01',
    departTime: '08:00',
    arrivalAirport: 'PTY',
    arrivalAirportName: 'Tocumen',
    arrivalDate: '2026-08-01',
    arrivalTime: '14:00',
    aircraft: 'Boeing 737',
};

const renderRow = (
    item: FlightDepartureOption,
    onPick = vi.fn()
) => {
    renderWithProviders(
        <ul>
            <FlightDepartureRow item={item} onPick={onPick} />
        </ul>
    );
    return onPick;
};

describe('FlightDepartureRow', () => {
    it('renders the flight number, airline, route, times and aircraft', () => {
        renderRow(baseItem);
        expect(screen.getByText('UA100')).toBeInTheDocument();
        expect(screen.getByText('United')).toBeInTheDocument();
        expect(screen.getByText('Boeing 737')).toBeInTheDocument();
        expect(screen.getByText('Use')).toBeInTheDocument();
        const route = screen.getByText(
            (c, el) =>
                el?.classList.contains('flight-departure-row-route') ?? false
        );
        expect(route.textContent).toContain('EWR');
        expect(route.textContent).toContain('PTY');
        expect(route.textContent).toContain('Tocumen');
        const times = screen.getByText(
            (c, el) =>
                el?.classList.contains('flight-departure-row-times') ?? false
        );
        expect(times.textContent).toContain('08:00');
        expect(times.textContent).toContain('14:00');
    });

    it('exposes an accessible name naming the flight and route', () => {
        renderRow(baseItem);
        expect(
            screen.getByRole('button', { name: /Use flight UA100/ })
        ).toBeInTheDocument();
    });

    it('fires onPick with the full item when the card is clicked', async () => {
        const onPick = renderRow(baseItem);
        await userEvent.click(
            screen.getByRole('button', { name: /Use flight UA100/ })
        );
        expect(onPick).toHaveBeenCalledTimes(1);
        expect(onPick.mock.calls[0][0]).toEqual(baseItem);
    });

    it('shows a dash placeholder for a missing flight number and hides the airline', () => {
        renderRow({ ...baseItem, flightNumber: null, airline: null });
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.queryByText('United')).not.toBeInTheDocument();
    });
});
