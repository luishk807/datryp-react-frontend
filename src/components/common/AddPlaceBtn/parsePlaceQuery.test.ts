import { describe, it, expect } from 'vitest';
import moment from 'moment';
import {
    parsePlaceEntry,
    extractNameFromUrlSlug,
    extractGoogleMapsCoords,
    extractPlaceFromUrl,
    extractPlaceFromGoogleMapsUrl,
    extractTimeRange,
    extractSingleTime,
    extractCost,
    extractConfirmation,
} from './parsePlaceQuery';

// Pure-logic parser for the Place smart-entry field. Every assertion below
// pins the function's ACTUAL observed output (verified by running the real
// code), including a couple of deliberate quirks noted inline.

describe('extractNameFromUrlSlug', () => {
    it('returns empty string for non-URL input', () => {
        expect(extractNameFromUrlSlug('just some text')).toBe('');
    });

    it('returns empty string for a URL that fails to parse', () => {
        expect(extractNameFromUrlSlug('https://')).toBe('');
    });

    it('returns empty string when the URL has no path segments', () => {
        expect(extractNameFromUrlSlug('https://example.com')).toBe('');
    });

    it('drops vowel-less property codes (4+ chars, no vowel) from the slug', () => {
        expect(
            extractNameFromUrlSlug(
                'https://www.hilton.com/en/hotels/ptyhfhh-hilton-panama/',
            ),
        ).toBe('hilton panama');
    });

    it('drops numeric id tokens from the slug', () => {
        expect(
            extractNameFromUrlSlug('https://example.com/hotel/the-plaza-new-york-12345'),
        ).toBe('the plaza new york');
    });

    it('keeps short (<4 char) vowel-less tokens like "nyc"', () => {
        expect(extractNameFromUrlSlug('https://example.com/place/nyc-loft')).toBe(
            'nyc loft',
        );
    });

    it('prefers the last hyphenated letter-bearing segment over a trailing plain segment', () => {
        expect(
            extractNameFromUrlSlug('https://example.com/hotel/the-plaza-new-york/booking'),
        ).toBe('the plaza new york');
    });

    it('falls back to the final segment when none is hyphenated', () => {
        expect(extractNameFromUrlSlug('https://example.com/singleword')).toBe(
            'singleword',
        );
    });

    it('strips a trailing file extension before tokenizing', () => {
        expect(
            extractNameFromUrlSlug('https://example.com/hotel/some-place-hotel.html'),
        ).toBe('some place hotel');
    });

    it('drops review-site boilerplate tokens ("reviews")', () => {
        expect(
            extractNameFromUrlSlug('https://example.com/hotel/grand-plaza-reviews'),
        ).toBe('grand plaza');
    });

    it('returns empty string when nothing word-like survives filtering', () => {
        expect(extractNameFromUrlSlug('https://example.com/12345')).toBe('');
    });
});

describe('extractGoogleMapsCoords', () => {
    it('prefers the !3d/!4d pinned-place data block', () => {
        expect(extractGoogleMapsCoords('foo!3d48.8584!4d2.2945bar')).toEqual({
            latitude: 48.8584,
            longitude: 2.2945,
        });
    });

    it('falls back to the @lat,lng viewport center, honoring negatives', () => {
        expect(extractGoogleMapsCoords('@40.7128,-74.0060,17z')).toEqual({
            latitude: 40.7128,
            longitude: -74.006,
        });
    });

    it('returns null when no coordinate pair is present', () => {
        expect(extractGoogleMapsCoords('nothing here')).toBeNull();
    });
});

describe('extractPlaceFromUrl — guards', () => {
    it('returns null for empty input', () => {
        expect(extractPlaceFromUrl('')).toBeNull();
    });

    it('returns null for non-URL text', () => {
        expect(extractPlaceFromUrl('hello world')).toBeNull();
    });

    it('returns null for a URL that fails to parse', () => {
        expect(extractPlaceFromUrl('https://')).toBeNull();
    });

    it('returns null for an unrecognized host (hotel brand page)', () => {
        expect(extractPlaceFromUrl('https://www.hilton.com/en/hotels/foo')).toBeNull();
    });
});

describe('extractPlaceFromUrl — Google Maps', () => {
    it('extracts the name from a /maps/place/ slug', () => {
        expect(
            extractPlaceFromUrl(
                'https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z',
            ),
        ).toBe('Eiffel Tower');
    });

    it('extracts the name from a /maps/search/ slug', () => {
        expect(
            extractPlaceFromUrl(
                'https://www.google.com/maps/search/coffee+shops/@40.7,-74.0,15z',
            ),
        ).toBe('coffee shops');
    });

    it('honors the ?q= share form on a maps host', () => {
        expect(extractPlaceFromUrl('https://maps.google.com/maps?q=hilton+panama')).toBe(
            'hilton panama',
        );
    });

    it('percent-decodes the place slug', () => {
        expect(
            extractPlaceFromUrl('https://www.google.com/maps/place/Caf%C3%A9%20Central/'),
        ).toBe('Café Central');
    });

    it('returns null for a bare coordinate ?q= (not a place name)', () => {
        expect(extractPlaceFromUrl('https://maps.google.com/maps?q=40.7,-74.0')).toBeNull();
    });

    it('rejects a non-maps google path even with a ?q= (the travel/search gate)', () => {
        expect(
            extractPlaceFromUrl('https://www.google.com/travel/search?q=hotel%20in%20tokyo'),
        ).toBeNull();
    });

    it('returns null for a maps path with neither place/search slug nor ?q=', () => {
        expect(extractPlaceFromUrl('https://maps.google.com/maps/dir/a/b')).toBeNull();
    });
});

describe('extractPlaceFromUrl — Yelp', () => {
    it('extracts and de-hyphenates a /biz/ slug, stripping the trailing -N disambiguator', () => {
        expect(extractPlaceFromUrl('https://www.yelp.com/biz/brooklyn-suya-brooklyn-3')).toBe(
            'brooklyn suya brooklyn',
        );
    });

    it('handles a /biz/ slug without a numeric disambiguator', () => {
        expect(extractPlaceFromUrl('https://m.yelp.com/biz/joes-pizza')).toBe('joes pizza');
    });

    it('unwraps an /adredir ad-redirect link recursively', () => {
        expect(
            extractPlaceFromUrl(
                'https://www.yelp.com/adredir?redirect_url=https%3A%2F%2Fwww.yelp.com%2Fbiz%2Ffoo-bar-3',
            ),
        ).toBe('foo bar');
    });

    it('returns null for an /adredir link with no redirect_url', () => {
        expect(extractPlaceFromUrl('https://www.yelp.com/adredir?foo=bar')).toBeNull();
    });

    it('returns null when the inner redirect_url is malformed (decode throws)', () => {
        expect(extractPlaceFromUrl('https://www.yelp.com/adredir?redirect_url=%25')).toBeNull();
    });

    it('reads the search find_desc param', () => {
        expect(
            extractPlaceFromUrl('https://www.yelp.com/search?find_desc=Thai+Food&find_loc=NYC'),
        ).toBe('Thai Food');
    });

    it('returns null for a Yelp host with no biz/adredir/find_desc path', () => {
        expect(extractPlaceFromUrl('https://www.yelp.com/')).toBeNull();
    });
});

describe('extractPlaceFromUrl — TripAdvisor', () => {
    it('pulls the venue name (first token after -Reviews-) and underscores→spaces', () => {
        expect(
            extractPlaceFromUrl(
                'https://www.tripadvisor.com/Restaurant_Review-g294480-d27385833-Reviews-Kanibal_Panama-Panama_City_Panama_Province.html',
            ),
        ).toBe('Kanibal Panama');
    });

    it('handles the -orN review-offset marker on a localized TLD', () => {
        expect(
            extractPlaceFromUrl(
                'https://www.tripadvisor.co.uk/Attraction_Review-g1-d2-Reviews-or10-Big_Ben-London.html',
            ),
        ).toBe('Big Ben');
    });

    it('returns null for a Tourism/destination page with no business name', () => {
        expect(
            extractPlaceFromUrl('https://www.tripadvisor.com/Tourism-g294480-Panama-Vacations.html'),
        ).toBeNull();
    });
});

describe('extractPlaceFromGoogleMapsUrl (backward-compat alias)', () => {
    it('is the same function as extractPlaceFromUrl', () => {
        expect(extractPlaceFromGoogleMapsUrl).toBe(extractPlaceFromUrl);
    });

    it('still unwraps a Google Maps place link', () => {
        expect(
            extractPlaceFromGoogleMapsUrl('https://www.google.com/maps/place/Eiffel+Tower/'),
        ).toBe('Eiffel Tower');
    });
});

describe('extractTimeRange', () => {
    it('parses a 12h am/pm range to 24h', () => {
        expect(extractTimeRange('10:00am - 12:00pm')).toEqual({
            startTime: '10:00',
            endTime: '12:00',
            start: 0,
            end: 17,
        });
    });

    it('parses a "to" separated range', () => {
        expect(extractTimeRange('2pm to 4pm')).toMatchObject({
            startTime: '14:00',
            endTime: '16:00',
        });
    });

    it('parses a bare hour-hour range (no meridiem)', () => {
        expect(extractTimeRange('10-12')).toMatchObject({
            startTime: '10:00',
            endTime: '12:00',
        });
    });

    it('accepts an en-dash separator', () => {
        expect(extractTimeRange('2pm – 4pm')).toMatchObject({
            startTime: '14:00',
            endTime: '16:00',
        });
    });

    it('accepts dotted a.m./p.m. tokens', () => {
        expect(extractTimeRange('10a.m. to 11a.m.')).toMatchObject({
            startTime: '10:00',
            endTime: '11:00',
        });
    });

    it('maps 12am→00:00 and 1am→01:00', () => {
        expect(extractTimeRange('12am to 1am')).toMatchObject({
            startTime: '00:00',
            endTime: '01:00',
        });
    });

    it('maps 12pm→12:00 and 1pm→13:00', () => {
        expect(extractTimeRange('12pm to 1pm')).toMatchObject({
            startTime: '12:00',
            endTime: '13:00',
        });
    });

    it('normalizes a bare 24 to 00:00', () => {
        expect(extractTimeRange('24-1')).toMatchObject({
            startTime: '00:00',
            endTime: '01:00',
        });
    });

    it('returns null when a token is out of clock range', () => {
        expect(extractTimeRange('25 to 30')).toBeNull();
    });

    it('returns null when there is no range at all', () => {
        expect(extractTimeRange('no times here')).toBeNull();
    });
});

describe('extractSingleTime', () => {
    it('finds a single am/pm time and reports its offsets', () => {
        expect(extractSingleTime('Eiffel Tower at 2pm')).toEqual({
            startTime: '14:00',
            start: 16,
            end: 19,
        });
    });

    it('parses an HH:mm pm token', () => {
        expect(extractSingleTime('meeting 10:30 pm sharp')).toMatchObject({
            startTime: '22:30',
        });
    });

    it('requires a meridiem — a bare number is not a time', () => {
        expect(extractSingleTime('meeting at 10')).toBeNull();
    });

    it('returns null when the meridiem pushes the hour past 23 (13pm)', () => {
        expect(extractSingleTime('event 13pm here')).toBeNull();
    });

    it('returns null when the hour itself is out of range (25pm)', () => {
        expect(extractSingleTime('event 25pm here')).toBeNull();
    });

    it('returns null when the minute is out of range (10:75am)', () => {
        expect(extractSingleTime('event 10:75am here')).toBeNull();
    });
});

describe('extractCost', () => {
    it('matches a leading dollar sign with cents', () => {
        expect(extractCost('costs $50.00 total')).toMatchObject({ cost: 50 });
    });

    it('matches a leading euro sign', () => {
        expect(extractCost('€20 entry')).toMatchObject({ cost: 20 });
    });

    it('matches a trailing "bucks" currency word', () => {
        expect(extractCost('around 50 bucks')).toMatchObject({ cost: 50 });
    });

    it('matches a trailing "pounds" currency word', () => {
        expect(extractCost('30 pounds')).toMatchObject({ cost: 30 });
    });

    it('matches a trailing "usd" currency word', () => {
        expect(extractCost('45 usd')).toMatchObject({ cost: 45 });
    });

    it('matches a "for X" cost prefix', () => {
        expect(extractCost('for 50')).toMatchObject({ cost: 50, start: 0 });
    });

    it('does NOT treat "for 2pm" as a cost (time lookahead)', () => {
        expect(extractCost('for 2pm')).toBeNull();
    });

    it('does NOT treat "for 2 nights" as a cost (duration lookahead)', () => {
        expect(extractCost('for 2 nights')).toBeNull();
    });

    it('matches an explicit "costs me X" phrase', () => {
        expect(extractCost('costs me 75')).toMatchObject({ cost: 75 });
    });

    it('matches a "~" hedge prefix', () => {
        expect(extractCost('~100 total')).toMatchObject({ cost: 100 });
    });

    it('matches an "around X" hedge prefix', () => {
        expect(extractCost('around 30')).toMatchObject({ cost: 30 });
    });

    it('rejects a zero / non-positive amount', () => {
        expect(extractCost('$0')).toBeNull();
    });

    it('returns null when there is no cost context', () => {
        expect(extractCost('just a place name')).toBeNull();
    });
});

describe('extractConfirmation', () => {
    it('matches "confirmation ABC123"', () => {
        expect(extractConfirmation('confirmation ABC123')).toMatchObject({
            confirmationNumber: 'ABC123',
        });
    });

    it('matches "booking #XYZ789"', () => {
        expect(extractConfirmation('booking #XYZ789')).toMatchObject({
            confirmationNumber: 'XYZ789',
        });
    });

    it('matches "conf: AB12CD" and uppercases', () => {
        expect(extractConfirmation('conf: ab12cd')).toMatchObject({
            confirmationNumber: 'AB12CD',
        });
    });

    it('matches the standalone "code" prefix with a hyphenated token', () => {
        expect(extractConfirmation('code ABC-123')).toMatchObject({
            confirmationNumber: 'ABC-123',
        });
    });

    it('skips a pure-number candidate shorter than 5 digits', () => {
        expect(extractConfirmation('confirmation 1234')).toBeNull();
    });

    it('keeps a pure-number candidate of 5+ digits', () => {
        expect(extractConfirmation('confirmation 123456')).toMatchObject({
            confirmationNumber: '123456',
        });
    });

    it('returns null when no confirmation keyword is present', () => {
        expect(extractConfirmation('Central Park picnic')).toBeNull();
    });
});

describe('parsePlaceEntry — empty / URL paths', () => {
    it('returns null for undefined', () => {
        expect(parsePlaceEntry(undefined)).toBeNull();
    });

    it('returns null for whitespace-only input', () => {
        expect(parsePlaceEntry('   ')).toBeNull();
    });

    it('extracts name + coordinates from a Google Maps place URL (fromUrl)', () => {
        expect(
            parsePlaceEntry('https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z'),
        ).toEqual({
            query: 'Eiffel Tower',
            fromUrl: true,
            latitude: 48.8584,
            longitude: 2.2945,
        });
    });

    it('title-cases a lowercase ?q= share name and leaves coords undefined', () => {
        expect(parsePlaceEntry('https://maps.google.com/maps?q=hilton+panama')).toEqual({
            query: 'Hilton Panama',
            fromUrl: true,
            latitude: undefined,
            longitude: undefined,
        });
    });

    it('leaves an already-capitalized slug name untouched', () => {
        const r = parsePlaceEntry('https://www.google.com/maps/place/Caf%C3%A9%20Central/');
        expect(r?.query).toBe('Café Central');
        expect(r?.fromUrl).toBe(true);
    });

    it('flags an unrecognized URL and carries a slug fallback name', () => {
        expect(
            parsePlaceEntry('https://www.hilton.com/en/hotels/ptyhfhh-hilton-panama/'),
        ).toEqual({
            query: '',
            urlExtractionFailed: true,
            urlSlugFallback: 'hilton panama',
        });
    });

    it('flags an unrecognized URL with no derivable slug and omits the fallback', () => {
        expect(parsePlaceEntry('https://example.com')).toEqual({
            query: '',
            urlExtractionFailed: true,
            urlSlugFallback: undefined,
        });
    });
});

describe('parsePlaceEntry — sentence parsing', () => {
    it('returns just the place name for plain input', () => {
        expect(parsePlaceEntry('Blue Bottle Coffee')).toEqual({ query: 'Blue Bottle Coffee' });
    });

    it('strips a leading filler chain', () => {
        expect(parsePlaceEntry("i'd like to go to the Museum")?.query).toBe('the Museum');
    });

    it('extracts a time range and cleans the query', () => {
        expect(parsePlaceEntry('Eiffel Tower 2pm to 4pm')).toEqual({
            query: 'Eiffel Tower',
            startTime: '14:00',
            endTime: '16:00',
        });
    });

    it('extracts time range + cost from a full sentence (a trailing "at" orphaned by a comma survives)', () => {
        // The comma between "at" and "around" blocks STRIP_CONNECTORS from
        // peeling the dangling "at" — this pins that real behavior.
        expect(
            parsePlaceEntry("I'd like to go Ankole Grill at 10:00am - 12:00pm, around 50 bucks"),
        ).toEqual({
            query: 'Ankole Grill at',
            startTime: '10:00',
            endTime: '12:00',
            cost: 50,
        });
    });

    it('strips a dangling "from" left by a time range', () => {
        expect(parsePlaceEntry('Central Park from 2pm - 5pm')).toEqual({
            query: 'Central Park',
            startTime: '14:00',
            endTime: '17:00',
        });
    });

    it('strips the long "with a cost of" phrase and the amount', () => {
        expect(parsePlaceEntry('bocas del toro with a cost of 20 dollars')).toEqual({
            query: 'bocas del toro',
            cost: 20,
        });
    });

    it('strips a "that will cost around" long phrase', () => {
        expect(parsePlaceEntry('Sushi Bar that will cost around 40 dollars')).toEqual({
            query: 'Sushi Bar',
            cost: 40,
        });
    });

    it('loops STRIP_CONNECTORS so a mid-sentence "at" plus "for" both go', () => {
        expect(parsePlaceEntry('hiroshima park at 2pm for $50')).toEqual({
            query: 'hiroshima park',
            startTime: '14:00',
            cost: 50,
        });
    });

    it('captures cost + confirmation number together', () => {
        expect(parsePlaceEntry('Grand Hotel reservation id XYZ789 for $200')).toEqual({
            query: 'Grand Hotel',
            cost: 200,
            confirmationNumber: 'XYZ789',
        });
    });

    it('strips surrounding quotes from a quoted place name', () => {
        expect(parsePlaceEntry('"Statue of Liberty"')).toEqual({ query: 'Statue of Liberty' });
    });

    it('strips a "on <month> <day>" date phrase from the query', () => {
        expect(parsePlaceEntry('Mount Fuji on may 27')).toEqual({ query: 'Mount Fuji' });
    });

    it('strips an M/D/Y date phrase', () => {
        expect(parsePlaceEntry('Louvre 5/27/2026')).toEqual({ query: 'Louvre' });
    });

    it('strips an ISO date phrase', () => {
        expect(parsePlaceEntry('Louvre on 2026-05-27')).toEqual({ query: 'Louvre' });
    });

    it('strips a "for tomorrow" keyword date phrase', () => {
        expect(parsePlaceEntry('Beach for tomorrow')).toEqual({ query: 'Beach' });
    });

    it('returns null when nothing but a cost token remains', () => {
        expect(parsePlaceEntry('$50')).toBeNull();
    });
});

describe('parsePlaceEntry — explicit # marker', () => {
    it('skips filler/connector scrubbing for a #-prefixed name (but still extracts time)', () => {
        expect(parsePlaceEntry("#Joe's Diner at 5pm")).toEqual({
            query: 'Joes Diner',
            startTime: '17:00',
        });
    });

    it('does NOT strip leading fillers under the # escape hatch', () => {
        expect(parsePlaceEntry('#going to the store')?.query).toBe('going to the store');
    });
});

describe('parsePlaceEntry — hotel check-in / check-out', () => {
    it('splits both sides: check-in → startTime, check-out → checkOutTime + checkOutDate', () => {
        const r = parsePlaceEntry('Marriott Downtown check-in 3pm check-out 11am tomorrow');
        expect(r).toMatchObject({
            query: 'Marriott Downtown',
            startTime: '15:00',
            checkOutTime: '11:00',
        });
        expect(r?.checkOutDate).toBe(moment().add(1, 'day').format('YYYY-MM-DD'));
    });

    it('handles a check-in-only sentence (date keyword stripped, no checkOut fields)', () => {
        const r = parsePlaceEntry('Hyatt check-in 4pm today');
        expect(r?.query).toBe('Hyatt');
        expect(r?.startTime).toBe('16:00');
        expect(r?.checkOutTime).toBeUndefined();
        expect(r?.checkOutDate).toBeUndefined();
    });

    it('handles a check-out-only sentence', () => {
        expect(parsePlaceEntry('Hyatt checkout 11am')).toMatchObject({
            query: 'Hyatt',
            checkOutTime: '11:00',
        });
    });

    it('handles check-out appearing before check-in in the text', () => {
        expect(parsePlaceEntry('Grand check-out 11am check-in 3pm')).toEqual({
            query: 'Grand',
            startTime: '15:00',
            checkOutTime: '11:00',
        });
    });
});
