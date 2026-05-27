/**
 * Natural-language parser for the Place smart-entry textfield. Users
 * can paste a Google Maps share link, type a plain place name, or
 * type a whole sentence like:
 *
 *   "I'd like to go Ankole Grill at 10:00am - 12:00pm, around 50 bucks"
 *     → { query: "Ankole Grill",
 *         startTime: "10:00", endTime: "12:00",
 *         cost: 50 }
 *
 *   "Eiffel Tower 2pm to 4pm"
 *     → { query: "Eiffel Tower", startTime: "14:00", endTime: "16:00" }
 *
 *   "https://www.google.com/maps/place/Eiffel+Tower/..."
 *     → { query: "Eiffel Tower" }
 *
 * The watcher feeds `query` into the existing place-search endpoint;
 * the parent applies `startTime` / `endTime` / `cost` directly to the
 * draft once the search resolves.
 */

export interface ParsedPlaceEntry {
    /** Cleaned-up search query — the place name to look up. */
    query: string;
    /** Start time in 24h `HH:mm` form, when one was found. */
    startTime?: string;
    /** End time in 24h `HH:mm` form. */
    endTime?: string;
    /** Cost as a positive number, currency-agnostic ($/bucks/usd/eur). */
    cost?: number;
}

/** Returns the place name extracted from a Google Maps URL, or `null`
 *  when the input isn't a recognizable Google Maps URL. */
export const extractPlaceFromGoogleMapsUrl = (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) return null;
    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return null;
    }
    const host = url.hostname.toLowerCase();
    const isGoogleMaps =
        host === 'www.google.com' ||
        host === 'google.com' ||
        host === 'maps.google.com' ||
        host.endsWith('.google.com');
    if (!isGoogleMaps) return null;
    const pathMatch = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/);
    if (pathMatch) {
        return decodePlaceSlug(pathMatch[1]);
    }
    const q = url.searchParams.get('q');
    if (q) {
        if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(q.trim())) return null;
        return decodePlaceSlug(q);
    }
    return null;
};

const decodePlaceSlug = (slug: string): string => {
    return decodeURIComponent(slug.replace(/\+/g, ' ')).trim();
};

// ---------- Time helpers ----------

/** Normalize "10:00am", "10am", "10:30 pm" → "HH:mm" (24h). Returns
 *  null if the token isn't a recognizable clock time. */
const parseClockToken = (token: string): string | null => {
    const m = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
    if (!m) return null;
    let hour = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = m[3]?.toLowerCase();
    if (hour < 0 || hour > 24) return null;
    if (minute < 0 || minute > 59) return null;
    if (meridiem) {
        const isPm = meridiem.startsWith('p');
        // 12am → 00, 12pm → 12, 1pm → 13, etc.
        if (hour === 12) hour = isPm ? 12 : 0;
        else if (isPm) hour += 12;
    } else if (hour === 24) {
        hour = 0;
    }
    if (hour > 23) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/** Match a time range — "10:00am - 12:00pm" / "10am to 12pm" / "10-12".
 *  Returns the match info so callers can also know which slice of the
 *  input to strip when computing the place-name query. */
interface TimeRangeMatch {
    startTime: string;
    endTime: string;
    start: number;
    end: number;
}

const TIME_RANGE_RE =
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i;

const extractTimeRange = (text: string): TimeRangeMatch | null => {
    const m = text.match(TIME_RANGE_RE);
    if (!m || m.index === undefined) return null;
    const start = parseClockToken(m[1].trim());
    const end = parseClockToken(m[2].trim());
    if (!start || !end) return null;
    return {
        startTime: start,
        endTime: end,
        start: m.index,
        end: m.index + m[0].length,
    };
};

/** Match a single clock time when no range is present — e.g.
 *  "Eiffel Tower at 2pm". */
interface TimeMatch {
    startTime: string;
    start: number;
    end: number;
}

const SINGLE_TIME_RE =
    /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))\b/i;

const extractSingleTime = (text: string): TimeMatch | null => {
    const m = text.match(SINGLE_TIME_RE);
    if (!m || m.index === undefined) return null;
    const t = parseClockToken(m[1].trim());
    if (!t) return null;
    return { startTime: t, start: m.index, end: m.index + m[0].length };
};

// ---------- Cost helpers ----------

interface CostMatch {
    cost: number;
    start: number;
    end: number;
}

// Three flavours: "$50", "50 bucks/usd/dollars/euros/eur/€", or a
// loose "around 50" / "about 50" when the previous patterns miss.
const COST_PATTERNS: RegExp[] = [
    /\$\s*(\d+(?:\.\d{1,2})?)/i,
    /(\d+(?:\.\d{1,2})?)\s*(?:bucks|dollars?|usd|euros?|eur|€|pounds?|gbp|£)/i,
    /(?:around|about|roughly|~)\s*(\d{1,5}(?:\.\d{1,2})?)\b/i,
];

const extractCost = (text: string): CostMatch | null => {
    for (const re of COST_PATTERNS) {
        const m = text.match(re);
        if (!m || m.index === undefined) continue;
        const value = parseFloat(m[1]);
        if (!Number.isFinite(value) || value <= 0) continue;
        return {
            cost: value,
            start: m.index,
            end: m.index + m[0].length,
        };
    }
    return null;
};

// ---------- Query cleanup ----------

// Connector phrases the user is likely to type around the place name
// ("i'd like to go to X", "let's visit X at ..."). Stripped from the
// start of the residual text before it becomes the search query.
const LEADING_FILLERS = [
    "i'd like to go to",
    "i'd like to go",
    'i would like to go to',
    'i would like to go',
    "let's go to",
    'lets go to',
    "let's visit",
    'lets visit',
    'go to',
    'visit',
    'i want to go to',
    'i want to visit',
];

// Trailing connector words ("at", "for", "around"...) that are likely
// orphaned once the time / cost matches are stripped.
const STRIP_CONNECTORS = /(\s+(?:at|for|around|about|roughly|on)\s*)+$/i;

const cleanQuery = (text: string): string => {
    let out = text.trim();
    // Lowercase comparison for the leading-filler scan, but preserve
    // the original casing for the returned query.
    const lower = out.toLowerCase();
    for (const filler of LEADING_FILLERS) {
        if (lower.startsWith(filler)) {
            out = out.slice(filler.length).trim();
            break;
        }
    }
    out = out.replace(STRIP_CONNECTORS, '').trim();
    // Trim trailing punctuation left over from the original sentence.
    out = out.replace(/[\s,.;:!?-]+$/g, '').trim();
    return out;
};

// ---------- Top-level parser ----------

export const parsePlaceEntry = (
    text: string | undefined,
): ParsedPlaceEntry | null => {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return null;

    // Google Maps URLs short-circuit the whole parse — no times /
    // costs in a URL.
    const fromUrl = extractPlaceFromGoogleMapsUrl(trimmed);
    if (fromUrl) {
        return { query: fromUrl };
    }

    // Strip the matched ranges out of the text in descending order so
    // earlier offsets stay valid as we splice.
    type Range = { start: number; end: number };
    const ranges: Range[] = [];
    let startTime: string | undefined;
    let endTime: string | undefined;
    let cost: number | undefined;

    const range = extractTimeRange(trimmed);
    if (range) {
        startTime = range.startTime;
        endTime = range.endTime;
        ranges.push({ start: range.start, end: range.end });
    } else {
        const single = extractSingleTime(trimmed);
        if (single) {
            startTime = single.startTime;
            ranges.push({ start: single.start, end: single.end });
        }
    }

    const costMatch = extractCost(trimmed);
    if (costMatch) {
        cost = costMatch.cost;
        ranges.push({ start: costMatch.start, end: costMatch.end });
    }

    // Build the residual text — everything outside the matched ranges
    // — which becomes the search query after a connector-word scrub.
    let residual = trimmed;
    if (ranges.length) {
        ranges.sort((a, b) => b.start - a.start);
        for (const r of ranges) {
            residual = residual.slice(0, r.start) + ' ' + residual.slice(r.end);
        }
    }
    const query = cleanQuery(residual);
    if (!query) return null;

    return {
        query,
        startTime,
        endTime,
        cost,
    };
};
