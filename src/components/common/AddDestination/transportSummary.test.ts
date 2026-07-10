import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import { TRANSPORT_MODE, buildTransportSummary } from './transportSummary';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summary = (draft: any): string | null => buildTransportSummary(draft);

const base = {
    smartText: '',
    flightSegments: [],
    transitSegments: [],
    cost: '',
};

describe('TRANSPORT_MODE', () => {
    it('maps every transport kind to a label key and an icon', () => {
        expect(TRANSPORT_MODE[ACTIVITY_KIND.FLIGHT].labelKey).toBe('flight');
        expect(TRANSPORT_MODE[ACTIVITY_KIND.TRAIN].labelKey).toBe('train');
        expect(TRANSPORT_MODE[ACTIVITY_KIND.BUS].labelKey).toBe('bus');
        expect(TRANSPORT_MODE[ACTIVITY_KIND.RENTAL_CAR].labelKey).toBe(
            'rentalCar',
        );
        for (const kind of [
            ACTIVITY_KIND.FLIGHT,
            ACTIVITY_KIND.TRAIN,
            ACTIVITY_KIND.BUS,
            ACTIVITY_KIND.RENTAL_CAR,
        ]) {
            expect(TRANSPORT_MODE[kind].Icon).toBeTruthy();
        }
    });
});

describe('buildTransportSummary — kind guard', () => {
    it('returns null when no kind is chosen', () => {
        expect(summary({ ...base, kind: null })).toBeNull();
    });
});

describe('buildTransportSummary — flight', () => {
    it('builds the full dotted summary', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.FLIGHT,
                flightSegments: [
                    {
                        flightNumber: 'CM123',
                        departAirport: 'CUN',
                        arrivalAirport: 'PTY',
                        departDate: '2026-06-06',
                        departTime: '11:46',
                    },
                ],
            }),
        ).toBe('CM123 · CUN → PTY · 2026-06-06 · 11:46');
    });

    it('returns null when there is no first segment', () => {
        expect(
            summary({ ...base, kind: ACTIVITY_KIND.FLIGHT, flightSegments: [] }),
        ).toBeNull();
    });

    it('returns null for an empty segment (nothing to show)', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.FLIGHT,
                flightSegments: [{}],
            }),
        ).toBeNull();
    });

    it('omits the route when only one airport is present', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.FLIGHT,
                flightSegments: [
                    { flightNumber: 'AA1', departAirport: 'CUN' },
                ],
            }),
        ).toBe('AA1');
    });

    it('renders a route-only summary', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.FLIGHT,
                flightSegments: [
                    { departAirport: 'CUN', arrivalAirport: 'PTY' },
                ],
            }),
        ).toBe('CUN → PTY');
    });
});

describe('buildTransportSummary — transit (train / bus / rental)', () => {
    it('builds the full transit summary', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.TRAIN,
                transitSegments: [
                    {
                        operator: 'Renfe',
                        number: '3152',
                        departStation: 'Madrid',
                        arrivalStation: 'Barcelona',
                        departDate: '2026-06-06',
                        departTime: '09:00',
                    },
                ],
            }),
        ).toBe('Renfe · 3152 · Madrid → Barcelona · 2026-06-06 · 09:00');
    });

    it('handles the bus kind through the transit branch', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.BUS,
                transitSegments: [
                    {
                        operator: 'FlixBus',
                        departStation: 'Berlin',
                        arrivalStation: 'Prague',
                    },
                ],
            }),
        ).toBe('FlixBus · Berlin → Prague');
    });

    it('handles the rental_car kind through the transit branch', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.RENTAL_CAR,
                transitSegments: [{ operator: 'Hertz' }],
            }),
        ).toBe('Hertz');
    });

    it('returns null when there is no first transit segment', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.TRAIN,
                transitSegments: [],
            }),
        ).toBeNull();
    });

    it('returns null for an empty transit segment', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.TRAIN,
                transitSegments: [{}],
            }),
        ).toBeNull();
    });

    it('returns null when a lone depart station has no counterpart', () => {
        expect(
            summary({
                ...base,
                kind: ACTIVITY_KIND.TRAIN,
                transitSegments: [{ departStation: 'Madrid' }],
            }),
        ).toBeNull();
    });
});
