import { describe, it, expect } from 'vitest';
import { parseRoute, parseRouteStops } from './parseRoute';

describe('parseRouteStops', () => {
    it('returns [] for empty / whitespace / undefined input', () => {
        expect(parseRouteStops(undefined)).toEqual([]);
        expect(parseRouteStops('')).toEqual([]);
        expect(parseRouteStops('   ')).toEqual([]);
    });

    it('returns a single stop for a bare destination', () => {
        expect(parseRouteStops('Panama')).toEqual(['Panama']);
    });

    it('parses a simple "A to B" route, stripping transport verbs', () => {
        expect(parseRouteStops('flight london to newark')).toEqual([
            'london',
            'newark',
        ]);
    });

    it('strips trailing date noise from a side', () => {
        expect(parseRouteStops('EWR to Panama City June 6')).toEqual([
            'EWR',
            'Panama City',
        ]);
    });

    it('keeps a multi-word city with an internal "to" intact', () => {
        expect(parseRouteStops('Toronto to Boston')).toEqual([
            'Toronto',
            'Boston',
        ]);
    });

    it('parses chained route order into waypoints', () => {
        expect(parseRouteStops('london to oslo to moscow')).toEqual([
            'london',
            'oslo',
            'moscow',
        ]);
    });

    it('splits on an arrow separator', () => {
        expect(parseRouteStops('london -> paris')).toEqual(['london', 'paris']);
    });

    it('splices a "with a stopover in" clause after the origin', () => {
        expect(
            parseRouteStops('london to moscow with a stopover in oslo'),
        ).toEqual(['london', 'oslo', 'moscow']);
    });

    it('handles a "via" stopover clause', () => {
        expect(parseRouteStops('london via oslo to moscow')).toEqual([
            'london',
            'oslo',
            'moscow',
        ]);
    });

    it('treats a trailing "from X" as a stopover when an origin precedes "to"', () => {
        expect(parseRouteStops('panama to argentina from colombia')).toEqual([
            'panama',
            'colombia',
            'argentina',
        ]);
    });

    it('treats a trailing "from X" as the origin in reversed phrasing', () => {
        expect(parseRouteStops('flight to newark from switzerland')).toEqual([
            'switzerland',
            'newark',
        ]);
    });

    it('strips a clock-time / departure-window phrase before parsing', () => {
        expect(
            parseRouteStops('flight from panama to argentina from 8pm to 2am'),
        ).toEqual(['panama', 'argentina']);
    });
});

describe('parseRoute', () => {
    it('returns an empty object for a bare destination (no route)', () => {
        expect(parseRoute('Panama')).toEqual({});
        expect(parseRoute(undefined)).toEqual({});
        expect(parseRoute('')).toEqual({});
    });

    it('returns origin + destination for a simple route', () => {
        expect(parseRoute('flight london to newark')).toEqual({
            origin: 'london',
            destination: 'newark',
        });
    });

    it('uses the first and last waypoints as origin / destination', () => {
        expect(parseRoute('london to oslo to moscow')).toEqual({
            origin: 'london',
            destination: 'moscow',
        });
    });

    it('resolves reversed phrasing', () => {
        expect(parseRoute('flight to newark from switzerland')).toEqual({
            origin: 'switzerland',
            destination: 'newark',
        });
    });
});
