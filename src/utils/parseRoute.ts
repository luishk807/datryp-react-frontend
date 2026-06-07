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
 * Ordered list of waypoints (stops) in a typed route. A multi-leg flight with
 * a stopover — "london to oslo stopover then to moscow" or "london via oslo to
 * moscow" — yields ["london", "oslo", "moscow"]; a plain "london to newark"
 * yields ["london", "newark"]. Stopover/transfer connectives (stopover, stop
 * in/at, layover, then, via) are folded into the canonical " to " separator so
 * they don't pollute a waypoint or get dropped. Consecutive legs are formed by
 * pairing adjacent stops (london→oslo, oslo→moscow).
 */
// A run of one or more transfer connectives between two place names —
// "to", "stopover", "stop in/at", "layover", "then", "via", arrows — in any
// combination ("stopover then to", "then to", "via"). Each connective is
// whitespace-bounded so it can't bleed into a place name (e.g. the "to" in
// "Toronto"). The whole run collapses to a single split point so chained
// connectives don't leave a stray "to" token behind.
const ROUTE_SEPARATOR_RUN =
    /\s+(?:(?:->|→|stop\s?over|stop\s+in|stop\s+at|layover|then|via|to)\s+)+/gi;

export const parseRouteStops = (text: string | undefined): string[] => {
    const raw = (text ?? '').trim();
    if (!raw) return [];
    return raw
        .split(ROUTE_SEPARATOR_RUN)
        .map(cleanPlacePhrase)
        .filter(Boolean);
};

export const parseRoute = (text: string | undefined): ParsedRoute => {
    const stops = parseRouteStops(text);
    if (stops.length < 2) return {};
    return {
        origin: stops[0] || undefined,
        destination: stops[stops.length - 1] || undefined,
    };
};
