import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '../../../test/renderWithProviders';
import type { FlightInfo, TransitInfo } from 'types';
import FlightFields from './FlightFields';
import TransitFields from './TransitFields';
import {
    flightRoute,
    flightSchedule,
    transitRoute,
    transitOperatorLine,
    transitSchedule,
    toDateTime,
} from './helpers';

describe('TransportFields helpers', () => {
    it('formats a flight route from IATA codes (uppercased) and blanks an empty leg', () => {
        expect(flightRoute({ departAirport: 'jfk', arrivalAirport: 'lax' })).toBe(
            'JFK → LAX'
        );
        expect(flightRoute({ departAirport: 'jfk' })).toBe('JFK → —');
        expect(flightRoute({})).toBe('');
    });

    it('formats a flight schedule as "date · depart → arrive"', () => {
        expect(
            flightSchedule({
                departDate: '2026-06-15',
                departTime: '10:30',
                arrivalTime: '15:20',
            })
        ).toBe('Jun 15 · 10:30 AM → 3:20 PM');
        expect(flightSchedule({})).toBe('');
    });

    it('formats transit route + operator line + schedule', () => {
        expect(
            transitRoute({ departStation: 'Madrid', arrivalStation: 'Barcelona' })
        ).toBe('Madrid → Barcelona');
        expect(transitRoute({})).toBe('');
        expect(
            transitOperatorLine({ operator: 'Renfe', number: '3152' })
        ).toBe('Renfe 3152');
        expect(transitOperatorLine({})).toBe('');
        expect(
            transitSchedule({ departDate: '2026-06-15', departTime: '10:30' })
        ).toBe('Jun 15 · 10:30 AM → —');
    });

    it('combines date + time into a moment, null when both are absent', () => {
        const m = toDateTime('2026-06-15', '10:30');
        expect(m?.format('YYYY-MM-DD HH:mm')).toBe('2026-06-15 10:30');
        expect(toDateTime(undefined, undefined)).toBeNull();
    });
});

const flightSeg = (over: Partial<FlightInfo> = {}): FlightInfo => ({
    flightNumber: 'UA123',
    departAirport: 'JFK',
    arrivalAirport: 'LAX',
    departDate: '2026-06-15',
    departTime: '10:30',
    arrivalTime: '15:20',
    ...over,
});

describe('FlightFields', () => {
    it('renders a collapsed leg summary and the add-stopover control', () => {
        renderWithProviders(
            <FlightFields
                segments={[flightSeg()]}
                isoDefaultDate="2026-06-15"
                onField={() => {}}
                onAddLeg={() => {}}
                onRemoveLeg={() => {}}
            />
        );
        expect(screen.getByText('UA123')).toBeInTheDocument();
        expect(screen.getByText('JFK → LAX')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Add stopover' })
        ).toBeInTheDocument();
    });

    it('fires onAddLeg from the add-stopover button', async () => {
        const onAddLeg = vi.fn();
        renderWithProviders(
            <FlightFields
                segments={[flightSeg()]}
                isoDefaultDate="2026-06-15"
                onField={() => {}}
                onAddLeg={onAddLeg}
                onRemoveLeg={() => {}}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Add stopover' })
        );
        expect(onAddLeg).toHaveBeenCalledTimes(1);
    });

    it('renders a remove control per leg when there is more than one and fires onRemoveLeg', async () => {
        const onRemoveLeg = vi.fn();
        renderWithProviders(
            <FlightFields
                segments={[flightSeg(), flightSeg({ flightNumber: 'UA456' })]}
                isoDefaultDate="2026-06-15"
                onField={() => {}}
                onAddLeg={() => {}}
                onRemoveLeg={onRemoveLeg}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove segment 2' })
        );
        expect(onRemoveLeg).toHaveBeenCalledWith(1);
    });

    it('expands a leg to reveal its editable fields (aria-expanded toggles)', async () => {
        renderWithProviders(
            <FlightFields
                segments={[flightSeg({ departAirport: '', arrivalAirport: '' })]}
                isoDefaultDate="2026-06-15"
                onField={() => {}}
                onAddLeg={() => {}}
                onRemoveLeg={() => {}}
            />
        );
        const toggle = screen.getAllByRole('button', { expanded: false })[0];
        await userEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Flight number')).toBeInTheDocument();
    });
});

const transitSeg = (over: Partial<TransitInfo> = {}): TransitInfo => ({
    operator: 'Renfe',
    number: '3152',
    departStation: 'Madrid',
    arrivalStation: 'Barcelona',
    departDate: '2026-06-15',
    departTime: '10:30',
    arrivalTime: '15:20',
    ...over,
});

describe('TransitFields', () => {
    it('renders a collapsed transit leg with route + operator and the add-leg control', () => {
        renderWithProviders(
            <TransitFields
                segments={[transitSeg()]}
                isRental={false}
                isoDefaultDate="2026-06-15"
                onField={() => {}}
                onAddLeg={() => {}}
                onRemoveLeg={() => {}}
            />
        );
        expect(screen.getByText('Madrid → Barcelona')).toBeInTheDocument();
        expect(screen.getByText('Renfe 3152')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Add leg' })
        ).toBeInTheDocument();
    });

    it('hides the add-leg control when showAddLeg is false', () => {
        renderWithProviders(
            <TransitFields
                segments={[transitSeg()]}
                isRental={false}
                isoDefaultDate="2026-06-15"
                showAddLeg={false}
                onField={() => {}}
                onAddLeg={() => {}}
                onRemoveLeg={() => {}}
            />
        );
        expect(
            screen.queryByRole('button', { name: 'Add leg' })
        ).not.toBeInTheDocument();
    });

    it('uses rental-specific field labels when expanded', async () => {
        renderWithProviders(
            <TransitFields
                segments={[transitSeg()]}
                isRental
                isoDefaultDate="2026-06-15"
                onField={() => {}}
                onAddLeg={() => {}}
                onRemoveLeg={() => {}}
            />
        );
        await userEvent.click(screen.getAllByRole('button', { expanded: false })[0]);
        expect(screen.getByText('Rental company')).toBeInTheDocument();
        expect(screen.getByText('Pickup location')).toBeInTheDocument();
    });

    it('fires onRemoveLeg for the chosen leg when multiple legs exist', async () => {
        const onRemoveLeg = vi.fn();
        renderWithProviders(
            <TransitFields
                segments={[transitSeg(), transitSeg({ operator: 'Ouigo' })]}
                isRental={false}
                isoDefaultDate="2026-06-15"
                onField={() => {}}
                onAddLeg={() => {}}
                onRemoveLeg={onRemoveLeg}
            />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove segment 1' })
        );
        expect(onRemoveLeg).toHaveBeenCalledWith(0);
    });
});
