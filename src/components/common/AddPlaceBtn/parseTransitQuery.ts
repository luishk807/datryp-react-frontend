/**
 * Natural-language parser for the ground-transport (TRAIN / BUS /
 * RENTAL_CAR) smart-entry textfield. Sibling of `parsePlaceQuery` —
 * reuses its time / cost / confirmation extractors and adds transit-
 * specific patterns: station pair ("Tokyo to Kyoto"), operator
 * ("with Hertz" / known list), car class ("sedan car"), pickup /
 * dropoff locations, and M/D date phrases.
 *
 * Examples:
 *
 *   "Tokyo to Kyoto at 9am-12pm $100"
 *     → { departStation: "Tokyo", arrivalStation: "Kyoto",
 *         departTime: "09:00", arrivalTime: "12:00", cost: 100 }
 *
 *   "have a car reservation for sedan car with Hertz company
 *    pick up location LAX and dropoff location is JFK
 *    confirmation # FL-22 for 40.00
 *    from 5/27/2026 12pm and dropoff 5/27/2026 6pm"
 *     → { operator: "Hertz", classOrSeat: "sedan",
 *         departStation: "LAX", arrivalStation: "JFK",
 *         confirmationNumber: "FL-22", cost: 40,
 *         departDate: "2026-05-27", departTime: "12:00",
 *         arrivalDate: "2026-05-27", arrivalTime: "18:00",
 *         tripName: "Hertz" }
 *
 * The parser is deliberately permissive — when in doubt it leaks
 * unparsed tokens into `tripName` so the user sees something useful
 * in the headline field rather than nothing.
 */

import moment from 'moment';
import {
    extractTimeRange,
    extractSingleTime,
    extractCost,
    extractConfirmation,
} from './parsePlaceQuery';

export interface ParsedTransitEntry {
    /** Operator / rental company (Hertz, Avis, JR, FlixBus, …). */
    operator?: string;
    /** Train / bus / reservation number when present. */
    number?: string;
    /** Origin station / pickup location. */
    departStation?: string;
    /** Destination station / dropoff location. */
    arrivalStation?: string;
    /** Departure / pickup time, 24h `HH:mm`. */
    departTime?: string;
    /** Arrival / dropoff time, 24h `HH:mm`. */
    arrivalTime?: string;
    /** Departure / pickup date, `YYYY-MM-DD`. */
    departDate?: string;
    /** Arrival / dropoff date, `YYYY-MM-DD`. */
    arrivalDate?: string;
    /** Class / car class (sedan, compact, SUV, business, economy, …). */
    classOrSeat?: string;
    /** Confirmation / booking number. */
    confirmationNumber?: string;
    /** Trip cost (currency-agnostic). */
    cost?: number;
    /** Freeform headline. When operator was detected, this is just
     *  the operator name — the caller can wrap it ("Car Reservation
     *  with Hertz", "Train trip with JR") based on `place.kind`. */
    tripName?: string;
}

// ─── Known operators / rental companies ───────────────────────────────
// Ordered by specificity (multi-word entries first so "JR East" beats
// the bare "JR"). The list is intentionally narrow — common global
// brands only. Custom operators users type by name still match via
// the generic "with X" pattern below.
const KNOWN_OPERATORS = [
    'JR East', 'JR West', 'JR Central', 'JR Tokai', 'JR Kyushu',
    'JR Hokkaido', 'JR Shikoku', 'JR',
    'Shinkansen', 'Nozomi', 'Hikari', 'Kodama', 'Sakura', 'Mizuho',
    'FlixBus', 'Greyhound', 'Megabus', 'BoltBus', 'Peter Pan',
    'Amtrak', 'Acela',
    'Eurostar', 'Thalys', 'ICE', 'Trenitalia', 'SNCF', 'Renfe',
    'Italo', 'OBB', 'SBB', 'NS',
    'Hertz', 'Avis', 'Enterprise', 'Budget', 'Sixt', 'National',
    'Alamo', 'Thrifty', 'Dollar', 'Europcar',
];

interface OperatorMatch {
    operator: string;
    start: number;
    end: number;
}

const extractOperator = (text: string): OperatorMatch | null => {
    // 1. Known operator list — high-precision. Match anywhere in the
    //    input (often appears in "with Hertz" / "Hertz company" form).
    for (const op of KNOWN_OPERATORS) {
        const re = new RegExp(`\\b${op.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
        const m = text.match(re);
        if (m && m.index !== undefined) {
            return {
                operator: op,
                start: m.index,
                end: m.index + m[0].length,
            };
        }
    }
    // 2. Generic "with X company" / "with X" — captures an unknown
    //    operator by phrasing. "with X company" wins over bare "with X"
    //    so partial matches like "with Hertz company" don't drop the
    //    company word. Capture group is the operator name only.
    const withCompany = text.match(
        /\bwith\s+([A-Z][A-Za-z0-9'&.-]*(?:\s+[A-Z][A-Za-z0-9'&.-]*)?)\s+(?:company|rentals?|cars?)\b/i,
    );
    if (withCompany && withCompany.index !== undefined) {
        return {
            operator: withCompany[1].trim(),
            start: withCompany.index,
            end: withCompany.index + withCompany[0].length,
        };
    }
    return null;
};

// ─── Car class (rental-only, but cheap to scan for everything) ─────────
const CAR_CLASS_RE =
    /\b(?:for\s+(?:a\s+|an\s+)?)?(sedan|compact|economy|midsize|mid-size|standard|fullsize|full-size|suv|minivan|van|luxury|premium|convertible|coupe|hatchback|wagon|truck|pickup\s+truck)\b(?:\s+car)?/i;

interface ClassMatch {
    classOrSeat: string;
    start: number;
    end: number;
}

const extractCarClass = (text: string): ClassMatch | null => {
    const m = text.match(CAR_CLASS_RE);
    if (!m || m.index === undefined) return null;
    return {
        classOrSeat: m[1].toLowerCase(),
        start: m.index,
        end: m.index + m[0].length,
    };
};

// ─── Pickup / Dropoff locations (key-phrase anchored) ─────────────────
// Both are gated on the explicit "pick up location X" / "dropoff
// location X" phrasing. Without a marker we leave the station-pair
// regex to do its job. Token after the phrase runs until a strong
// boundary word (and / for / from / confirmation / on / at).
const PICKUP_RE =
    /\b(?:pick[\s-]?up|pickup)\s+(?:location\s+(?:is\s+|at\s+)?|at\s+|from\s+|location\s+)?([A-Za-z0-9'&.,\s-]+?)(?=\s+(?:and|drop|confirmation|conf|booking|reservation|for|from|on|at|cost|costs?|\$)|$)/i;
const DROPOFF_RE =
    /\b(?:drop[\s-]?off|dropoff)\s+(?:location\s+(?:is\s+|at\s+)?|at\s+|to\s+|location\s+)?([A-Za-z0-9'&.,\s-]+?)(?=\s+(?:and|pick|confirmation|conf|booking|reservation|for|from|on|at|cost|costs?|\$)|$)/i;

interface LocationMatch {
    value: string;
    start: number;
    end: number;
}

const extractPickup = (text: string): LocationMatch | null => {
    const m = text.match(PICKUP_RE);
    if (!m || m.index === undefined) return null;
    const value = m[1].trim();
    if (!value) return null;
    return { value, start: m.index, end: m.index + m[0].length };
};
const extractDropoff = (text: string): LocationMatch | null => {
    const m = text.match(DROPOFF_RE);
    if (!m || m.index === undefined) return null;
    const value = m[1].trim();
    if (!value) return null;
    return { value, start: m.index, end: m.index + m[0].length };
};

// ─── Dates (M/D[/YYYY], YYYY-MM-DD, "May 27 2026") ────────────────────
// Returns each date match in order so the caller can pair them with
// depart vs arrival context. Two-digit years are interpreted as 20XX.
interface DateMatch {
    iso: string;
    start: number;
    end: number;
}

const NUMERIC_DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
const ISO_DATE_RE = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

const extractAllDates = (text: string): DateMatch[] => {
    const out: DateMatch[] = [];
    let m: RegExpExecArray | null;

    const reNumeric = new RegExp(NUMERIC_DATE_RE.source, 'g');
    while ((m = reNumeric.exec(text)) !== null) {
        const month = parseInt(m[1], 10);
        const day = parseInt(m[2], 10);
        let year = m[3] ? parseInt(m[3], 10) : moment().year();
        if (year < 100) year += 2000;
        if (month < 1 || month > 12) continue;
        if (day < 1 || day > 31) continue;
        const d = moment({ year, month: month - 1, day });
        if (!d.isValid()) continue;
        out.push({
            iso: d.format('YYYY-MM-DD'),
            start: m.index,
            end: m.index + m[0].length,
        });
    }

    const reIso = new RegExp(ISO_DATE_RE.source, 'g');
    while ((m = reIso.exec(text)) !== null) {
        // Skip duplicates that would overlap a numeric match above.
        const overlap = out.some(
            (d) => m!.index < d.end && m!.index + m![0].length > d.start,
        );
        if (overlap) continue;
        out.push({
            iso: `${m[1]}-${m[2]}-${m[3]}`,
            start: m.index,
            end: m.index + m[0].length,
        });
    }
    return out.sort((a, b) => a.start - b.start);
};

// Pair each date with a depart-vs-arrival hint based on a nearby
// keyword. Looks BACKWARD a few words from the date for "from",
// "depart", "pickup", "pick up", "start" → depart; "to", "drop",
// "dropoff", "drop off", "return", "arrival" → arrival. First date
// without a hint defaults to depart, second defaults to arrival.
const classifyDateContext = (
    text: string,
    matches: DateMatch[],
): { departDate?: string; arrivalDate?: string } => {
    let departDate: string | undefined;
    let arrivalDate: string | undefined;
    const dropoffWords = /(to|drop\s*off|dropoff|return|arrival|arrives?|end)\b/i;
    const departWords = /(from|depart|pick\s*up|pickup|start|begins?|leave)\b/i;
    for (const m of matches) {
        // Inspect up to ~30 chars before the date for a contextual hint.
        const lookback = text.slice(Math.max(0, m.start - 30), m.start).toLowerCase();
        if (dropoffWords.test(lookback) && !arrivalDate) {
            arrivalDate = m.iso;
        } else if (departWords.test(lookback) && !departDate) {
            departDate = m.iso;
        } else if (!departDate) {
            departDate = m.iso;
        } else if (!arrivalDate) {
            arrivalDate = m.iso;
        }
    }
    return { departDate, arrivalDate };
};

// ─── Times — split into "depart side" and "dropoff side" ──────────────
// The dropoff side starts after the first "dropoff" / "drop off" /
// "return" keyword in the input; everything before that is the depart
// side. Each side scans for its own single time. If the depart side
// has a range, use that for depart + arrival in one shot (the more
// common shorthand for trips).
interface SidedTimes {
    departTime?: string;
    arrivalTime?: string;
    departTimeRange?: { start: number; end: number };
    arrivalTimeRange?: { start: number; end: number };
}

const splitDepartDropoff = (text: string): { departSide: string; dropoffSide: string; dropoffOffset: number } => {
    const m = text.match(/\b(?:dropoff|drop\s*off|return|arrival)\b/i);
    if (!m || m.index === undefined) {
        return { departSide: text, dropoffSide: '', dropoffOffset: text.length };
    }
    return {
        departSide: text.slice(0, m.index),
        dropoffSide: text.slice(m.index + m[0].length),
        dropoffOffset: m.index + m[0].length,
    };
};

const extractSidedTimes = (text: string): SidedTimes => {
    const out: SidedTimes = {};
    const { departSide, dropoffSide, dropoffOffset } = splitDepartDropoff(text);

    // Try a range on the depart side first ("9am-12pm" → both filled).
    const departRange = extractTimeRange(departSide);
    if (departRange) {
        out.departTime = departRange.startTime;
        out.arrivalTime = departRange.endTime;
        out.departTimeRange = { start: departRange.start, end: departRange.end };
    } else {
        const single = extractSingleTime(departSide);
        if (single) {
            out.departTime = single.startTime;
            out.departTimeRange = { start: single.start, end: single.end };
        }
    }
    // Then a single time on the dropoff side (range less common there).
    if (dropoffSide.trim()) {
        const single = extractSingleTime(dropoffSide);
        if (single) {
            out.arrivalTime = single.startTime;
            out.arrivalTimeRange = {
                start: dropoffOffset + single.start,
                end: dropoffOffset + single.end,
            };
        }
    }
    return out;
};

// ─── Station-pair (fallback when explicit pickup/dropoff missing) ─────
const STATION_PAIR_RE = /^(.+?)\s+(?:to|->|→|–|—|-)\s+(.+?)$/i;

// ─── Connector strip (cleanup after structured fields extracted) ──────
const LEADING_TRANSIT_CONNECTORS =
    /^(?:from\s+|for\s+|at\s+|on\s+|by\s+|via\s+|i\s+(?:have|need|booked|reserved|got)\s+(?:a\s+|an\s+)?(?:car\s+)?reservation\s+(?:for\s+)?|have\s+(?:a\s+|an\s+)?(?:car\s+)?reservation\s+(?:for\s+)?|(?:car\s+)?reservation\s+(?:for\s+)?|i\s+have\s+|i\s+booked\s+|i\s+reserved\s+|book(?:ed|ing)\s+(?:a\s+|an\s+)?(?:car\s+)?(?:for\s+)?)+/i;
const TRAILING_TRANSIT_CONNECTORS =
    /\s+(?:at|for|on|near|to|by|via|from|and|company)\s*$/i;

export const parseTransitEntry = (
    text: string | undefined,
): ParsedTransitEntry | null => {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return null;

    const ranges: Array<{ start: number; end: number }> = [];

    // 1. Times (sided) — depart-side vs dropoff-side single times +
    //    optional range on the depart side.
    const times = extractSidedTimes(trimmed);
    if (times.departTimeRange) ranges.push(times.departTimeRange);
    if (times.arrivalTimeRange) ranges.push(times.arrivalTimeRange);

    // 2. Dates — collect all and classify by surrounding context word.
    const allDates = extractAllDates(trimmed);
    const { departDate, arrivalDate } = classifyDateContext(trimmed, allDates);
    for (const d of allDates) ranges.push({ start: d.start, end: d.end });

    // 3. Cost.
    const costMatch = extractCost(trimmed);
    if (costMatch) ranges.push({ start: costMatch.start, end: costMatch.end });

    // 4. Confirmation number.
    const confMatch = extractConfirmation(trimmed);
    if (confMatch) ranges.push({ start: confMatch.start, end: confMatch.end });

    // 5. Operator (known list or "with X company" phrasing).
    const operatorMatch = extractOperator(trimmed);
    if (operatorMatch) ranges.push({ start: operatorMatch.start, end: operatorMatch.end });

    // 6. Car class.
    const classMatch = extractCarClass(trimmed);
    if (classMatch) ranges.push({ start: classMatch.start, end: classMatch.end });

    // 7. Pickup / dropoff locations (key-phrase anchored).
    const pickupMatch = extractPickup(trimmed);
    if (pickupMatch) ranges.push({ start: pickupMatch.start, end: pickupMatch.end });
    const dropoffMatch = extractDropoff(trimmed);
    if (dropoffMatch) ranges.push({ start: dropoffMatch.start, end: dropoffMatch.end });

    // ─── Build residual for station-pair fallback + trip name ──────────
    let residual = trimmed;
    if (ranges.length) {
        ranges.sort((a, b) => b.start - a.start);
        for (const r of ranges) {
            residual = residual.slice(0, r.start) + ' ' + residual.slice(r.end);
        }
    }
    residual = residual.replace(/\s+/g, ' ').trim();
    let connectorProgressed = true;
    while (connectorProgressed) {
        const before = residual;
        residual = residual.replace(LEADING_TRANSIT_CONNECTORS, '').trim();
        residual = residual.replace(TRAILING_TRANSIT_CONNECTORS, '').trim();
        connectorProgressed = residual !== before;
    }
    residual = residual.replace(/^[\s,.;:!?-]+/, '').trim();
    residual = residual.replace(/[\s,.;:!?]+$/, '').trim();

    // Station-pair fallback only when explicit pickup/dropoff phrases
    // weren't found. "Tokyo to Kyoto" style.
    let departStation = pickupMatch?.value;
    let arrivalStation = dropoffMatch?.value;
    if (!departStation && !arrivalStation) {
        const stationPair = residual.match(STATION_PAIR_RE);
        if (stationPair) {
            departStation = stationPair[1].trim();
            arrivalStation = stationPair[2].trim();
            residual = '';
        }
    }

    // ─── Trip name ────────────────────────────────────────────────────
    // Priority: operator (the most identifying token), then station
    // pair, then leftover residual. The caller wraps the operator in
    // a kind-specific prefix ("Car reservation with Hertz", "Train
    // with JR") so we just return the operator string here.
    let tripName: string | undefined;
    if (operatorMatch) {
        tripName = operatorMatch.operator;
    } else if (departStation && arrivalStation) {
        tripName = `${departStation} → ${arrivalStation}`;
    } else if (residual) {
        tripName = residual;
    }

    if (
        !operatorMatch &&
        !confMatch &&
        !classMatch &&
        !pickupMatch &&
        !dropoffMatch &&
        !departStation &&
        !arrivalStation &&
        !costMatch &&
        !times.departTime &&
        !times.arrivalTime &&
        !departDate &&
        !arrivalDate &&
        !tripName
    ) {
        return null;
    }

    return {
        operator: operatorMatch?.operator,
        departStation,
        arrivalStation,
        departTime: times.departTime,
        arrivalTime: times.arrivalTime,
        departDate,
        arrivalDate,
        classOrSeat: classMatch?.classOrSeat,
        confirmationNumber: confMatch?.confirmationNumber,
        cost: costMatch?.cost,
        tripName,
    };
};
