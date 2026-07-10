import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import { classifyActivityKind } from './classifyActivityKind';

describe('classifyActivityKind — empty / too-short input', () => {
    it('returns null for the empty string', () => {
        expect(classifyActivityKind('')).toBeNull();
    });

    it('returns null for a single character', () => {
        expect(classifyActivityKind('a')).toBeNull();
    });

    it('returns null for whitespace that trims below 2 chars', () => {
        expect(classifyActivityKind(' a ')).toBeNull();
    });
});

describe('classifyActivityKind — URLs always route to Place', () => {
    it('classifies an https link as Place/Link', () => {
        expect(
            classifyActivityKind('https://riu.com/hotel-riu-plaza-panama'),
        ).toEqual({ kind: ACTIVITY_KIND.PLACE, label: 'Link' });
    });

    it('classifies an http link as Place/Link (case-insensitive)', () => {
        expect(classifyActivityKind('HTTP://Example.com/x')).toEqual({
            kind: ACTIVITY_KIND.PLACE,
            label: 'Link',
        });
    });
});

describe('classifyActivityKind — Flight', () => {
    it('detects a parsed flight number', () => {
        expect(classifyActivityKind('UA123 tomorrow')).toEqual({
            kind: ACTIVITY_KIND.FLIGHT,
            label: 'Flight',
        });
    });

    it('detects a spaced flight code', () => {
        expect(classifyActivityKind('UA 123').kind).toBe(ACTIVITY_KIND.FLIGHT);
    });

    it('lets an explicit "flight" word beat a station-pair', () => {
        expect(classifyActivityKind('flight from New York to Malé')).toEqual({
            kind: ACTIVITY_KIND.FLIGHT,
            label: 'Flight',
        });
    });

    it('lets "fly" win over the station-pair train default', () => {
        expect(classifyActivityKind('fly to Tokyo').kind).toBe(
            ACTIVITY_KIND.FLIGHT,
        );
    });
});

describe('classifyActivityKind — ground transport', () => {
    it('classifies an operator + number + station pair as Train', () => {
        expect(
            classifyActivityKind('Renfe 3152 Madrid to Barcelona'),
        ).toEqual({ kind: ACTIVITY_KIND.TRAIN, label: 'Train' });
    });

    it('classifies a bare station pair (no operator) as Train', () => {
        expect(classifyActivityKind('Tokyo to Kyoto')).toEqual({
            kind: ACTIVITY_KIND.TRAIN,
            label: 'Train',
        });
    });

    it('classifies a bus brand as Bus', () => {
        expect(classifyActivityKind('FlixBus to Berlin')).toEqual({
            kind: ACTIVITY_KIND.BUS,
            label: 'Bus',
        });
    });

    it('classifies a ride-hail as Other/Ride', () => {
        expect(classifyActivityKind('uber to JFK')).toEqual({
            kind: ACTIVITY_KIND.OTHER,
            label: 'Ride',
        });
    });

    it('classifies a rental company as Rental car', () => {
        expect(classifyActivityKind('Hertz car rental LAX')).toEqual({
            kind: ACTIVITY_KIND.RENTAL_CAR,
            label: 'Rental car',
        });
    });

    it('lets a dining word override a weak station pair to Place', () => {
        expect(
            classifyActivityKind('Dinner at La Pulpería → Casco Antiguo'),
        ).toEqual({ kind: ACTIVITY_KIND.PLACE, label: 'Place' });
    });
});

describe('classifyActivityKind — Hotel', () => {
    it('classifies a lodging brand as Hotel', () => {
        expect(classifyActivityKind('Hilton Times Square')).toEqual({
            kind: ACTIVITY_KIND.HOTEL_CHECKIN,
            label: 'Hotel',
        });
    });

    it('classifies a check-in keyword as Hotel', () => {
        expect(classifyActivityKind('check-in 3pm at the Marriott').kind).toBe(
            ACTIVITY_KIND.HOTEL_CHECKIN,
        );
    });
});

describe('classifyActivityKind — Place fallback', () => {
    it('classifies a landmark as Place', () => {
        expect(classifyActivityKind('mount fuji')).toEqual({
            kind: ACTIVITY_KIND.PLACE,
            label: 'Place',
        });
    });

    it('classifies a proper-noun venue as Place', () => {
        expect(classifyActivityKind('Eiffel Tower').kind).toBe(
            ACTIVITY_KIND.PLACE,
        );
    });

    it('falls back to Place for short non-matching content', () => {
        expect(classifyActivityKind('hi')).toEqual({
            kind: ACTIVITY_KIND.PLACE,
            label: 'Place',
        });
    });
});
