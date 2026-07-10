import { describe, it, expect } from 'vitest';
import { parseTransitEntry } from './parseTransitQuery';

// Year-less date phrases resolve to the current year (moment().year()).
// Compute it here so the pins don't rot at the next new year.
const YEAR = new Date().getFullYear();

describe('parseTransitEntry — empty / invalid input', () => {
    it('returns null for undefined', () => {
        expect(parseTransitEntry(undefined)).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(parseTransitEntry('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
        expect(parseTransitEntry('   ')).toBeNull();
    });

    it('returns null when the input is only connector words', () => {
        expect(parseTransitEntry('from to')).toBeNull();
        expect(parseTransitEntry('from')).toBeNull();
    });

    it('returns null when the only token is stripped noise ("seat")', () => {
        expect(parseTransitEntry('seat')).toBeNull();
    });
});

describe('parseTransitEntry — station pairs', () => {
    it('splits "A to B" into depart / arrival stations', () => {
        expect(parseTransitEntry('Tokyo to Kyoto')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Kyoto',
            tripName: 'Tokyo → Kyoto',
        });
    });

    it('parses a full station-pair + time-range + cost', () => {
        expect(parseTransitEntry('Tokyo to Kyoto at 9am-12pm $100')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Kyoto',
            departTime: '09:00',
            arrivalTime: '12:00',
            cost: 100,
            tripName: 'Tokyo → Kyoto',
        });
    });

    it('keeps multi-word station names and strips a leading "from" connector', () => {
        expect(
            parseTransitEntry('from Madrid Atocha to Barcelona Sants'),
        ).toEqual({
            departStation: 'Madrid Atocha',
            arrivalStation: 'Barcelona Sants',
            tripName: 'Madrid Atocha → Barcelona Sants',
        });
    });
});

describe('parseTransitEntry — known operators', () => {
    it('matches a bare known operator', () => {
        expect(parseTransitEntry('Hertz')).toEqual({
            operator: 'Hertz',
            tripName: 'Hertz',
        });
    });

    it('matches the bare "JR" short form', () => {
        expect(parseTransitEntry('JR')).toEqual({
            operator: 'JR',
            tripName: 'JR',
        });
    });

    it('prefers the multi-word "JR East" over the bare "JR"', () => {
        expect(parseTransitEntry('JR East from Tokyo to Osaka')).toEqual({
            operator: 'JR East',
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            tripName: 'JR East',
        });
    });

    it('matches an operator in "with X" phrasing', () => {
        expect(parseTransitEntry('with Hertz')).toEqual({
            operator: 'Hertz',
            tripName: 'Hertz',
        });
    });

    it('operator becomes the tripName even when a route is present', () => {
        expect(parseTransitEntry('Renfe 3152 from Madrid to Barcelona')).toEqual({
            operator: 'Renfe',
            number: '3152',
            departStation: 'Madrid',
            arrivalStation: 'Barcelona',
            tripName: 'Renfe',
        });
    });
});

describe('parseTransitEntry — generic "with X company" operator', () => {
    it('captures an unknown operator from "with X company" phrasing', () => {
        const result = parseTransitEntry('reservation with Turo company');
        expect(result?.operator).toBe('Turo');
        expect(result?.tripName).toBe('Turo');
    });
});

describe('parseTransitEntry — service numbers', () => {
    it('picks up a bare number right after a known operator', () => {
        expect(parseTransitEntry('ICE 372')).toEqual({
            operator: 'ICE',
            number: '372',
            tripName: 'ICE',
        });
    });

    it('picks up a keyword-anchored "train N" number', () => {
        expect(parseTransitEntry('train 3152 Tokyo to Osaka')).toEqual({
            number: '3152',
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            tripName: 'Tokyo → Osaka',
        });
    });

    it('picks up a "no. N" number', () => {
        const result = parseTransitEntry('no. 2153 from Boston to New York');
        expect(result?.number).toBe('2153');
        expect(result?.arrivalStation).toBe('New York');
    });

    it('does not treat a claimed date-digit after the operator as a number', () => {
        const result = parseTransitEntry('Renfe 2026-05-27 Madrid to Barcelona');
        expect(result?.number).toBeUndefined();
        expect(result?.operator).toBe('Renfe');
        expect(result?.departDate).toBe('2026-05-27');
    });

    it('does not read the cost token after the operator as a number', () => {
        expect(parseTransitEntry('Renfe $99 Madrid to Barcelona')).toEqual({
            operator: 'Renfe',
            departStation: 'Madrid',
            arrivalStation: 'Barcelona',
            cost: 99,
            tripName: 'Renfe',
        });
    });
});

describe('parseTransitEntry — seat vs car class', () => {
    it('extracts a train seat', () => {
        expect(parseTransitEntry('seat 4A Tokyo to Osaka')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            classOrSeat: '4A',
            tripName: 'Tokyo → Osaka',
        });
    });

    it('extracts a seat behind a coach/car prefix', () => {
        expect(parseTransitEntry('coach B seat 21 Tokyo to Osaka')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            classOrSeat: '21',
            tripName: 'Tokyo → Osaka',
        });
        expect(parseTransitEntry('car 7 seat 21B Tokyo to Osaka')?.classOrSeat).toBe('21B');
    });

    it('extracts a car class', () => {
        expect(parseTransitEntry('sedan car from LAX to JFK')).toEqual({
            departStation: 'LAX',
            arrivalStation: 'JFK',
            classOrSeat: 'sedan',
            tripName: 'LAX → JFK',
        });
    });

    it('handles a hyphenated car class', () => {
        expect(parseTransitEntry('Tokyo to Osaka mid-size car')?.classOrSeat).toBe('mid-size');
    });

    it('handles a "for a luxury vehicle" class phrase', () => {
        expect(parseTransitEntry('a car for a luxury vehicle with Sixt')).toEqual({
            operator: 'Sixt',
            classOrSeat: 'luxury',
            tripName: 'Sixt',
        });
    });

    it('prefers a seat over a car class when both appear', () => {
        expect(parseTransitEntry('sedan seat 4A')).toEqual({
            classOrSeat: '4A',
            tripName: 'sedan',
        });
    });
});

describe('parseTransitEntry — pickup / dropoff locations', () => {
    it('reads an explicit pickup-only location', () => {
        expect(parseTransitEntry('pick up location LAX')).toEqual({
            departStation: 'LAX',
        });
    });

    it('reads an explicit dropoff-only location', () => {
        expect(parseTransitEntry('dropoff location JFK')).toEqual({
            arrivalStation: 'JFK',
        });
    });

    it('reads pickup + dropoff with sided times', () => {
        expect(
            parseTransitEntry('pickup at LAX at 3pm dropoff at JFK at 6pm'),
        ).toEqual({
            departStation: 'LAX',
            arrivalStation: 'JFK',
            departTime: '15:00',
            arrivalTime: '18:00',
            tripName: 'LAX → JFK',
        });
    });
});

describe('parseTransitEntry — dates', () => {
    it('parses an ISO date and classifies it as arrival after "to"', () => {
        expect(parseTransitEntry('Tokyo to Osaka on 2026-05-27')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            arrivalDate: '2026-05-27',
            tripName: 'Tokyo → Osaka',
        });
    });

    it('parses an M/D/YYYY numeric date', () => {
        expect(parseTransitEntry('Tokyo to Osaka 6/1/2026')?.arrivalDate).toBe('2026-06-01');
    });

    it('interprets a two-digit year as 20XX', () => {
        expect(parseTransitEntry('Tokyo to Osaka on 5/27/26')?.arrivalDate).toBe('2026-05-27');
    });

    it('parses a "Month D YYYY" date', () => {
        expect(parseTransitEntry('May 27 2026 Tokyo to Osaka')?.departDate).toBe('2026-05-27');
    });

    it('parses a "D Month YYYY" (reversed) date', () => {
        expect(parseTransitEntry('8 July 2026 Tokyo to Osaka')?.departDate).toBe('2026-07-08');
    });

    it('parses a month-name date with an ordinal and no year (current year)', () => {
        expect(parseTransitEntry('Tokyo to Osaka on Jul 8th')?.arrivalDate).toBe(`${YEAR}-07-08`);
    });

    it('parses a year-less "D Month" date to the current year', () => {
        const result = parseTransitEntry('FlixBus 8 July to somewhere');
        expect(result?.operator).toBe('FlixBus');
        expect(result?.departDate).toBe(`${YEAR}-07-08`);
    });

    it('skips an out-of-range numeric date (month > 12) — it leaks into the station', () => {
        expect(parseTransitEntry('Tokyo to Osaka 13/45/9999')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka 13/45/9999',
            tripName: 'Tokyo → Osaka 13/45/9999',
        });
    });

    it('skips a numeric date with an out-of-range day (6/45)', () => {
        const result = parseTransitEntry('Tokyo to Osaka 6/45/2026');
        expect(result?.departDate).toBeUndefined();
        expect(result?.arrivalDate).toBeUndefined();
        expect(result?.arrivalStation).toBe('Osaka 6/45/2026');
    });

    it('skips an invalid calendar numeric date (2/30)', () => {
        const result = parseTransitEntry('Tokyo to Osaka 2/30/2026');
        expect(result?.departDate).toBeUndefined();
        expect(result?.arrivalDate).toBeUndefined();
        expect(result?.arrivalStation).toBe('Osaka 2/30/2026');
    });

    it('skips an impossible month-name date (Feb 30) rather than emitting it', () => {
        const result = parseTransitEntry('Feb 30 2026 Tokyo to Osaka');
        expect(result?.departDate).toBeUndefined();
        expect(result?.arrivalDate).toBeUndefined();
        expect(result?.departStation).toBe('Feb 30 2026 Tokyo');
    });

    it('classifies "depart …" as depart and "return …" as arrival', () => {
        const result = parseTransitEntry(
            'Rome to Milan depart 6/1/2026 return 6/5/2026',
        );
        expect(result?.departDate).toBe('2026-06-05');
        expect(result?.arrivalDate).toBe('2026-06-01');
    });

    it('falls back to depart-then-arrival for two hint-less dates', () => {
        const result = parseTransitEntry('trip 6/1/2026 then 6/5/2026');
        expect(result?.departDate).toBe('2026-06-01');
        expect(result?.arrivalDate).toBe('2026-06-05');
    });

    it('gives independent depart/arrival dates for a two-date "from/to" range', () => {
        const result = parseTransitEntry('Tokyo to Osaka from 5/27 to 5/28');
        expect(result?.departDate).toBe(`${YEAR}-05-28`);
        expect(result?.arrivalDate).toBe(`${YEAR}-05-27`);
    });

    it('applies a single date to BOTH legs when depart + arrival times are present', () => {
        expect(
            parseTransitEntry('Tokyo to Osaka 9am-5pm on 6/1/2026'),
        ).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            departTime: '09:00',
            arrivalTime: '17:00',
            departDate: '2026-06-01',
            arrivalDate: '2026-06-01',
            tripName: 'Tokyo → Osaka',
        });
    });
});

describe('parseTransitEntry — sided times', () => {
    it('reads a single depart-side time (no dropoff keyword)', () => {
        const result = parseTransitEntry(
            'Amtrak 2153 Boston to New York on 2026-08-15 at 7am',
        );
        expect(result).toEqual({
            operator: 'Amtrak',
            number: '2153',
            departStation: 'Boston',
            arrivalStation: 'New York',
            departTime: '07:00',
            arrivalDate: '2026-08-15',
            tripName: 'Amtrak',
        });
    });
});

describe('parseTransitEntry — cost & confirmation', () => {
    it('reads a trailing-word cost and a car class', () => {
        expect(
            parseTransitEntry('car reservation for compact with Avis for 55 dollars'),
        ).toEqual({
            operator: 'Avis',
            classOrSeat: 'compact',
            cost: 55,
            tripName: 'Avis',
        });
    });

    it('reads a "confirmation ABC123" code', () => {
        expect(parseTransitEntry('confirmation ABC123 Tokyo to Osaka')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            confirmationNumber: 'ABC123',
            tripName: 'Tokyo → Osaka',
        });
    });

    it('reads a "booking #XYZ789" code alongside an operator', () => {
        expect(parseTransitEntry('booking #XYZ789 with Sixt')).toEqual({
            operator: 'Sixt',
            confirmationNumber: 'XYZ789',
            tripName: 'Sixt',
        });
    });
});

describe('parseTransitEntry — mode-noise / connector stripping', () => {
    it('strips a leading "bullet train from" descriptor', () => {
        expect(parseTransitEntry('bullet train from Tokyo to Osaka')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            tripName: 'Tokyo → Osaka',
        });
    });

    it('strips a trailing "by bus" descriptor', () => {
        expect(parseTransitEntry('Tokyo to Osaka by bus')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            tripName: 'Tokyo → Osaka',
        });
    });

    it('strips a "take the metro from" prefix', () => {
        expect(parseTransitEntry('take the metro from Tokyo to Osaka')).toEqual({
            departStation: 'Tokyo',
            arrivalStation: 'Osaka',
            tripName: 'Tokyo → Osaka',
        });
    });

    it('strips a "ride the ferry from" prefix', () => {
        expect(parseTransitEntry('ride the ferry from Athens to Santorini')).toEqual({
            departStation: 'Athens',
            arrivalStation: 'Santorini',
            tripName: 'Athens → Santorini',
        });
    });

    it('scrubs a trailing station connector into the tripName fallback', () => {
        expect(parseTransitEntry('Barcelona Sants on')).toEqual({
            tripName: 'Barcelona Sants',
        });
    });
});

describe('parseTransitEntry — residual fallback tripName', () => {
    it('leaks an unparsed phrase into tripName', () => {
        expect(parseTransitEntry('hello world')).toEqual({
            tripName: 'hello world',
        });
    });

    it('keeps a leading "#" token in the station residual', () => {
        expect(parseTransitEntry('#3152 Tokyo to Osaka')).toEqual({
            departStation: '#3152 Tokyo',
            arrivalStation: 'Osaka',
            tripName: '#3152 Tokyo → Osaka',
        });
    });
});

describe('parseTransitEntry — full rental integration example', () => {
    it('parses the documented multi-field car-reservation sentence', () => {
        expect(
            parseTransitEntry(
                'have a car reservation for sedan car with Hertz company ' +
                    'pick up location LAX and dropoff location is JFK ' +
                    'confirmation # FL-22 for 40.00 ' +
                    'from 5/27/2026 12pm and dropoff 5/27/2026 6pm',
            ),
        ).toEqual({
            operator: 'Hertz',
            departStation: 'LAX',
            arrivalStation: 'JFK',
            arrivalTime: '12:00',
            departDate: '2026-05-27',
            arrivalDate: '2026-05-27',
            classOrSeat: 'sedan',
            confirmationNumber: 'FL-22',
            cost: 40,
            tripName: 'Hertz',
        });
    });
});
