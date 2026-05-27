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
    /** Cleaned-up search query — the place name to look up. Empty
     *  string when the input was a URL we couldn't unwrap (see
     *  `urlExtractionFailed`). */
    query: string;
    /** Start time in 24h `HH:mm` form, when one was found. */
    startTime?: string;
    /** End time in 24h `HH:mm` form. */
    endTime?: string;
    /** Cost as a positive number, currency-agnostic ($/bucks/usd/eur). */
    cost?: number;
    /** Confirmation / booking / reservation code, picked up from
     *  phrases like "confirmation ABC123", "booking #XYZ789", "conf:
     *  AB12CD". Hotels-only in practice but cheap to extract for
     *  every kind. */
    confirmationNumber?: string;
    /** Hotel-specific check-out time (HH:mm) when the user mentions
     *  "check-out" / "checkout" as a separate event from check-in.
     *  Callers can use this to spawn a second HOTEL_CHECKOUT
     *  activity alongside the primary HOTEL_CHECKIN. */
    checkOutTime?: string;
    /** Hotel check-out date (YYYY-MM-DD) when a date keyword like
     *  "tomorrow" sits near the check-out time. */
    checkOutDate?: string;
    /** True when the input was a URL (https://...) but no place name
     *  could be pulled from it — typically because the user pasted a
     *  homepage / search root rather than a specific business page.
     *  The caller should surface a friendly warning instead of
     *  searching for "https://...". */
    urlExtractionFailed?: boolean;
}

/** Returns the place name extracted from a recognized share URL, or
 *  `null` when the input isn't a URL we know how to unwrap. Currently
 *  supports Google Maps and Yelp (incl. Yelp ad-redirect links). */
export const extractPlaceFromUrl = (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) return null;
    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return null;
    }
    return (
        extractFromGoogleMaps(url) ??
        extractFromYelp(url) ??
        null
    );
};

const extractFromGoogleMaps = (url: URL): string | null => {
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

const extractFromYelp = (url: URL): string | null => {
    const host = url.hostname.toLowerCase();
    if (host !== 'www.yelp.com' && host !== 'yelp.com' && !host.endsWith('.yelp.com')) {
        return null;
    }
    // Ad-redirect URLs wrap the real biz URL in a `redirect_url` query
    // param. Unwrap recursively so the user can paste an "Ad" link
    // from a search-results page and still get the business name.
    if (url.pathname === '/adredir') {
        const inner = url.searchParams.get('redirect_url');
        if (inner) {
            try {
                return extractPlaceFromUrl(decodeURIComponent(inner));
            } catch {
                return null;
            }
        }
        return null;
    }
    // Direct biz link: /biz/<slug>. Yelp's slugs are hyphen-joined and
    // end with a numeric disambiguator on duplicate-name listings
    // (e.g. "brooklyn-suya-brooklyn-3"). Strip the trailing `-N`, swap
    // hyphens for spaces — gives a clean search query.
    const bizMatch = url.pathname.match(/\/biz\/([^/]+)/);
    if (bizMatch) {
        const slug = bizMatch[1].replace(/-\d+$/, '');
        return decodePlaceSlug(slug.replace(/-/g, ' '));
    }
    // Less common: /search?find_desc=<name>&find_loc=<city>
    const desc = url.searchParams.get('find_desc');
    if (desc) return decodePlaceSlug(desc);
    return null;
};

/** Backward-compat alias — Google-only callers still work. */
export const extractPlaceFromGoogleMapsUrl = extractPlaceFromUrl;

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

// Hotel check-in / check-out keyword markers. Accepts the three
// common spellings: "check-in", "checkin", "check in" (and same for
// check-out). Used to split a hotel sentence into "check-in side" and
// "check-out side" before extracting per-side times + dates.
const CHECKIN_RE = /\bcheck[\s-]?in\b/i;
const CHECKOUT_RE = /\bcheck[\s-]?out\b/i;

interface HotelTimes {
    checkInTime?: string;
    checkOutTime?: string;
    checkInDate?: string;
    checkOutDate?: string;
    /** Char ranges to strip from the residual text so they don't
     *  bleed into the search query. Includes the keyword + the
     *  time/date tokens we attributed to it. */
    ranges: Array<{ start: number; end: number }>;
}

const extractHotelTimes = (text: string): HotelTimes | null => {
    const checkinMatch = text.match(CHECKIN_RE);
    const checkoutMatch = text.match(CHECKOUT_RE);
    // No hotel keyword → caller falls back to generic time extraction.
    if (!checkinMatch && !checkoutMatch) return null;

    const checkinIdx = checkinMatch?.index ?? -1;
    const checkoutIdx = checkoutMatch?.index ?? -1;
    const checkinEnd = checkinIdx >= 0 ? checkinIdx + checkinMatch![0].length : -1;
    const checkoutEnd = checkoutIdx >= 0 ? checkoutIdx + checkoutMatch![0].length : -1;

    // Split text into "check-in slice" and "check-out slice" based on
    // which keyword each character is closer to. Each slice is then
    // parsed for its own time + date.
    const checkinSlice =
        checkinIdx >= 0
            ? text.slice(
                  checkinEnd,
                  checkoutIdx >= 0 && checkoutIdx > checkinEnd
                      ? checkoutIdx
                      : text.length,
              )
            : '';
    const checkoutSlice =
        checkoutIdx >= 0
            ? text.slice(
                  checkoutEnd,
                  checkinIdx >= 0 && checkinIdx > checkoutEnd
                      ? checkinIdx
                      : text.length,
              )
            : '';

    const out: HotelTimes = { ranges: [] };

    // Helper: find the first time + date in a slice and emit absolute
    // ranges so the caller can strip them.
    const harvest = (
        sliceStartAbs: number,
        slice: string,
    ): { time?: string; date?: string; ranges: { start: number; end: number }[] } => {
        const ranges: { start: number; end: number }[] = [];
        let time: string | undefined;
        let date: string | undefined;
        const singleTime = extractSingleTime(slice);
        if (singleTime) {
            time = singleTime.startTime;
            ranges.push({
                start: sliceStartAbs + singleTime.start,
                end: sliceStartAbs + singleTime.end,
            });
        }
        // Date keyword first (today/tomorrow/yesterday) — strip those
        // from the slice ranges too so they don't end up in the search
        // query. We re-scan the slice manually instead of reusing
        // extractDate because we need the keyword's offset, not just
        // the resolved date.
        const lower = slice.toLowerCase();
        for (const [keyword, resolver] of Object.entries(DATE_KEYWORDS)) {
            const re = new RegExp(`\\b${keyword}\\b`);
            const m = lower.match(re);
            if (m && m.index !== undefined) {
                date = resolver().format('YYYY-MM-DD');
                ranges.push({
                    start: sliceStartAbs + m.index,
                    end: sliceStartAbs + m.index + m[0].length,
                });
                break;
            }
        }
        return { time, date, ranges };
    };

    if (checkinIdx >= 0) {
        const harvested = harvest(checkinEnd, checkinSlice);
        out.checkInTime = harvested.time;
        out.checkInDate = harvested.date;
        out.ranges.push(
            { start: checkinIdx, end: checkinEnd },
            ...harvested.ranges,
        );
    }
    if (checkoutIdx >= 0) {
        const harvested = harvest(checkoutEnd, checkoutSlice);
        out.checkOutTime = harvested.time;
        out.checkOutDate = harvested.date;
        out.ranges.push(
            { start: checkoutIdx, end: checkoutEnd },
            ...harvested.ranges,
        );
    }
    return out;
};

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

// ---------- Confirmation # helpers ----------

interface ConfirmationMatch {
    confirmationNumber: string;
    start: number;
    end: number;
}

// Patterns: "confirmation ABC123" / "confirmation: ABC123" /
// "conf #ABC123" / "booking number 12345" / "reservation id XYZ789" /
// "code ABC-123". The captured token is alphanumeric with optional
// hyphens / slashes (common in booking-system IDs) and 4-20 chars so
// stray short words like "is" don't match.
//
// `\b` after each prefix word is critical: without it the regex
// engine backtracks "confirmation" → "conf" when the rest of the
// regex fails, and ends up capturing "irmation" from the middle of
// the word "confirmation".
const CONFIRMATION_PATTERNS: RegExp[] = [
    /\b(?:confirmation|booking|reservation|conf)\b\s*(?:number|num|#|no\.?|id|code|:)?\s*#?\s*([A-Z0-9][A-Z0-9-/]{3,19})\b/i,
    /\bcode\b\s*[:#]?\s*([A-Z0-9][A-Z0-9-/]{3,19})\b/i,
];

const extractConfirmation = (text: string): ConfirmationMatch | null => {
    for (const re of CONFIRMATION_PATTERNS) {
        const m = text.match(re);
        if (!m || m.index === undefined) continue;
        const value = m[1].toUpperCase();
        // Skip if the candidate is a pure number that's likely a cost
        // we already matched (the cost extractor runs first; this is a
        // belt-and-braces de-dupe).
        if (/^\d+$/.test(value) && value.length < 5) continue;
        return {
            confirmationNumber: value,
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

    // URL paths short-circuit the rest of the sentence parser — a
    // Google Maps / Yelp share link is the whole input. If we can
    // unwrap it, return the extracted name as the query. If the URL
    // is a homepage / generic root with no business in it, flag the
    // failure so the caller can warn the user instead of searching
    // for "https://..." verbatim.
    if (/^https?:\/\//i.test(trimmed)) {
        const fromUrl = extractPlaceFromUrl(trimmed);
        if (fromUrl) {
            return { query: fromUrl };
        }
        return { query: '', urlExtractionFailed: true };
    }

    // Strip the matched ranges out of the text in descending order so
    // earlier offsets stay valid as we splice.
    type Range = { start: number; end: number };
    const ranges: Range[] = [];
    let startTime: string | undefined;
    let endTime: string | undefined;
    let cost: number | undefined;
    let checkOutTime: string | undefined;
    let checkOutDate: string | undefined;

    // Hotel keywords take precedence: when the user explicitly mentions
    // "check-in" and/or "check-out", run the hotel-aware splitter so
    // each side gets its own time + date. Otherwise fall back to the
    // generic time-range / single-time extraction below.
    const hotelTimes = extractHotelTimes(trimmed);
    if (hotelTimes) {
        startTime = hotelTimes.checkInTime;
        checkOutTime = hotelTimes.checkOutTime;
        checkOutDate = hotelTimes.checkOutDate;
        ranges.push(...hotelTimes.ranges);
    } else {
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
    }

    const costMatch = extractCost(trimmed);
    if (costMatch) {
        cost = costMatch.cost;
        ranges.push({ start: costMatch.start, end: costMatch.end });
    }

    const confMatch = extractConfirmation(trimmed);
    let confirmationNumber: string | undefined;
    if (confMatch) {
        confirmationNumber = confMatch.confirmationNumber;
        ranges.push({ start: confMatch.start, end: confMatch.end });
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
        confirmationNumber,
        checkOutTime,
        checkOutDate,
    };
};
