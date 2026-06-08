/**
 * Pull an origin → destination route out of free transport smart-text, e.g.
 * "flight london to newark" → { origin: "london", destination: "newark" } or
 * "EWR to Panama City June 6" → { origin: "EWR", destination: "Panama City" }.
 *
 * Returns empty sides when the text has no "to" / arrow split (a bare
 * destination like "Panama" isn't a route). Each side is meant to be resolved
 * to an airport code by the catalog lookup (`useDestinationAirport`).
 *
 * Shared by the Add-Destination transport resolver and the Add-Activity flight
 * smart entry so both turn a typed city route into depart/arrival airports.
 */

/** Strip transport verbs / "from" and trailing date-cost noise off a place
 *  phrase, plus surrounding whitespace/punctuation ("argentina." → "argentina"),
 *  so it resolves cleanly against the airports catalog. */
const cleanPlacePhrase = (s: string): string =>
    s
        .replace(/\b(?:flights?|fly|flying|train|bus|coach)\b/gi, '')
        .replace(/\bfrom\b/gi, '')
        .split(
            /\s+(?:on|for|\$|at|june|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr|may|\d)/i,
        )[0]
        .replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');

export interface ParsedRoute {
    origin?: string;
    destination?: string;
}

/**
 * Ordered list of waypoints (stops) in a typed route, handling both writing
 * orders for a stopover:
 *  - route order:  "london to oslo to moscow"  → ["london","oslo","moscow"]
 *  - stopover clause: "london to moscow with a stopover in oslo"
 *                     / "london via oslo to moscow"
 *                                                → ["london","oslo","moscow"]
 * A plain "london to newark" yields ["london","newark"]. Consecutive legs are
 * formed by pairing adjacent stops (london→oslo, oslo→moscow).
 */

// An explicit stopover / layover / via clause names an INTERMEDIATE waypoint
// that reads in a different order than the main "A to B" route ("A to B with
// stopover in C" means A→C→B), so we pull these out first. Handles the many
// ways people phrase it — optional fluff ("with", "with a", "making", "and"),
// the stop word ("stopover", "stop over", "stop", "stops", "layover", or a bare
// "via"), and an optional connector ("in/at/on/via/from/by"):
//   "via C", "with stopover via C", "making stopover via C", "with stop from C",
//   "with stops via C", "stopover C" …  all → C.
// The negative lookahead stops a bare "stopover then to …" (no place) from
// grabbing the next route keyword as a fake place. The place is captured up to
// the next route keyword / comma / end so a multi-word city survives whole.
const STOPOVER_CLAUSE =
    /\b(?:(?:making|with|and|having|a)\s+)*(?:stop\s?over|stops?|layover|via)\s+(?:(?:in|at|on|via|from|by)\s+)?(?!(?:to|then|via|stop|stops|stopover|layover|from|by|with|making|and|having)\b)([^,.]+?)(?=\s+(?:to|via|then|stop|stops|stop\s?over|layover|from|by|with|making|and|having|->|→)\b|[,.]|\s*$)/gi;

// A trailing "from X" used as a stopover ("panama to argentina from colombia").
// Anchored to a preceding "to <dest>" so the route's own origin "from" (at the
// front: "flight from panama …") is never mistaken for a stopover. Only the
// "from X" tail is removed; the "to <dest>" is kept. The negative lookahead
// also excludes a TIME after "from" ("…to argentina from 8pm to 2am") so a
// departure-time phrase isn't read as a phantom waypoint (it produced a
// bogus "Not set" leg).
const TRAILING_FROM =
    /(\bto\s+[^,.]+?)\s+from\s+(?!(?:to|via|stop|the)\b|\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)([^,.]+?)(?=[,.]|\s*$)/i;

// A run of one or more "to" / "then" / arrow (and leftover stop/via)
// connectives between two place names. Whitespace-bounded so it can't bleed
// into a place name (the "to" in "Toronto"); the whole run collapses to one
// split point so chained connectives don't leave a stray token behind.
const ROUTE_SEPARATOR_RUN =
    /\s+(?:(?:->|→|stop\s?over|stops?|stop\s+in|stop\s+at|layover|then|via|to)\s+)+/gi;

// Clock times / departure windows ("8pm", "8:30 pm", "from 8pm to 2am",
// "at 11pm") are not part of a route. Strip them BEFORE route parsing so the
// "to" inside "8pm to 2am" isn't read as a route separator (which leaked a
// phantom "2am" waypoint → a "Not set" leg). A leading from/at/between/around
// and an optional second time (range) are absorbed.
const TIME_PHRASE =
    /\b(?:from|at|between|around)?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b(?:\s*(?:to|-|–|and|until|til|till)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)?/gi;

export const parseRouteStops = (text: string | undefined): string[] => {
    let raw = (text ?? '').replace(TIME_PHRASE, ' ').trim();
    if (!raw) return [];

    const stopovers: string[] = [];
    // 1. Pull keyword stopover clauses (via / stopover / stop / layover …) out.
    raw = raw.replace(STOPOVER_CLAUSE, (_m, place: string) => {
        const cleaned = cleanPlacePhrase(place);
        if (cleaned) stopovers.push(cleaned);
        return ' ';
    });

    // 2. A trailing "from X" is ambiguous: with an origin already before the
    //    "to" it's a STOPOVER ("panama to argentina from colombia"); without
    //    one it's the ORIGIN of a reversed phrasing ("flight to newark from
    //    switzerland" = switzerland → newark). Decide by whether a real place
    //    precedes the first "to".
    const originBeforeTo =
        cleanPlacePhrase(raw.split(/\s+(?:to|->|→)\s+/i)[0]).length > 0;
    let reversedOrigin: string | undefined;
    raw = raw.replace(TRAILING_FROM, (_m, toDest: string, place: string) => {
        const cleaned = cleanPlacePhrase(place);
        if (cleaned) {
            if (originBeforeTo) stopovers.push(cleaned);
            else reversedOrigin = cleaned;
        }
        return toDest;
    });

    // 3. Parse the remaining "A to B [to C]" forward route; a reversed-phrasing
    //    origin leads it.
    let main = raw
        .split(ROUTE_SEPARATOR_RUN)
        .map(cleanPlacePhrase)
        .filter(Boolean);
    if (reversedOrigin) main = [reversedOrigin, ...main];

    // 4. Splice the stopover(s) in after the origin, before the rest:
    //    "A to B with stopover in C" → [A, C, B]; "A to B to C" → [A, B, C].
    if (main.length <= 1) return [...main, ...stopovers];
    return [main[0], ...stopovers, ...main.slice(1)];
};

export const parseRoute = (text: string | undefined): ParsedRoute => {
    const stops = parseRouteStops(text);
    if (stops.length < 2) return {};
    return {
        origin: stops[0] || undefined,
        destination: stops[stops.length - 1] || undefined,
    };
};
