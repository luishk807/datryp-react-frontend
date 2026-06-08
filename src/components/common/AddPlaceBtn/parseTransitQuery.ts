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

// ─── Train / bus service number ───────────────────────────────────────
// The service number sits either right after the operator ("Renfe 3152",
// "AVE 3152", "ICE 372", "TGV 6201") or after a keyword ("train 3152",
// "no. 3152", "#3152", "service 3152"). We capture 2–5 digits with an
// optional 1–3 letter prefix and an optional single trailing letter
// (e.g. "ICE372", "3152A"). The caller passes the already-claimed ranges
// (dates / times / costs / seats) so we never mistake those tokens for a
// service number. `operatorEnd` lets us pick up the bare "<digits>" that
// follows the operator name without a keyword.
interface NumberMatch {
    number: string;
    start: number;
    end: number;
}

// Keyword-anchored: "train 3152", "no. 3152", "#3152", "service 3152".
const NUMBER_KEYWORD_RE =
    /\b(?:train|bus|service|no\.?|number|#)\s*#?\s*([A-Za-z]{0,3}\d{2,5}[A-Za-z]?)\b/i;
// Bare token right after the operator: "Renfe 3152", "ICE 372".
const NUMBER_AFTER_OP_RE = /^\s*([A-Za-z]{0,3}\d{2,5}[A-Za-z]?)\b/;

const overlapsClaimed = (
    start: number,
    end: number,
    claimed: Array<{ start: number; end: number }>,
): boolean => claimed.some((r) => start < r.end && end > r.start);

const extractNumber = (
    text: string,
    operatorEnd: number | null,
    claimed: Array<{ start: number; end: number }>,
): NumberMatch | null => {
    // 1. Bare digits immediately after the operator ("Renfe 3152").
    if (operatorEnd != null) {
        const after = text.slice(operatorEnd);
        const m = after.match(NUMBER_AFTER_OP_RE);
        if (m && m.index !== undefined) {
            const start = operatorEnd + m.index + m[0].indexOf(m[1]);
            const end = start + m[1].length;
            if (!overlapsClaimed(start, end, claimed)) {
                return { number: m[1].toUpperCase(), start, end };
            }
        }
    }
    // 2. Keyword-anchored anywhere ("train 3152", "no. 3152", "#3152").
    const km = text.match(NUMBER_KEYWORD_RE);
    if (km && km.index !== undefined) {
        const tokenOffset = km[0].lastIndexOf(km[1]);
        const start = km.index + tokenOffset;
        const end = start + km[1].length;
        if (!overlapsClaimed(start, end, claimed)) {
            return { number: km[1].toUpperCase(), start, end };
        }
    }
    return null;
};

// ─── Seat (train-only) ────────────────────────────────────────────────
// "seat 4A", "seat 12C", "coach B seat 21", "car 7 seat 4A". We prefer a
// seat match over a car-class match when both somehow appear (trains use
// seat; rentals use class). Capture the seat token (1–5 alnum/-).
interface SeatMatch {
    seat: string;
    start: number;
    end: number;
}

const SEAT_RE =
    /\b(?:(?:coach|car|carriage)\s+[0-9A-Za-z]{1,3}\s+)?seat\s+([0-9A-Za-z-]{1,5})\b/i;

const extractSeat = (text: string): SeatMatch | null => {
    const m = text.match(SEAT_RE);
    if (!m || m.index === undefined) return null;
    return {
        seat: m[1].toUpperCase(),
        start: m.index,
        end: m.index + m[0].length,
    };
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

// Month-name dates: "July 8", "Jul 8", "July 8th", "July 8 2026",
// "July 8, 2026", and the reversed "8 July" / "8 July 2026". Months
// accept the short or long spelling (sept too). Day ordinals (st/nd/
// rd/th) are tolerated. Years are optional — a bare "Month Day" with
// no year resolves to the current year, matching the numeric-date
// behavior above.
const MONTH_NAMES =
    'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const MONTH_DAY_RE = new RegExp(
    `\\b(${MONTH_NAMES})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{2,4}))?\\b`,
    'gi',
);
const DAY_MONTH_RE = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})\\.?(?:[,\\s]+(\\d{2,4}))?\\b`,
    'gi',
);

const monthNameToIndex = (raw: string): number => {
    const key = raw.slice(0, 3).toLowerCase();
    const order = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return order.indexOf(key);
};

const extractAllDates = (text: string): DateMatch[] => {
    const out: DateMatch[] = [];
    let m: RegExpExecArray | null;

    const pushIfValid = (
        monthIdx: number,
        day: number,
        rawYear: string | undefined,
        start: number,
        matchLen: number,
    ): void => {
        if (monthIdx < 0) return;
        if (day < 1 || day > 31) return;
        let year = rawYear ? parseInt(rawYear, 10) : moment().year();
        if (year < 100) year += 2000;
        const d = moment({ year, month: monthIdx, day });
        if (!d.isValid()) return;
        // Skip when this span overlaps a date already collected.
        const overlap = out.some((dm) => start < dm.end && start + matchLen > dm.start);
        if (overlap) return;
        out.push({
            iso: d.format('YYYY-MM-DD'),
            start,
            end: start + matchLen,
        });
    };

    const reMonthDay = new RegExp(MONTH_DAY_RE.source, 'gi');
    while ((m = reMonthDay.exec(text)) !== null) {
        pushIfValid(monthNameToIndex(m[1]), parseInt(m[2], 10), m[3], m.index, m[0].length);
    }

    const reDayMonth = new RegExp(DAY_MONTH_RE.source, 'gi');
    while ((m = reDayMonth.exec(text)) !== null) {
        pushIfValid(monthNameToIndex(m[2]), parseInt(m[1], 10), m[3], m.index, m[0].length);
    }

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
        const overlap = out.some(
            (dm) => m!.index < dm.end && m!.index + m![0].length > dm.start,
        );
        if (overlap) continue;
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
    const m = text.match(/\b(?:dropoff|drop\s*off|return|arrival|arrives?|arriving)\b/i);
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

// Per-station scrub: drop leading connector words (from/to/at/on/by/via)
// and trailing connector words (on/at/from/to/and/by/via) so a paired
// station like "from Madrid Atocha" or "Barcelona Sants on" comes out as
// the bare place name.
const LEADING_STATION_CONNECTORS = /^(?:from|to|at|on|by|via)\s+/i;
const TRAILING_STATION_CONNECTORS = /\s+(?:on|at|from|to|and|by|via)$/i;

// Transport-mode descriptors users type around the route ("bullet train
// from Tokyo to Osaka", "Tokyo to Osaka by bus"). The kind is already known
// from the type tile / detectTransportKind, so these words add nothing to
// the station names. We strip them off the leading edge and as a trailing
// "by <mode>" so the station-pair regex sees a clean "Tokyo to Osaka". The
// trailing form is gated on "by " to avoid clipping a real station name that
// happens to end in one of these words.
const MODE_WORDS =
    'bullet\\s+trains?|high[\\s-]?speed\\s+trains?|express\\s+trains?|shinkansen|trains?|metro|subway|tram|coach|buses|bus|ferr(?:y|ies)|boats?|ships?|rental\\s+cars?';
const LEADING_MODE_NOISE = new RegExp(
    `^(?:(?:take|catch|ride|board|the|a|an)\\s+)*(?:${MODE_WORDS})\\b\\s*`,
    'i',
);
const TRAILING_MODE_NOISE = new RegExp(
    `\\s*\\bby\\s+(?:${MODE_WORDS})\\b\\s*$`,
    'i',
);

const cleanStation = (value: string | undefined): string | undefined => {
    if (!value) return value;
    let out = value.trim();
    let progressed = true;
    while (progressed) {
        const before = out;
        out = out.replace(LEADING_STATION_CONNECTORS, '').trim();
        out = out.replace(TRAILING_STATION_CONNECTORS, '').trim();
        progressed = out !== before;
    }
    out = out.replace(/[\s,.;:!?-]+$/, '').trim();
    return out || undefined;
};

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

    // 6. Seat (train) wins over car class (rental) when both appear.
    //    Only fall back to the car-class scan when no seat was found.
    const seatMatch = extractSeat(trimmed);
    if (seatMatch) ranges.push({ start: seatMatch.start, end: seatMatch.end });
    const classMatch = seatMatch ? null : extractCarClass(trimmed);
    if (classMatch) ranges.push({ start: classMatch.start, end: classMatch.end });
    const classOrSeat = seatMatch?.seat ?? classMatch?.classOrSeat;

    // 7. Train / bus service number. Runs AFTER every other extractor so
    //    the already-claimed ranges (dates / times / costs / seats /
    //    class / confirmation) are skipped and never mistaken for a
    //    service number. Sits after the operator ("Renfe 3152") or after
    //    a keyword ("train 3152", "#3152").
    const numberMatch = extractNumber(
        trimmed,
        operatorMatch ? operatorMatch.end : null,
        ranges,
    );
    if (numberMatch) ranges.push({ start: numberMatch.start, end: numberMatch.end });

    // 8. Pickup / dropoff locations (key-phrase anchored).
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
    // Blanked ranges leave orphaned connector / splitter words behind
    // ("...Sants on  at ,  arrives ,  ,") once their dates / times /
    // seats / costs are removed. Drop comma-delimited fragments that are
    // nothing but connector / keyword noise so they don't bleed into the
    // arrival-station capture below. Runs before the leading/trailing
    // connector loop so the station-pair regex sees a clean residual.
    residual = residual
        .split(',')
        .map((frag) => frag.trim())
        .filter((frag) => {
            if (!frag) return false;
            const stripped = frag
                .replace(
                    /\b(?:on|at|from|to|by|via|and|arrives?|arriving|arrival|dropoff|drop\s*off|return|seat)\b/gi,
                    '',
                )
                .replace(/[\s,.;:!?-]+/g, '')
                .trim();
            return stripped.length > 0;
        })
        .join(', ')
        .replace(/\s+/g, ' ')
        .trim();
    let connectorProgressed = true;
    while (connectorProgressed) {
        const before = residual;
        residual = residual.replace(LEADING_MODE_NOISE, '').trim();
        residual = residual.replace(TRAILING_MODE_NOISE, '').trim();
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

    // Scrub leading/trailing connector words that survive station-pairing
    // ("from Madrid Atocha" → "Madrid Atocha", "Barcelona Sants on" →
    // "Barcelona Sants") so each station comes out clean.
    departStation = cleanStation(departStation);
    arrivalStation = cleanStation(arrivalStation);

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

    // Same-day trip shorthand: when the user gave exactly ONE date but
    // both a depart and an arrival time, that single date applies to both
    // legs (a same-day train ride). classifyDateContext only sets one of
    // the two in that case, so backfill the other here. Two-date inputs
    // keep their independent depart/arrival dates.
    let finalDepartDate = departDate;
    let finalArrivalDate = arrivalDate;
    if (allDates.length === 1 && times.departTime && times.arrivalTime) {
        const only = allDates[0].iso;
        finalDepartDate = only;
        finalArrivalDate = only;
    }

    if (
        !operatorMatch &&
        !numberMatch &&
        !confMatch &&
        !classOrSeat &&
        !pickupMatch &&
        !dropoffMatch &&
        !departStation &&
        !arrivalStation &&
        !costMatch &&
        !times.departTime &&
        !times.arrivalTime &&
        !finalDepartDate &&
        !finalArrivalDate &&
        !tripName
    ) {
        return null;
    }

    return {
        operator: operatorMatch?.operator,
        number: numberMatch?.number,
        departStation,
        arrivalStation,
        departTime: times.departTime,
        arrivalTime: times.arrivalTime,
        departDate: finalDepartDate,
        arrivalDate: finalArrivalDate,
        classOrSeat,
        confirmationNumber: confMatch?.confirmationNumber,
        cost: costMatch?.cost,
        tripName,
    };
};
