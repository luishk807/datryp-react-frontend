/**
 * Pure-heuristic classifier for the Add-Activity wizard's "smart box".
 * Given free text the user typed, guess which activity KIND they mean so
 * the wizard can seed the right per-kind smart-entry pipeline without
 * making them pick a tile first.
 *
 * NO network / LLM — this only reuses the existing local parsers
 * (`parseFlightInfo`, `parseTransitEntry`) plus a few small keyword /
 * brand lists. It deliberately fails soft: anything with real content
 * that doesn't look like a flight / transport / hotel falls through to
 * PLACE, and empty / too-short input returns null (no chip shown).
 *
 * NOTE is never auto-detected — a free-form reminder can't be inferred
 * from the text, so the user picks the Note tile for that.
 *
 * Expected classifications (sanity check):
 *   ""                              → null
 *   "a"                             → null            (too short)
 *   "https://…/hotel-riu-plaza-…"   → Place  (any URL → Place scraper)
 *   "mount fuji"                    → Place
 *   "Eiffel Tower"                  → Place
 *   "UA123 tomorrow"                → Flight
 *   "UA 123"                        → Flight
 *   "flight from New York to Malé"  → Flight   (explicit "flight" word)
 *   "Renfe 3152 Madrid to Barcelona"→ Train
 *   "Dinner at La Pulpería → Casco Antiguo" → Place  (dining word wins)
 *   "FlixBus to Berlin"             → Bus
 *   "uber to JFK"                   → Other  ("Ride")
 *   "Hertz car rental LAX"          → Rental car
 *   "Hilton Times Square"           → Hotel
 *   "check-in 3pm at the Marriott"  → Hotel
 */
import { parseFlightInfo } from './parseFlightInfo';
import { parseTransitEntry } from './parseTransitQuery';
import { ACTIVITY_KIND } from 'constants';
import type { ActivityKind } from 'types';

export interface ActivityKindGuess {
    kind: ActivityKind;
    /** Short human label for the "Detected: <label>" chip. */
    label: string;
}

// A 2-letter (IATA) code + 1–4 digits — the loose "looks like a flight
// code" signal used as the secondary flight cue when the strict parser
// doesn't bind a segment.
const FLIGHT_CODE_RE = /\b[A-Z]{2}\s?\d{1,4}\b/i;

// Explicit air-travel words. The user literally saying "flight" / "fly"
// is an unambiguous intent signal — it must win over the "X to Y"
// station-pair heuristic below, which would otherwise read
// "flight from new york to <airport>" as a TRAIN. Deliberately excludes
// "airport" (a "taxi to the airport" is a ride, not a flight).
const FLIGHT_WORD_RE = /\b(flight|fly|airline|airlines|airways)\b/i;

// "<place> to <place>" station-pair signal. When present alongside a
// bare flight-looking code we treat it as transport, not a flight (e.g.
// "AC train to Boston" shouldn't read as flight "AC").
const STATION_PAIR_RE = /\b\w[\w'.-]*\s+(?:to|->|→)\s+\w[\w'.-]*/i;

// Ride-hail / taxi keywords → OTHER ("Ride").
const RIDE_RE = /\b(uber|lyft|taxi|cab|rideshare|grab)\b/i;
// Intercity bus keywords / brands → BUS.
const BUS_RE = /\b(bus|flixbus|greyhound|megabus|coach)\b/i;
// Car-rental keywords / brands → RENTAL_CAR.
const RENTAL_RE = /\b(rental|hertz|avis|enterprise|sixt|car\s+rental)\b/i;

// Meal / dining / venue words. A bare "A → B" station pair is also how
// people note a venue and its neighborhood ("Dinner at La Pulpería →
// Casco Antiguo"), so when one of these appears we don't let that weak
// pair hijack the entry as a Train.
const DINING_PLACE_RE =
    /\b(dinner|lunch|breakfast|brunch|supper|eat|dine|dining|restaurant|cafe|café|coffee|drinks|bar|pub|brewery|meal|tapas|food)\b/i;

// Lodging keywords + a small list of well-known global hotel brands.
const HOTEL_KEYWORD_RE = /\b(hotel|hostel|inn|resort|motel|check[-\s]?in|check[-\s]?out)\b/i;
const HOTEL_BRAND_RE =
    /\b(hilton|marriott|hyatt|sheraton|ritz|four\s+seasons|holiday\s+inn|best\s+western|airbnb|radisson|westin|intercontinental)\b/i;

/** Best-effort kind guess for the smart box. Returns null when there's
 *  nothing worth showing a chip for (empty / 1-char input). */
export const classifyActivityKind = (
    text: string,
): ActivityKindGuess | null => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return null;

    // A pasted URL always routes to PLACE. The Place smart-entry is the only
    // pipeline wired to the link scraper (/places/extract-link), and a URL's
    // path/slug is full of misleading keywords ("hotel", "flight") that would
    // otherwise mis-route it — e.g. a riu.com hotel URL has "hotel" in the path
    // and would land on the Hotel form, which can't read links. Detecting the
    // URL up front lets the scraper pull the real name/address off the page.
    if (/^https?:\/\//i.test(trimmed)) {
        return { kind: ACTIVITY_KIND.PLACE, label: 'Link' };
    }

    const hasStationPair = STATION_PAIR_RE.test(trimmed);

    // 1. Flight — an explicit air-travel word ("flight" / "fly" / an
    //    airline term), a clear flight code from the strict parser, OR
    //    the loose code regex AND no station-pair signal (which would
    //    otherwise mean transport). The explicit-word check comes FIRST
    //    so "flight from A to B" beats the station-pair train default.
    const flight = parseFlightInfo(trimmed);
    const parsedFlightNumber = flight.segments.some((s) => s.flightNumber);
    if (
        FLIGHT_WORD_RE.test(trimmed) ||
        parsedFlightNumber ||
        (FLIGHT_CODE_RE.test(trimmed) && !hasStationPair)
    ) {
        return { kind: ACTIVITY_KIND.FLIGHT, label: 'Flight' };
    }

    // 2. Transport — the transit parser found an operator / number, OR a
    //    depart+arrival station pair. Sub-kind picked by keyword.
    const transit = parseTransitEntry(trimmed);
    const hasOperatorOrNumber = Boolean(transit?.operator || transit?.number);
    const hasParsedStationPair =
        Boolean(transit?.departStation && transit?.arrivalStation);
    // A bare "A → B" pair (no operator / vehicle number) is a weak signal —
    // "Dinner at La Pulpería → Casco Antiguo" is a meal, not a train ride.
    // When a dining / venue word is present and there's no real vehicle
    // signal, let it fall through to PLACE.
    const placeOverride = DINING_PLACE_RE.test(trimmed) && !hasOperatorOrNumber;
    if ((hasOperatorOrNumber || hasParsedStationPair) && !placeOverride) {
        if (RIDE_RE.test(trimmed)) {
            return { kind: ACTIVITY_KIND.OTHER, label: 'Ride' };
        }
        if (BUS_RE.test(trimmed)) {
            return { kind: ACTIVITY_KIND.BUS, label: 'Bus' };
        }
        if (RENTAL_RE.test(trimmed)) {
            return { kind: ACTIVITY_KIND.RENTAL_CAR, label: 'Rental car' };
        }
        return { kind: ACTIVITY_KIND.TRAIN, label: 'Train' };
    }

    // 3. Hotel — lodging keyword or a known lodging brand.
    if (HOTEL_KEYWORD_RE.test(trimmed) || HOTEL_BRAND_RE.test(trimmed)) {
        return { kind: ACTIVITY_KIND.HOTEL_CHECKIN, label: 'Hotel' };
    }

    // 4. Place — fallback for anything else with real content.
    return { kind: ACTIVITY_KIND.PLACE, label: 'Place' };
};
