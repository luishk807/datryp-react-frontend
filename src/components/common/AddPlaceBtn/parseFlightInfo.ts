/**
 * Natural-language parser for the Flight info field. Users can type
 * casual input like:
 *
 *   - "UA123"                 → { flightNumber: "UA123" }
 *   - "UA 123"                → { flightNumber: "UA123" }
 *   - "UA123 today"           → { flightNumber: "UA123", departDate: "<today>" }
 *   - "my flight is BA245 tomorrow"
 *                             → { flightNumber: "BA245", departDate: "<tomorrow>" }
 *   - "AA1234 on 2026-08-15"  → { flightNumber: "AA1234", departDate: "2026-08-15" }
 *   - "DL900 8/15"            → { flightNumber: "DL900", departDate: "<this-year>-08-15" }
 *   - "JL5 Aug 15 2026"       → { flightNumber: "JL5", departDate: "2026-08-15" }
 *
 * The parser intentionally fails soft: anything it can't recognize is
 * returned as undefined so the lookup hook stays disabled until the
 * user types something resolvable. Used by both
 * `FlightSegmentLookupWatcher` (to query AeroDataBox) and AddPlaceBtn
 * (to cascade `departDate` into the segment state).
 */
import moment from 'moment';

export interface ParsedFlightSegment {
    flightNumber?: string;
    departDate?: string; // YYYY-MM-DD
}

export interface ParsedFlightInfo {
    /** Convenience accessors for single-leg callers — mirror the first
     *  segment's fields. Undefined when no flight number was detected. */
    flightNumber?: string;
    departDate?: string;
    /** All detected legs in order of appearance in the text. Empty when
     *  no flight-number pattern was found. Stopover/transit words like
     *  "stopover", "stop", "then", "->" between legs are absorbed into
     *  the leg boundary — they don't become their own segment. */
    segments: ParsedFlightSegment[];
}

// Airline code + numeric flight identifier (1–4 digits, optional
// trailing letter e.g. "BA245A"). The code is either a 2-char IATA
// designator — which is alphanumeric with at least one letter, so it
// can be letter+letter ("UA"), letter+digit ("B6" JetBlue, "U2"
// easyJet), or digit+letter ("9W", "3K") — or a 3-letter ICAO code
// ("DAL"). Earlier this only allowed all-letter prefixes, so flights
// on carriers with a digit in their code (B6, U2, W6, 6E…) were never
// recognized and never split into their own segment. Word-boundary
// anchors keep the match from bleeding across adjacent tokens; a space
// between the code and number halves is common.
const FLIGHT_NUMBER_RE = /\b([A-Z]\d|\d[A-Z]|[A-Z]{2,3})\s?(\d{1,4}[A-Z]?)\b/i;

// Common natural-language date keywords. Resolves to the user's local
// "today" (matches what the auto-seed already uses for day-block
// dates). Note: deliberately doesn't try to handle "next monday" /
// "this Friday" — too easy to get wrong, and users on a multi-day
// trip planner already pick dates via the picker for non-immediate
// flights.
const DATE_KEYWORDS: Record<string, () => moment.Moment> = {
    today: () => moment().startOf('day'),
    tonight: () => moment().startOf('day'),
    tomorrow: () => moment().add(1, 'day').startOf('day'),
    yesterday: () => moment().subtract(1, 'day').startOf('day'),
};

// Date formats we try in order. moment is strict per format so
// ambiguous strings ("8/15") only match the format that fits.
const DATE_FORMATS = [
    'YYYY-MM-DD',
    'M/D/YYYY',
    'M/D/YY',
    'M/D',
    'MMM D YYYY',
    'MMM D, YYYY',
    'MMM D',
    'MMMM D YYYY',
    'MMMM D, YYYY',
    'MMMM D',
];

const extractFlightNumber = (text: string): string | undefined => {
    const match = text.match(FLIGHT_NUMBER_RE);
    if (!match) return undefined;
    // Collapse the optional space between airline prefix and digit
    // portion and uppercase the whole thing.
    return (match[1] + match[2]).toUpperCase();
};

interface FlightMatch {
    flightNumber: string;
    /** Char index of the match in the original input. */
    start: number;
    /** Char index immediately after the match in the original input. */
    end: number;
}

/** Return ALL flight-number matches in the order they appear. Used by
 *  the multi-leg parser to split a sentence like "UA123 today stopover
 *  BA245" into two legs. */
const extractAllFlightNumbers = (text: string): FlightMatch[] => {
    // Recreate the regex with /g so the matcher walks the whole input.
    const re = new RegExp(FLIGHT_NUMBER_RE.source, 'gi');
    const out: FlightMatch[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        out.push({
            flightNumber: (m[1] + m[2]).toUpperCase(),
            start: m.index,
            end: m.index + m[0].length,
        });
    }
    return out;
};

// A month-name date embedded ANYWHERE in a sentence — "...on june 9 from
// 11pm", "Aug 15, 2026", "December 1st". Captures month, day, optional year so
// it can be parsed out of a longer phrase (the strict whole-string formats
// below only match when the input IS just a date, so they miss embedded ones).
const MONTH_DATE_RE =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i;

// A numeric date embedded in a sentence — "8/15", "8/15/2026".
const NUMERIC_DATE_RE = /\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/;

const extractDate = (text: string): string | undefined => {
    const lower = text.toLowerCase();
    for (const [keyword, resolver] of Object.entries(DATE_KEYWORDS)) {
        // Use a word-boundary check to avoid matching "todays" or
        // "yesterdayish" or other false positives. Simple regex
        // bounds are sufficient — we don't need full NLP here.
        if (new RegExp(`\\b${keyword}\\b`).test(lower)) {
            return resolver().format('YYYY-MM-DD');
        }
    }

    // Embedded month-name date — parse the matched "june 9" / "Aug 15 2026"
    // substring. No year in the text → assume the current year (matches what
    // the rest of the planner does for near-term dates).
    const mName = text.match(MONTH_DATE_RE);
    if (mName) {
        const year = mName[3] ?? String(moment().year());
        const candidate = moment(
            `${mName[1]} ${mName[2]} ${year}`,
            ['MMMM D YYYY', 'MMM D YYYY'],
            false,
        );
        if (candidate.isValid()) return candidate.format('YYYY-MM-DD');
    }

    // Embedded numeric date — "8/15" / "8/15/2026".
    const mNum = text.match(NUMERIC_DATE_RE);
    if (mNum) {
        for (const fmt of ['M/D/YYYY', 'M/D/YY', 'M/D']) {
            const parsedNum = moment(mNum[1], fmt, true);
            if (parsedNum.isValid()) return parsedNum.format('YYYY-MM-DD');
        }
    }
    // Try the formal date formats. Loop in DATE_FORMATS order so the
    // most specific (full ISO) wins before the loose ones.
    for (const fmt of DATE_FORMATS) {
        // moment(text, fmt, true) is strict — only succeeds when the
        // text matches the format exactly. Strip the flight number
        // first so e.g. "UA123 Aug 15" doesn't try to parse "UA123
        // Aug 15" against the whole-string format.
        const stripped = text.replace(FLIGHT_NUMBER_RE, '').trim();
        if (!stripped) continue;
        // Try matching against the stripped chunk first.
        const parsed = moment(stripped, fmt, true);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }
        // Also try a non-strict match against the original text for
        // formats like "Aug 15" embedded in a sentence ("my flight is
        // UA123 on Aug 15"). moment's non-strict mode is greedy so
        // we only fall back to it if the strict-on-stripped attempt
        // didn't catch the substring.
    }
    // Last attempt: find any short ISO-like substring (YYYY-MM-DD).
    const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch) {
        const candidate = moment(isoMatch[1], 'YYYY-MM-DD', true);
        if (candidate.isValid()) return isoMatch[1];
    }
    return undefined;
};

export const parseFlightInfo = (text: string | undefined): ParsedFlightInfo => {
    if (!text || !text.trim()) return { segments: [] };
    const matches = extractAllFlightNumbers(text);
    if (matches.length === 0) {
        // No flight-number pattern at all. Still expose any date we
        // can find so the single-leg caller can cascade a "today" /
        // "tomorrow" reference into the segment's departDate even
        // before the airline code lands.
        const fallbackDate = extractDate(text);
        return {
            flightNumber: undefined,
            departDate: fallbackDate,
            segments: fallbackDate ? [{ departDate: fallbackDate }] : [],
        };
    }
    // Single-leg path: scan the whole text for a date (covers both
    // "UA123 today" and the rarer "today UA123" wording).
    if (matches.length === 1) {
        const segment: ParsedFlightSegment = {
            flightNumber: matches[0].flightNumber,
            departDate: extractDate(text),
        };
        return {
            flightNumber: segment.flightNumber,
            departDate: segment.departDate,
            segments: [segment],
        };
    }
    // Multi-leg: walk each consecutive pair of flight-number matches
    // and pull the date keyword (if any) out of the text BETWEEN them.
    // Words like "stopover" / "then" / "->" between legs are absorbed
    // — they don't become a separate segment. The text from the last
    // match onward is the tail and belongs to the final leg.
    const segments: ParsedFlightSegment[] = matches.map((match, idx) => {
        // The slice that "belongs" to this leg is everything from the
        // END of this match to the START of the next match (or to the
        // end of the string for the last leg). For the FIRST leg we
        // also include the text BEFORE the match so phrases like
        // "tomorrow UA123 stopover BA245" still bind tomorrow to leg
        // 1.
        const sliceStart = idx === 0 ? 0 : match.end;
        const sliceEnd =
            idx === matches.length - 1
                ? text.length
                : matches[idx + 1].start;
        const slice = text.slice(sliceStart, sliceEnd);
        return {
            flightNumber: match.flightNumber,
            departDate: extractDate(slice),
        };
    });
    return {
        flightNumber: segments[0].flightNumber,
        departDate: segments[0].departDate,
        segments,
    };
};
