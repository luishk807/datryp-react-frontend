import moment from 'moment';

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
    /** True when the query was extracted from a pasted share URL (Google
     *  Maps / Yelp) rather than typed. Lets the watcher show a Pro upsell
     *  for the street address — that comes from Google Places, which is
     *  Pro-gated — while still filling the name + map pin for free. */
    fromUrl?: boolean;
    /** Place-pin coordinates read straight out of a Google Maps URL — no
     *  Google Places call, so a pasted link geo-pins the activity even
     *  on the free tier. Undefined for typed input or links without
     *  embedded coordinates. */
    latitude?: number;
    longitude?: number;
    /** Best-effort place name pulled from a pasted URL's path slug, set
     *  only when direct extraction failed (an unrecognized URL — a hotel
     *  brand / booking page). The watcher uses it as a fallback search
     *  query when the server-side page scrape also comes up empty (e.g.
     *  a bot-blocked brand site like hilton.com). */
    urlSlugFallback?: string;
}

/** Derive a best-effort place name from a URL's path slug — the fallback
 *  when a pasted page can't be scraped (bot-blocked brand sites). Takes
 *  the last hyphenated path segment, splits on hyphens, drops obvious
 *  property/booking codes (tokens with a digit, or 4+ chars with no
 *  vowel — e.g. "ptyhfhh"), and joins the rest:
 *    /en/hotels/ptyhfhh-hilton-panama/ → "hilton panama"
 *    /hotel/the-plaza-new-york-12345   → "the plaza new york"
 *  Returns '' when nothing word-like remains. */
export const extractNameFromUrlSlug = (text: string): string => {
    const trimmed = text.trim();
    if (!/^https?:\/\//i.test(trimmed)) return '';
    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return '';
    }
    const segments = url.pathname
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
    if (!segments.length) return '';
    // Prefer the last hyphenated, letter-bearing segment (the human slug),
    // skipping a trailing "booking" / numeric-id segment. Fall back to the
    // final segment when none is hyphenated.
    let slug = '';
    for (let i = segments.length - 1; i >= 0; i--) {
        if (/[a-z]/i.test(segments[i]) && segments[i].includes('-')) {
            slug = segments[i];
            break;
        }
    }
    if (!slug) slug = segments[segments.length - 1];
    // Drop a trailing file extension (.html / .htm / .php / .aspx) so it
    // doesn't ride along as a fake name token (".Html").
    slug = slug.replace(/\.(html?|php|aspx?)$/i, '');
    const tokens = slug
        .replace(/_/g, '-')
        .split('-')
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t) => {
            if (/\d/.test(t)) return false;
            if (t.length >= 4 && !/[aeiou]/i.test(t)) return false;
            // Review-site boilerplate that's never part of the venue
            // name ("Restaurant_Review-…-Reviews-…").
            if (/^reviews?$/i.test(t)) return false;
            return true;
        });
    return tokens.join(' ').replace(/\s+/g, ' ').trim();
};

/** Pull the place-pin coordinates out of a Google Maps URL. Prefers the
 *  `!3d<lat>!4d<lng>` data block (the actual pinned place) over the
 *  `@<lat>,<lng>` viewport center, which can sit a few meters off. Returns
 *  null when the text carries no recognizable coordinate pair. */
export const extractGoogleMapsCoords = (
    text: string,
): { latitude: number; longitude: number } | null => {
    const pin = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (pin) {
        return { latitude: parseFloat(pin[1]), longitude: parseFloat(pin[2]) };
    }
    const at = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (at) {
        return { latitude: parseFloat(at[1]), longitude: parseFloat(at[2]) };
    }
    return null;
};

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
        extractFromTripAdvisor(url) ??
        null
    );
};

const extractFromGoogleMaps = (url: URL): string | null => {
    const host = url.hostname.toLowerCase();
    // Only accept Google MAPS hosts/paths. Without this gate, a
    // `www.google.com/travel/search?q=hotel%20in%20tokyo` URL would
    // match (host is google.com, has a `?q=`) and the smart entry
    // would search for "hotel in tokyo" — returning the top-rated
    // hotel in the city instead of warning that the URL isn't a real
    // place link.
    const isMapsHost =
        host === 'maps.google.com' || host === 'maps.googleapis.com';
    // Accept both `/maps` (the bare search page — "Search this area"
    // links emit `/maps?q=…`) and `/maps/...` (place/search subpaths).
    // The travel/search/etc. paths still fail this gate.
    const isMapsPath =
        url.pathname === '/maps' || url.pathname.startsWith('/maps/');
    if (!isMapsHost && !isMapsPath) return null;
    const pathMatch = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/);
    if (pathMatch) {
        return decodePlaceSlug(pathMatch[1]);
    }
    // `?q=` is the older share format — only honor it when we already
    // know this is a maps URL (gate above passed).
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

/** Pull the business name out of a TripAdvisor review URL. Their review
 *  pages follow a fixed shape:
 *
 *    /<Type>_Review-g<geoId>-d<listingId>-Reviews(-or<n>)-<Name>-<Location>.html
 *    /Restaurant_Review-g294480-d27385833-Reviews-Kanibal_Panama-Panama_City_Panama_Province.html
 *      → "Kanibal Panama"
 *
 *  The venue name is the FIRST hyphen-delimited token after the
 *  `-Reviews-` marker (its internal spaces are underscore-encoded); the
 *  location hierarchy follows as further tokens. Localized TLDs
 *  (.es / .fr / .com.br …) all share this path grammar. Destination /
 *  `Tourism-*` pages carry no business name → null (caller warns / falls
 *  back to the slug heuristic). */
const extractFromTripAdvisor = (url: URL): string | null => {
    const host = url.hostname.toLowerCase();
    if (!/(?:^|\.)tripadvisor\./.test(host)) return null;
    const m = url.pathname.match(
        /_Review-g\d+-d\d+-Reviews(?:-or\d+)?-([^-/]+)-/i,
    );
    if (!m) return null;
    return decodePlaceSlug(m[1]).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
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
export interface TimeRangeMatch {
    startTime: string;
    endTime: string;
    start: number;
    end: number;
}

const TIME_RANGE_RE =
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)/i;

export const extractTimeRange = (text: string): TimeRangeMatch | null => {
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
export interface TimeMatch {
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

// Date keywords recognized inside hotel slices ("check-in tonight",
// "check-out tomorrow"). Each entry resolves to a Moment so the
// harvest function can call `.format('YYYY-MM-DD')` on it. Kept narrow
// — full date-phrase parsing happens elsewhere via DATE_PHRASE_RES.
const DATE_KEYWORDS: Record<string, () => moment.Moment> = {
    today: () => moment(),
    tonight: () => moment(),
    tomorrow: () => moment().add(1, 'day'),
    yesterday: () => moment().subtract(1, 'day'),
};

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

export const extractSingleTime = (text: string): TimeMatch | null => {
    const m = text.match(SINGLE_TIME_RE);
    if (!m || m.index === undefined) return null;
    const t = parseClockToken(m[1].trim());
    if (!t) return null;
    return { startTime: t, start: m.index, end: m.index + m[0].length };
};

// ---------- Cost helpers ----------

export interface CostMatch {
    cost: number;
    start: number;
    end: number;
}

// Cost extraction needs to handle these phrasings (real user inputs):
//   "$50"               — leading dollar sign
//   "$50.00"            — leading dollar sign with cents
//   "50 bucks"          — trailing currency word
//   "50 dollars"        — trailing currency word
//   "for 50"            — "for X" cost prefix
//   "for $50.00"        — "for $X" (the $ path matches first, but this also covers it)
//   "for 50.00"         — bare decimal under "for" context
//   "cost 50" / "costs 50" / "costs me 50" — explicit cost word
//   "around 50"         — hedge prefix
// We deliberately don't match bare numbers without ANY context — that would
// scoop up flight numbers, room numbers, phone digits, etc. The "for" and
// "cost" patterns include a negative lookahead so they don't eat time
// tokens ("for 2pm") or durations ("for 2 hours / 3 days / 2 nights").
const COST_PATTERNS: RegExp[] = [
    /[$€£]\s*(\d+(?:\.\d{1,2})?)/i,
    /(\d+(?:\.\d{1,2})?)\s*(?:bucks|dollars?|usd|euros?|eur|€|pounds?|gbp|£)/i,
    /\bfor\s+\$?\s*(\d+(?:\.\d{1,2})?)(?!\s*(?:am|pm|a\.m\.|p\.m\.|hours?|hrs?|mins?|minutes?|days?|weeks?|months?|nights?|people|persons?|guests?|pax))\b/i,
    /\bcosts?\s+(?:me\s+)?\$?\s*(\d+(?:\.\d{1,2})?)\b/i,
    /(?:around|about|roughly|~)\s*\$?\s*(\d{1,5}(?:\.\d{1,2})?)\b/i,
];

export const extractCost = (text: string): CostMatch | null => {
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

export interface ConfirmationMatch {
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

export const extractConfirmation = (text: string): ConfirmationMatch | null => {
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
// ("i'd like to go to X", "i'm going to X", "let's visit X at ...").
// Stripped from the start of the residual text before it becomes the
// search query. Match order matters: list longer phrases first so the
// "i'm going to" match wins over a hypothetical "going to" prefix.
const LEADING_FILLERS = [
    "i'd like to go to",
    "i'd like to go",
    'i would like to go to',
    'i would like to go',
    "i'm going to",
    "im going to",
    'i am going to',
    "i'm planning to go to",
    "i'm planning to visit",
    "let's go to",
    'lets go to',
    "let's visit",
    'lets visit',
    'i want to go to',
    'i want to visit',
    'planning to go to',
    'planning to visit',
    'going to',
    'go to',
    'visit',
];

// Trailing connector words / phrases — orphaned bits left over once
// the time / cost / date matches are stripped. "cost me" / "costs me"
// get pulled here when only the dollar number was matched by the
// cost extractor. `from` covers "<place> from 2pm - 5pm" where the
// time range gets stripped and leaves a dangling "from".
const STRIP_CONNECTORS =
    /(\s+(?:at|for|from|around|about|roughly|on|near|costs?\s+me|costs?|will\s+cost|that\s+(?:will\s+)?costs?)\s*)+$/i;

// Longer connector phrases. The single-word STRIP_CONNECTORS loop
// can't safely strip `a`, `of`, or `with` on their own (they're real
// words inside place names like "Statue of Liberty" or "Walk with
// Lions"), but in specific multi-word chains they're clearly filler.
// Run this BEFORE the single-word loop so a sentence like "bocas del
// toro with a cost of 20 dollars" — where the cost extractor strips
// "20 dollars" but leaves "with a cost of" — comes out as just
// "bocas del toro".
const STRIP_LONG_PHRASES =
    /\s+(?:(?:for|with)\s+a\s+(?:cost|price|budget)\s+(?:of\s*)?|(?:for|with)\s+(?:cost|price|budget)\s+(?:of\s*)?|(?:cost|price|budget)\s+of|that\s+(?:will\s+)?costs?(?:\s+(?:about|around))?)\s*$/i;

// Date phrases anywhere in the text. We don't use these dates for
// places (the day-block already pins the date), but stripping them
// keeps the search query clean — "Mount Fuji on may 27" would
// otherwise reach Google as a noisy multi-token phrase. Patterns
// cover "on may 27", "may 27", "5/27", "5/27/2026", "on 2026-05-27".
const DATE_PHRASE_RES: RegExp[] = [
    // "on" + month-name + day (+ optional year)
    /\b(?:on\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:(?:st|nd|rd|th)?)(?:[,\s]+\d{4})?\b/i,
    // "on" + M/D (+ optional /Y)
    /\b(?:on\s+)?\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
    // ISO YYYY-MM-DD (with optional "on" prefix)
    /\b(?:on\s+)?\d{4}-\d{2}-\d{2}\b/,
    // Keyword-based dates ("on today" / "for tomorrow")
    /\b(?:on|for)\s+(?:today|tomorrow|yesterday|tonight)\b/i,
];

const findDatePhraseRanges = (text: string): Array<{ start: number; end: number }> => {
    const out: Array<{ start: number; end: number }> = [];
    for (const re of DATE_PHRASE_RES) {
        const m = text.match(re);
        if (m && m.index !== undefined) {
            out.push({ start: m.index, end: m.index + m[0].length });
        }
    }
    return out;
};

const cleanQuery = (text: string, isExplicit: boolean): string => {
    let out = text.trim();
    // Drop surrounding quotes (single, double, smart) so a quoted
    // place name reaches the search backend as a clean token.
    out = out.replace(/^["'`‘’“”]+/, '');
    out = out.replace(/["'`‘’“”]+$/, '');
    // Strip all `#` markers — they're a user-facing shorthand that
    // says "treat what follows as the literal place name, skip the
    // natural-language scrubbing." The flag was already captured at
    // the top of parsePlaceEntry; here we just remove the character
    // so it doesn't leak into the search query.
    out = out.replace(/#/g, '').trim();
    // Lowercase comparison for the leading-filler scan, but preserve
    // the original casing for the returned query. Skip the scrub
    // entirely when the user used an explicit `#` marker — they've
    // already told us what the name is, don't second-guess them.
    if (!isExplicit) {
        let progressed = true;
        while (progressed) {
            progressed = false;
            const lower = out.toLowerCase().trim();
            for (const filler of LEADING_FILLERS) {
                if (lower.startsWith(filler + ' ') || lower === filler) {
                    out = out.trim().slice(filler.length).trim();
                    progressed = true;
                    break;
                }
            }
        }
    }
    // First strip the long multi-word noise phrases ("with a cost of",
    // "cost of", "that costs around") — these contain bare words like
    // `a` / `of` that the single-word loop deliberately doesn't strip
    // on their own. Run before the single-word loop so it can then
    // peel off any remaining trailing "from" / "at" / etc.
    let longProgressed = true;
    while (longProgressed) {
        const before = out;
        out = out.replace(STRIP_LONG_PHRASES, '').trim();
        longProgressed = out !== before;
    }
    // Loop STRIP_CONNECTORS until stable. After cost + time get stripped,
    // a sentence like "hiroshima park at 2pm for $50" leaves the residual
    // "hiroshima park at  for" — the regex only catches one trailing
    // connector per pass, so without the loop the leftover "at" leaks
    // into the search query.
    let connectorProgressed = true;
    while (connectorProgressed) {
        const before = out;
        out = out.replace(STRIP_CONNECTORS, '').trim();
        connectorProgressed = out !== before;
    }
    // Mid-sentence quotes around the place name ("'Mount Fuji'") —
    // strip after the leading-filler pass since some fillers contain
    // apostrophes ("let's") that we don't want collapsed.
    out = out.replace(/["'`‘’“”]/g, '');
    // Collapse internal whitespace + trim trailing punctuation.
    out = out.replace(/\s+/g, ' ').trim();
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
    // Leading `#` is the user-facing escape hatch: "I'm telling you
    // exactly what the place name is — don't second-guess me via
    // filler / connector scrubbing." Detected here and forwarded to
    // cleanQuery so the natural-language stripping passes get skipped
    // for the explicit-marker path. The `#` chars themselves are
    // stripped inside cleanQuery so they don't leak into the search.
    const isExplicit = /^\s*#/.test(trimmed);

    if (/^https?:\/\//i.test(trimmed)) {
        const nameFromUrl = extractPlaceFromUrl(trimmed);
        if (nameFromUrl) {
            // Grab the place-pin coordinates from the same URL — free, no
            // Google Places call — so a pasted link geo-pins the activity
            // even on the free tier.
            const coords = extractGoogleMapsCoords(trimmed);
            // A `…/maps?q=hilton+panama` search URL (the form people grab
            // fastest from the address bar) yields a lowercase query —
            // Title-case it so the name reads cleanly even when the
            // recommender can't enrich it. Names that already carry
            // capitals (the `/place/Hilton+Panama` slug form) are left
            // untouched.
            const cleanName =
                nameFromUrl === nameFromUrl.toLowerCase()
                    ? nameFromUrl.replace(/\b\w/g, (c) => c.toUpperCase())
                    : nameFromUrl;
            return {
                query: cleanName,
                fromUrl: true,
                latitude: coords?.latitude,
                longitude: coords?.longitude,
            };
        }
        // Unrecognized URL (hotel brand / booking page). Flag the
        // failure so the watcher tries a server-side page scrape, and
        // carry a slug-derived name as the fallback search query for
        // when that scrape is blocked.
        return {
            query: '',
            urlExtractionFailed: true,
            urlSlugFallback: extractNameFromUrlSlug(trimmed) || undefined,
        };
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

    // Date phrases — "on may 27", "5/27/2026", "tomorrow" — get
    // stripped from the residual so the search query is just the
    // place name. We don't surface a date back to the caller for
    // place activities (the day-block pins the date); this is purely
    // noise removal.
    for (const range of findDatePhraseRanges(trimmed)) {
        ranges.push(range);
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
    const query = cleanQuery(residual, isExplicit);
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
