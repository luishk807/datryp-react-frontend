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
 *  phrase so it resolves cleanly against the airports catalog. */
const cleanPlacePhrase = (s: string): string =>
    s
        .replace(/\b(?:flights?|fly|flying|train|bus|coach)\b/gi, '')
        .replace(/\bfrom\b/gi, '')
        .split(
            /\s+(?:on|for|\$|at|june|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr|may|\d)/i,
        )[0]
        .trim();

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

// An explicit stopover / layover / via clause names an INTERMEDIATE waypoint,
// e.g. "with a stopover in Oslo", "stopover at Oslo", "via Oslo", "stop in
// Oslo". It reads in a different order than the main "A to B" route ("A to B
// with stopover in C" means A→C→B), so we pull these out first. The negative
// lookahead stops a bare "stopover then to …" (no place) from grabbing the
// next route keyword as a fake place — that style is left for the run splitter
// below. The place is captured up to the next route keyword / comma / end so a
// multi-word city ("New York") survives whole.
const STOPOVER_CLAUSE =
    /\b(?:via\s+|(?:with\s+(?:a\s+)?)?(?:stop\s?over|layover)\s+(?:in\s+|at\s+|on\s+)?|stop\s+(?:in|at|on)\s+)(?!(?:to|then|via|stop\s?over|layover)\b)([^,.]+?)(?=\s+(?:to|via|then|stop\s?over|layover|->|→)\b|[,.]|$)/gi;

// A run of one or more "to" / "then" / arrow (and leftover stopover/via)
// connectives between two place names. Whitespace-bounded so it can't bleed
// into a place name (the "to" in "Toronto"); the whole run collapses to one
// split point so chained connectives don't leave a stray token behind.
const ROUTE_SEPARATOR_RUN =
    /\s+(?:(?:->|→|stop\s?over|stop\s+in|stop\s+at|layover|then|via|to)\s+)+/gi;

export const parseRouteStops = (text: string | undefined): string[] => {
    const raw = (text ?? '').trim();
    if (!raw) return [];

    // 1. Pull stopover/via waypoints out and strip their clauses.
    const stopovers: string[] = [];
    const mainText = raw.replace(STOPOVER_CLAUSE, (_m, place: string) => {
        const cleaned = cleanPlacePhrase(place);
        if (cleaned) stopovers.push(cleaned);
        return ' ';
    });

    // 2. Parse the remaining "A to B [to C]" forward route.
    const main = mainText
        .split(ROUTE_SEPARATOR_RUN)
        .map(cleanPlacePhrase)
        .filter(Boolean);

    // 3. Splice the stopover(s) in after the origin, before the rest:
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
