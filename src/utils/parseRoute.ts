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

export const parseRoute = (text: string | undefined): ParsedRoute => {
    const raw = (text ?? '').trim();
    if (!raw) return {};
    const parts = raw.split(/\s+(?:to|->|→)\s+/i);
    if (parts.length < 2) return {};
    const destination = cleanPlacePhrase(parts[parts.length - 1]);
    const origin = cleanPlacePhrase(parts.slice(0, -1).join(' to '));
    return {
        origin: origin || undefined,
        destination: destination || undefined,
    };
};
