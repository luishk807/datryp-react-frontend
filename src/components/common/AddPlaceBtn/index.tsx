import {
    useState,
    useRef,
    useEffect,
    useMemo,
    type ComponentType,
} from 'react';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import { useTranslation } from 'react-i18next';
import { Alert, CircularProgress, Grid, Snackbar } from '@mui/material';
import { formatDate, isValidDate, now } from 'utils';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import { parseFlightInfo } from './parseFlightInfo';
import { parseTransitEntry } from './parseTransitQuery';
import { pickSmartEntryLocation } from './pickSmartEntryLocation';
import type { FlightLookupResult } from 'api/flightLookupApi';
import type { FlightDepartureOption } from 'api/flightDeparturesApi';
import {
    suggestActivityFields,
    type ActivitySuggestion,
} from 'api/activitySuggestApi';
import FlightDeparturesSearch from './FlightDeparturesSearch';
import type { PlaceSuggestion } from 'components/common/PlaceAutocomplete';
import { type DropdownOption } from 'components/common/FormFields/DropDown';
import classNames from 'classnames';
import {
    ACTION,
    ACTIVITY_KIND,
    ADD_METHOD,
    BUTTON_VARIANT,
    TRIP_BASIC,
} from 'constants';
import {
    useNearestAirport,
    useNearestTrainStation,
} from 'api/hooks/useHomeDeparture';
import { useDestinationAirport } from 'api/hooks/useDestinationAirport';
import { parseRouteStops } from 'utils';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchActivitySuggestions } from 'api/suggestionsPrefetch';
import { useTripState } from 'context/TripContext';
import PlaceForm from './forms/PlaceForm';
import NoteForm from './forms/NoteForm';
import FlightForm from './forms/FlightForm';
import HotelForm from './forms/HotelForm';
import TransitForm from './forms/TransitForm';
import TypeStep from './steps/TypeStep';
import MethodStep from './steps/MethodStep';
import ReviewStep from './steps/ReviewStep';
import WizardNav from './steps/WizardNav';
import type { FormController, FormMode, PlaceDraft } from './types';
import './index.scss';
import type {
    Activity,
    ActivityKind,
    AddEditButtonProps,
    AddMethod,
    FlightInfo,
    Friend,
    TransitInfo,
} from 'types';

/** Lifecycle of a SMART-method entry, used to drive the auto-advance to
 *  the review step and the not-found manual/suggestions fallback:
 *  - `idle`     — the smart textbox is empty (or trivially short).
 *  - `searching`— a debounced parse / lookup / search is still in flight,
 *    or has been kicked off but hasn't produced a usable draft yet.
 *  - `resolved` — the async settled AND the draft now carries the key
 *    field(s) for this kind (place: name + location/coords; flight: a
 *    segment with depart + arrival; transit: stations or operator+number).
 *  - `notfound` — the lookup/search settled with no usable match. */
type SmartStatus = 'idle' | 'searching' | 'resolved' | 'notfound';

/** Which add-methods apply to a given kind. PLACE / HOTEL offer all
 *  three; FLIGHT / TRANSPORT have no recommender strip so they drop
 *  Suggestions; NOTE is custom-only (the wizard auto-skips the chooser
 *  for it). */
const methodsForKind = (kind: ActivityKind): AddMethod[] => {
    if (kind === ACTIVITY_KIND.NOTE) return [ADD_METHOD.CUSTOM];
    // FLIGHT gets the extra "Find my flight" departures-search method —
    // only flights have an airport-departures provider to query. Transit
    // kinds (train / bus / rental) stay on smart + custom.
    if (kind === ACTIVITY_KIND.FLIGHT) {
        return [ADD_METHOD.SMART, ADD_METHOD.SEARCH, ADD_METHOD.CUSTOM];
    }
    if (
        kind === ACTIVITY_KIND.TRAIN ||
        kind === ACTIVITY_KIND.BUS ||
        kind === ACTIVITY_KIND.RENTAL_CAR ||
        kind === ACTIVITY_KIND.OTHER
    ) {
        return [ADD_METHOD.SMART, ADD_METHOD.CUSTOM];
    }
    return [ADD_METHOD.SUGGESTIONS, ADD_METHOD.SMART, ADD_METHOD.CUSTOM];
};

/** Seed a fresh flight segment. When `defaultDate` is provided (the
 *  date of the day block the user opened "+ Add Activity" from), the
 *  depart + arrival dates start there instead of empty — so the date
 *  picker opens on that day's month rather than today. Saves the user
 *  from manually scrolling months back when the trip is far out.
 *
 *  Times default to 00:00 (12:00 AM) so the time picker isn't blank —
 *  users typically tweak the time anyway and an unset time looked
 *  like a "you forgot something" warning. */
const emptySegment = (defaultDate?: string): FlightInfo => ({
    departTime: '00:00',
    arrivalTime: '00:00',
    ...(defaultDate
        ? { departDate: defaultDate, arrivalDate: defaultDate }
        : {}),
});

/** Derive a non-empty headline for a NOTE activity. Prefers the
 *  user-typed name; else the FIRST non-empty line of the note text
 *  (trimmed, capped ~80 chars so a long paragraph doesn't blow out the
 *  card); else a plain "Note" so the timeline never shows a blank
 *  title. A note that's only whitespace / blank leading lines previously
 *  produced an empty name — this guarantees a fallback. */
const deriveNoteName = (
    name?: string,
    note?: string,
    fallback = 'Note',
): string => {
    const typed = name?.trim();
    if (typed) return typed;
    const firstLine = (note ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0);
    return firstLine ? firstLine.slice(0, 80) : fallback;
};

const emptyTransitSegment = (defaultDate?: string): TransitInfo => ({
    departTime: '00:00',
    arrivalTime: '00:00',
    ...(defaultDate
        ? { departDate: defaultDate, arrivalDate: defaultDate }
        : {}),
});

export interface AddPlaceBtnProps extends AddEditButtonProps<PlaceDraft, Activity> {
    tripTypeId?: number;
    /** Country scope for the AI autocomplete — keeps a Spain trip from
     *  suggesting the Eiffel Tower. Omit for a global search. */
    countryScope?: string;
    /** Optional city scope. When provided, the AI suggestion strip
     *  asks for top things in that city rather than the whole
     *  country, so a Boston trip stops surfacing the Statue of
     *  Liberty / Disney World / Golden Gate. */
    cityScope?: string;
    /** When set, the modal trigger renders as an icon-only button with
     *  this icon (no text label). Use for inline edit affordances next to
     *  an activity title. Falls back to the text/standard button when omitted. */
    triggerIcon?: ComponentType<{ fontSize?: 'inherit' | 'small' | 'medium' | 'large' }>;
    /** Optional class for the modal trigger — used by inline edit pencils
     *  that want compact MUI IconButton-style padding. */
    triggerClassName?: string;
    /** Date of the day block the user opened "+ Add Activity" from.
     *  When provided, fresh flight/ground segments default their
     *  depart/arrival dates to this date so the picker opens on the
     *  right month — saves the user from scrolling from today when
     *  the trip is months out. Accepts either MM/DD/YYYY (the
     *  display format used by DateBlock) or YYYY-MM-DD. */
    defaultDate?: string;
}

const AddPlaceBtn = ({
    onChange,
    type = ACTION.ADD,
    data = null,
    tripTypeId,
    countryScope,
    cityScope,
    triggerIcon,
    triggerClassName,
    buttonType = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
    defaultDate,
}: AddPlaceBtnProps) => {
    const { t } = useTranslation();
    const modelRef = useRef<ModalButtonHandle>(null);
    const queryClient = useQueryClient();

    // Normalize the day-block date (which may arrive as MM/DD/YYYY from
    // DateBlock's formatted string) into the YYYY-MM-DD shape the date
    // pickers expect. Invalid / missing → undefined so `emptySegment`
    // falls back to its no-default branch.
    const isoDefaultDate: string | undefined = (() => {
        if (!defaultDate) return undefined;
        return isValidDate(defaultDate) ? formatDate(defaultDate) : undefined;
    })();

    const isAdd = type === ACTION.ADD;

    // Preserve an existing place's status on edit; leave undefined on add so
    // the activity card defaults to the "Planning" badge. The toggle on the
    // card flips to a real UUID-bearing status once the user clicks it.
    const existingStatus: DropdownOption | undefined =
        data && typeof data.status === 'object' && data.status
            ? (data.status as DropdownOption)
            : undefined;

    // Treat a missing `kind` as 'place' so activities created before the
    // kind toggle shipped continue to render with the place form on
    // edit.
    const existingKind: ActivityKind =
        (data?.kind as ActivityKind | undefined) ?? ACTIVITY_KIND.PLACE;

    const buildInitialPlace = (): PlaceDraft => ({
        kind: isAdd ? ACTIVITY_KIND.PLACE : existingKind,
        startTime: now('HH:mm'),
        endTime: now('HH:mm'),
        status: existingStatus,
    });

    const [place, setPlace] = useState<PlaceDraft>(buildInitialPlace);
    const [formKey, setFormKey] = useState(0);
    const [error, setError] = useState<string | null>(null);
    // Flight-segment detail collapse — by default only the flight
    // number is visible per segment; airport / date / time are hidden
    // behind a "Show details" toggle to keep the form simple. The
    // AeroDataBox lookup populates those fields silently. A segment
    // auto-expands once it has any user-meaningful airport data, so
    // edit-mode + post-lookup populations reveal what got filled.
    const [expandedSegments, setExpandedSegments] = useState<Set<number>>(
        () => new Set()
    );
    const [lookupLoading, setLookupLoading] = useState<Set<number>>(
        () => new Set()
    );
    // Per-segment "couldn't find this flight" message, keyed by
    // segment index. Populated by FlightSegmentLookupWatcher's
    // onNotFound when the API returns null for a typed number; cleared
    // when a fresh lookup succeeds or the user re-edits the number.
    const [lookupNotFound, setLookupNotFound] = useState<Record<number, string>>({});
    // Per-transit-segment lookup state — parallels the flight maps
    // above but keyed by the transit segment index. The transit
    // watcher hits OpenAI to resolve "<operator> <number>" into
    // station + time data the same way the flight watcher hits
    // AeroDataBox. Loading + not-found surface the same friendly
    // hints under the operator/number fields.
    const [transitLookupLoading, setTransitLookupLoading] = useState<Set<number>>(
        () => new Set()
    );
    const [transitLookupNotFound, setTransitLookupNotFound] = useState<Record<number, string>>({});
    // Whole-segment collapse — independent of the airport/date/time
    // details panel. Closed by default so the form stays compact;
    // segments auto-open when they pick up a flight number from the
    // smart-entry parser above, or when the user clicks the header.
    const [openSegments, setOpenSegments] = useState<Set<number>>(
        () => new Set()
    );
    // "Smart entry" textfield: a natural-language input above the
    // segments list ("UA123 tomorrow, stopover BA245") that the user
    // can use INSTEAD of filling each segment manually. The parser
    // creates / populates the segment rows; per-segment fields stay
    // plain so the smart layer is opt-in.
    const [smartEntry, setSmartEntry] = useState('');
    // Same idea for the PLACE kind: a smart-entry textfield above the
    // Activity name field that accepts either a plain place name
    // ("Eiffel Tower") OR a Google Maps share link. The watcher
    // searches and applies the top result via `handlePlacePicked`.
    const [placeSmartEntry, setPlaceSmartEntry] = useState('');
    const [placeSmartLoading, setPlaceSmartLoading] = useState(false);
    // Country-mismatch warning when the smart entry resolves to a
    // place outside the trip's destination country. Surfaced inline
    // in the smart-entry hint area; auto-populate is skipped in this
    // case so a mistakenly pasted out-of-country link doesn't clobber
    // the form.
    const [placeSmartWarning, setPlaceSmartWarning] = useState<string | null>(null);
    // True while the PLACE `suggest-fields` AI call (location / cost /
    // time + corrected name) is in flight. Folded into the smart status
    // so the flow stays "searching" until BOTH the Google place search
    // AND this call settle — without it the not-found fallback / review
    // could flash before the suggestion lands. PLACE kind only.
    const [placeSuggestLoading, setPlaceSuggestLoading] = useState(false);
    // Whole-block collapse for the PLACE form's location → cost →
    // time → note → image rows. Closed by default so the form stays
    // compact for the common case (smart entry filled everything);
    // user can expand to verify / tweak.
    const [placeDetailsExpanded, setPlaceDetailsExpanded] = useState(false);
    // Parallel state for the HOTEL form. Same smart-entry + collapse
    // pattern: a natural-language input above the hotel-name field,
    // and the address → notes rows hidden behind a Show details
    // toggle.
    const [hotelSmartEntry, setHotelSmartEntry] = useState('');
    const [hotelSmartLoading, setHotelSmartLoading] = useState(false);
    const [hotelSmartWarning, setHotelSmartWarning] = useState<string | null>(null);
    const [hotelDetailsExpanded, setHotelDetailsExpanded] = useState(false);
    // Parallel state for the GROUND TRANSPORT form (train / bus /
    // rental car). Same smart-entry + collapse pattern: a natural-
    // language input below the trip-name field auto-fills depart /
    // arrival station + time + cost on the first segment, with the
    // detailed per-segment fields hidden behind a Show details toggle.
    const [transitSmartEntry, setTransitSmartEntry] = useState('');
    const [transitDetailsExpanded, setTransitDetailsExpanded] = useState(false);
    const [transitSmartWarning, setTransitSmartWarning] = useState<string | null>(null);
    // City of the most-recently picked arrival airport — drives the
    // optional auto-fetch of a hero image for the flight activity.
    // Resets when the modal closes or the kind toggles away from
    // FLIGHT.
    const [arrivalCity, setArrivalCity] = useState<string | null>(null);

    // ADD-only wizard navigation. Step 1 = pick type, Step 2 = pick
    // method + fill its input, Step 3 = read-only review. `method` is
    // null until the user picks one (or it's preselected for a kind with
    // a single method, e.g. Note → custom). EDIT mode ignores both and
    // renders the full single-screen form.
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [method, setMethod] = useState<AddMethod | null>(null);
    // Step 3 edit sub-mode: when the user clicks Edit on the review, swap
    // the read-only summary for the full editable form (forced into its
    // CUSTOM presentation so every field shows regardless of how the draft
    // was created). Save validates + returns to the review; Cancel returns
    // without re-validating. The forms mutate `place` live, so the review
    // re-renders from the updated draft with no extra copy.
    const [reviewEditing, setReviewEditing] = useState(false);
    // Fired-once guard for the SMART-method auto-advance. Holds the
    // smart-entry text that last triggered a jump to the review step, so
    // (a) we never re-advance while sitting on Step 2 for the same input,
    // (b) returning to Step 2 via Back doesn't bounce the user forward
    // again, yet (c) editing the smart text into something new produces a
    // fresh key and auto-advances again. Cleared when the smart field is
    // emptied (see the reset effect below).
    const autoAdvancedKeyRef = useRef<string | null>(null);
    // Fired-once guard for the AI field-suggestion fire (cost / time /
    // location auto-fill after a smart entry resolves). Holds the
    // resolved identity (place name+location, hotel name+location, or
    // transit from→to) that last triggered a suggest call so we don't
    // re-fire while sitting on the same resolution. Reset when the
    // active smart field is cleared (see the reset effect below) so a
    // brand-new entry can suggest again — mirrors autoAdvancedKeyRef.
    const suggestAppliedKeyRef = useRef<string | null>(null);

    // Home-base auto-seed: when the user toggles to FLIGHT (or a transit
    // kind) on the very FIRST flight/transit activity of the trip, drop
    // the IATA / station code from their home city into segment 0's
    // depart slot. Skips on EDIT (we trust whatever the user saved) and
    // on the second-onwards flight (by then they're planning an
    // internal-to-trip leg, not the home-to-destination one).
    const tripState = useTripState();
    // Lock the transport date pickers to the trip's date range so a flight /
    // transit leg can't be dated outside it (the bug where a flight set to
    // depart the day before the trip orphaned its day-block). Undefined when
    // the trip dates aren't in context — degrades to no constraint. The user
    // widens the range by editing the trip dates.
    const tripMinDate = tripState.startDate || undefined;
    const tripMaxDate = tripState.endDate || undefined;
    const { data: nearestAirport } = useNearestAirport();
    const { data: nearestStation } = useNearestTrainStation();
    // Smart-entry search bias: pick the tightest known location for
    // "near where the user actually is on this day". Walks the trip's
    // itinerary in priority order — current-day activity address →
    // current-day hotel → prior-day hotel → most recent flight
    // arrival → trip country. Used to scope the place + hotel
    // smart-entry searches so a Google Maps / Yelp link resolves
    // against the user's actual context, not the whole country.
    const smartEntryLocation = useMemo(
        () =>
            pickSmartEntryLocation({
                destinations: tripState.destinations ?? [],
                currentDate: defaultDate,
                fallbackCountry: countryScope,
            }),
        [tripState.destinations, defaultDate, countryScope],
    );
    const isFirstFlightActivity = isAdd && !tripState.destinations.some((d) =>
        d.itinerary?.some((day) =>
            day.activities.some((a) => a.kind === ACTIVITY_KIND.FLIGHT)
        )
    );
    // Trip destination airport for the flight-search "To" default — the
    // first flight arrival in the trip that ISN'T the user's home airport
    // (i.e. the outbound's landing point = where the trip actually is).
    // Falls back to undefined when the trip has no flights yet, in which
    // case the user types the destination in.
    const tripDestinationAirport = useMemo<string | undefined>(() => {
        const home = nearestAirport?.iataCode?.trim().toUpperCase();
        for (const dest of tripState.destinations ?? []) {
            for (const day of dest.itinerary ?? []) {
                for (const a of day.activities ?? []) {
                    if (a.kind !== ACTIVITY_KIND.FLIGHT) continue;
                    for (const seg of a.flightSegments ?? []) {
                        const arr = seg.arrivalAirport?.trim().toUpperCase();
                        if (arr && arr !== home) return arr;
                    }
                }
            }
        }
        return undefined;
    }, [tripState.destinations, nearestAirport?.iataCode]);

    // Fallback when the trip has no flight to read a destination airport
    // from: resolve the trip's country/city to its primary airport via
    // the static airport catalog. Only fires when the flight-derived
    // lookup above came up empty, so coherent itineraries don't pay for
    // an extra request.
    const { data: resolvedDestinationAirport } = useDestinationAirport(
        countryScope,
        !tripDestinationAirport,
    );
    const defaultArrivalAirport =
        tripDestinationAirport ?? resolvedDestinationAirport ?? '';

    // City-route resolution for a flight typed as a route with no flight
    // number to look up: parse the ordered waypoints and resolve each to an
    // airport code via the catalog (london → LHR, oslo → OSL, moscow → SVO),
    // then build one segment per leg. A stopover ("london to oslo stopover
    // then to moscow") becomes two legs (LHR→OSL, OSL→SVO). Skipped when a
    // flight number is present — the lookup owns the airports then. Mirrors
    // Add Destination's resolver, extended for multi-leg.
    //
    // Waypoints resolve through fixed hook slots (rules of hooks forbid a
    // loop): up to 4 stops → up to 3 legs, which covers realistic stopover
    // itineraries. Extra stops beyond the 4th are ignored.
    const firstFlightNumber =
        place.flightSegments?.[0]?.flightNumber?.trim() ?? '';
    const flightStops = useMemo(
        () =>
            place.kind === ACTIVITY_KIND.FLIGHT && !firstFlightNumber
                ? parseRouteStops(smartEntry).slice(0, 4)
                : [],
        [place.kind, firstFlightNumber, smartEntry],
    );
    const { data: routeCode0 } = useDestinationAirport(
        flightStops[0],
        Boolean(flightStops[0]),
    );
    const { data: routeCode1 } = useDestinationAirport(
        flightStops[1],
        Boolean(flightStops[1]),
    );
    const { data: routeCode2 } = useDestinationAirport(
        flightStops[2],
        Boolean(flightStops[2]),
    );
    const { data: routeCode3 } = useDestinationAirport(
        flightStops[3],
        Boolean(flightStops[3]),
    );
    const routeAirportsAppliedRef = useRef('');
    useEffect(() => {
        if (place.kind !== ACTIVITY_KIND.FLIGHT) return;
        // Codes for the stops actually present, in order.
        const codes = [routeCode0, routeCode1, routeCode2, routeCode3].slice(
            0,
            flightStops.length,
        );
        // A single typed city ("flight to tokyo") can't form a leg — mirror the
        // old single-endpoint behavior and drop it on the arrival side so the
        // "To" field still pre-fills.
        if (flightStops.length === 1) {
            const only = codes[0];
            if (!only) return;
            const soloKey = `arr:${only}`;
            if (routeAirportsAppliedRef.current === soloKey) return;
            routeAirportsAppliedRef.current = soloKey;
            setPlace((prev) => {
                if (prev.kind !== ACTIVITY_KIND.FLIGHT) return prev;
                if (prev.flightSegments?.[0]?.flightNumber?.trim()) return prev;
                const segs = prev.flightSegments?.length
                    ? [...prev.flightSegments]
                    : [emptySegment(isoDefaultDate)];
                segs[0] = { ...segs[0], arrivalAirport: only };
                return { ...prev, flightSegments: segs };
            });
            return;
        }
        // Need at least two resolved endpoints to form a leg.
        if (codes.filter(Boolean).length < 2) return;
        const key = codes.map((c) => c ?? '').join('|');
        if (routeAirportsAppliedRef.current === key) return;
        routeAirportsAppliedRef.current = key;
        setPlace((prev) => {
            if (prev.kind !== ACTIVITY_KIND.FLIGHT) return prev;
            // A flight number means the lookup fills the airports — don't fight.
            if (prev.flightSegments?.[0]?.flightNumber?.trim()) return prev;
            const legCount = Math.max(1, codes.length - 1);
            const existing = prev.flightSegments ?? [];
            const legs = Array.from({ length: legCount }, (_, i) => {
                const base = existing[i] ?? emptySegment(isoDefaultDate);
                const depart = codes[i];
                const arrive = codes[i + 1];
                return {
                    ...base,
                    ...(depart ? { departAirport: depart } : {}),
                    ...(arrive ? { arrivalAirport: arrive } : {}),
                };
            });
            // Keep any user-added segments beyond the legs we resolved.
            return {
                ...prev,
                flightSegments: [...legs, ...existing.slice(legCount)],
            };
        });
        // setPlace / emptySegment / isoDefaultDate are stable; fire on codes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeCode0, routeCode1, routeCode2, routeCode3, place.kind]);
    const isFirstTransitActivity = isAdd && !tripState.destinations.some((d) =>
        d.itinerary?.some((day) =>
            day.activities.some(
                (a) =>
                    a.kind === ACTIVITY_KIND.TRAIN ||
                    a.kind === ACTIVITY_KIND.BUS
            )
        )
    );

    useEffect(() => {
        if (place.kind !== ACTIVITY_KIND.FLIGHT) return;
        if (!isFirstFlightActivity || !nearestAirport) return;
        setPlace((prev) => {
            const segments = prev.flightSegments ?? [];
            if (!segments.length) return prev;
            if (segments[0].departAirport) return prev;
            const next = [...segments];
            next[0] = {
                ...next[0],
                departAirport: nearestAirport.iataCode,
            };
            return { ...prev, flightSegments: next };
        });
    }, [place.kind, isFirstFlightActivity, nearestAirport]);

    useEffect(() => {
        // Transit kinds (train + bus). RENTAL_CAR intentionally
        // excluded — pickup location is usually at the destination
        // airport, not the user's home, so seeding from home would be
        // wrong more often than right.
        const isTransitKind =
            place.kind === ACTIVITY_KIND.TRAIN ||
            place.kind === ACTIVITY_KIND.BUS;
        if (!isTransitKind) return;
        if (!isFirstTransitActivity || !nearestStation) return;
        setPlace((prev) => {
            const segments = prev.transitSegments ?? [];
            if (!segments.length) return prev;
            if (segments[0].departStation) return prev;
            const next = [...segments];
            next[0] = {
                ...next[0],
                // Prefer the proper station name over the bare code —
                // depart-station is a free-text field, not a code
                // catalog, so the human-readable label persists better.
                departStation: nearestStation.name,
            };
            return { ...prev, transitSegments: next };
        });
    }, [place.kind, isFirstTransitActivity, nearestStation]);

    // Fetch one image for the arrival city. Reuses the recommendations
    // endpoint (already cached server-side) so this is essentially free
    // after the first lookup.
    const arrivalImageQuery = useSearchPlaces(
        arrivalCity?.trim() ? arrivalCity.trim() : '',
        1,
    );
    useEffect(() => {
        if (place.kind !== ACTIVITY_KIND.FLIGHT) return;
        const item = arrivalImageQuery.data?.items?.[0];
        if (!item?.imageUrl) return;
        if (place.image?.url === item.imageUrl) return;
        setPlace((prev) =>
            prev.image?.url
                ? prev
                : { ...prev, image: { url: item.imageUrl!, name: item.name } }
        );
        // Only react to a new image landing; intentionally narrow deps so
        // we don't loop on our own image-state writes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arrivalImageQuery.data, place.kind]);

    // Ground-transport smart-entry watcher. Mirrors the place watcher's
    // shape but does its work synchronously — no backend lookup needed
    // for transit; we just parse the natural-language text and fan out
    // the result onto the first segment + cost + trip name. Debounced
    // at 600ms so each keystroke doesn't thrash the form state.
    useEffect(() => {
        const isTransit =
            place.kind === ACTIVITY_KIND.TRAIN ||
            place.kind === ACTIVITY_KIND.BUS ||
            place.kind === ACTIVITY_KIND.RENTAL_CAR ||
            place.kind === ACTIVITY_KIND.OTHER;
        if (!isTransit) return;
        if (!transitSmartEntry.trim()) return;
        const kindAtFire = place.kind;
        const timer = setTimeout(() => {
            const parsed = parseTransitEntry(transitSmartEntry);
            if (!parsed) {
                setTransitSmartWarning(
                    t('addForms.activity.transit.parseFailed', {
                        text: transitSmartEntry.trim(),
                    }),
                );
                setTransitDetailsExpanded(true);
                return;
            }
            // "Nothing useful" sanity check — the parser is permissive
            // and will sometimes return {} when no operator / number /
            // stations / times were detected. Treat that as a parse
            // failure too so the user gets the same friendly nudge to
            // fill the form by hand instead of silently doing nothing.
            const hasContent = Boolean(
                parsed.operator ||
                    parsed.number ||
                    parsed.departStation ||
                    parsed.arrivalStation ||
                    parsed.departTime ||
                    parsed.arrivalTime ||
                    parsed.confirmationNumber ||
                    parsed.cost != null,
            );
            if (!hasContent) {
                setTransitSmartWarning(
                    t('addForms.activity.transit.parseFailed', {
                        text: transitSmartEntry.trim(),
                    }),
                );
                setTransitDetailsExpanded(true);
                return;
            }
            setTransitSmartWarning(null);
            // Build the kind-specific trip-name wrapper. The parser
            // returns just the operator string (e.g. "Hertz") and we
            // wrap it here so the headline reads naturally for the
            // chosen kind. Falls through to whatever the parser
            // suggested (station-pair, or residual text) when no
            // operator was detected.
            const wrappedTripName = (() => {
                if (!parsed.tripName) return undefined;
                if (parsed.operator) {
                    if (kindAtFire === ACTIVITY_KIND.RENTAL_CAR) {
                        return t('addForms.activity.transit.wrapName.rentalCar', {
                            operator: parsed.operator,
                        });
                    }
                    if (kindAtFire === ACTIVITY_KIND.TRAIN) {
                        return t('addForms.activity.transit.wrapName.train', {
                            operator: parsed.operator,
                        });
                    }
                    if (kindAtFire === ACTIVITY_KIND.BUS) {
                        return t('addForms.activity.transit.wrapName.bus', {
                            operator: parsed.operator,
                        });
                    }
                    if (kindAtFire === ACTIVITY_KIND.OTHER) {
                        return t('addForms.activity.transit.wrapName.other', {
                            operator: parsed.operator,
                        });
                    }
                }
                return parsed.tripName;
            })();
            setPlace((prev) => {
                const baseSegs = prev.transitSegments?.length
                    ? [...prev.transitSegments]
                    : [emptyTransitSegment(isoDefaultDate)];
                const first = { ...baseSegs[0] };
                if (parsed.operator) first.operator = parsed.operator;
                if (parsed.departStation) first.departStation = parsed.departStation;
                if (parsed.arrivalStation) first.arrivalStation = parsed.arrivalStation;
                if (parsed.departTime) first.departTime = parsed.departTime;
                if (parsed.arrivalTime) first.arrivalTime = parsed.arrivalTime;
                if (parsed.departDate) first.departDate = parsed.departDate;
                if (parsed.arrivalDate) first.arrivalDate = parsed.arrivalDate;
                if (parsed.classOrSeat) first.classOrSeat = parsed.classOrSeat;
                // The form's "Confirmation #" / "Train number" /
                // "Bus number" field is `segment.number` (handleSubmit
                // strips draft-level `confirmationNumber` for transit
                // kinds). A parsed train/bus service number takes the
                // field for trains/buses; rentals fall back to the
                // parsed confirmation. Apply whichever we have so it
                // shows up in the right form field and persists on save.
                if (parsed.number && !first.number) {
                    first.number = parsed.number;
                }
                if (parsed.confirmationNumber && !first.number) {
                    first.number = parsed.confirmationNumber;
                }
                baseSegs[0] = first;
                return {
                    ...prev,
                    transitSegments: baseSegs,
                    // Only overwrite cost when the user hadn't already
                    // typed one — same defensive pattern as the place
                    // and hotel watchers.
                    cost:
                        parsed.cost != null && !prev.cost
                            ? String(parsed.cost)
                            : prev.cost,
                    name:
                        prev.name?.trim() || !wrappedTripName
                            ? prev.name
                            : wrappedTripName,
                };
            });
            // Reveal the details so the user sees what got filled —
            // otherwise the smart entry silently changes hidden state
            // and the form looks unresponsive.
            setTransitDetailsExpanded(true);
            // Fire the AI field suggestion off the parsed route. Train /
            // bus / other only — RENTAL_CAR is skipped (no meaningful AI
            // time/cost for a private booking). The shared from→to guard
            // dedupes against the lookup path so train/bus suggest once.
            if (kindAtFire !== ACTIVITY_KIND.RENTAL_CAR) {
                fireTransitSuggest({
                    kind: kindAtFire,
                    departLocation: parsed.departStation,
                    arrivalLocation: parsed.arrivalStation,
                    provider: parsed.operator,
                    date: parsed.departDate,
                });
            }
        }, 600);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transitSmartEntry, place.kind]);

    const handleOnChange = <K extends keyof PlaceDraft>(name: K, value: PlaceDraft[K] | Friend) => {
        setError(null);
        setPlace((prev) => {
            if (name === 'friends') {
                const next = Array.isArray(prev.friends)
                    ? [...prev.friends, value as Friend]
                    : [value as Friend];
                return { ...prev, friends: next };
            }
            // Mirror the flight depart→arrival cascade on PLACE start→end:
            // when the user picks a start time and end time hasn't diverged
            // (empty or still matching the old start), keep them in sync so
            // a multi-activity day doesn't require setting two time fields
            // per entry. User can still bump end time after.
            if (
                name === 'startTime' &&
                typeof value === 'string' &&
                value &&
                (prev.kind ?? ACTIVITY_KIND.PLACE) === ACTIVITY_KIND.PLACE &&
                (!prev.endTime || prev.endTime === prev.startTime)
            ) {
                return { ...prev, startTime: value, endTime: value };
            }
            return { ...prev, [name]: value as PlaceDraft[K] };
        });
    };

    /** Update one field on segment `index`. Initializes `flightSegments`
     *  with a single entry if it hasn't been populated yet (defensive —
     *  the kind toggle should already have done that). Plain edits
     *  only — natural-language parsing lives on the separate "Smart
     *  entry" textfield above the segments list. */
    const handleSegmentField = <K extends keyof FlightInfo>(
        index: number,
        name: K,
        value: FlightInfo[K]
    ) => {
        setError(null);
        // Editing the flight number wipes the stale "not found" hint
        // for this segment so the user doesn't see the old number's
        // message while typing the new one.
        if (name === 'flightNumber') {
            setLookupNotFound((prev) => {
                if (!(index in prev)) return prev;
                const next = { ...prev };
                delete next[index];
                return next;
            });
        }
        setPlace((prev) => {
            const segments = prev.flightSegments?.length
                ? [...prev.flightSegments]
                : [emptySegment(isoDefaultDate)];

            // Multi-flight rescue: when the user types two-or-more flight
            // numbers into a single Flight Number field (e.g. "UA123 with
            // stopover BA345"), treat it as multi-leg shorthand and split
            // the legs into separate segments — same outcome as the smart
            // entry above. Without this, the raw sentence gets stored as
            // one segment.flightNumber and bleeds across when the user
            // clicks "+ Add segment" (which inherits the previous leg's
            // number).
            if (name === 'flightNumber' && typeof value === 'string') {
                const parsed = parseFlightInfo(value);
                if (parsed.segments.length > 1) {
                    const before = segments.slice(0, index);
                    const tail = segments.slice(index + 1);
                    let runningDate: string | undefined =
                        segments[index]?.departDate;
                    const newLegs = parsed.segments.map((p, i) => {
                        const dateToUse = p.departDate ?? runningDate;
                        if (dateToUse) runningDate = dateToUse;
                        const base =
                            i === 0
                                ? segments[index]
                                : emptySegment(isoDefaultDate);
                        return {
                            ...base,
                            flightNumber:
                                p.flightNumber ?? base.flightNumber,
                            ...(dateToUse
                                ? {
                                      departDate: dateToUse,
                                      arrivalDate:
                                          base.arrivalDate &&
                                          base.arrivalDate !== base.departDate
                                              ? base.arrivalDate
                                              : dateToUse,
                                  }
                                : {}),
                        };
                    });
                    return {
                        ...prev,
                        flightSegments: [...before, ...newLegs, ...tail],
                    };
                }
                // Single-leg path: when the input contains a recognizable
                // flight number AND extra noise (e.g. "UA123 with stopover"
                // without a second flight number yet — user might still be
                // typing the second leg), collapse to just the parsed
                // number so the lookup fires and the input doesn't carry
                // free-form text into the saved record. Pure "UA123" or
                // mid-typing partials (no match) pass through unchanged.
                if (
                    parsed.segments.length === 1 &&
                    parsed.flightNumber &&
                    value.trim().toUpperCase() !== parsed.flightNumber
                ) {
                    const updated = {
                        ...segments[index],
                        flightNumber: parsed.flightNumber,
                    };
                    segments[index] = updated;
                    return { ...prev, flightSegments: segments };
                }
            }

            const current = segments[index];
            const updated = { ...current, [name]: value };
            // Auto-fill arrival date from depart date when arrival is empty
            // or was still tracking the old depart (i.e. user never edited
            // it). Saves users from scrolling the date picker back from
            // today every time the trip is months out.
            if (
                name === 'departDate' &&
                typeof value === 'string' &&
                value &&
                (!current.arrivalDate || current.arrivalDate === current.departDate)
            ) {
                updated.arrivalDate = value;
            }
            segments[index] = updated;
            return { ...prev, flightSegments: segments };
        });
    };

    const handleAddSegment = () => {
        setError(null);
        setPlace((prev) => {
            const existing = prev.flightSegments ?? [];
            const last = existing[existing.length - 1];
            // Most users adding a stopover are entering the SAME flight
            // number for the next leg (return trip, same carrier
            // through-flight, or they just remember the digits and the
            // new leg is one off). Copy the previous leg's number so
            // the lookup can re-fire immediately; user can edit if the
            // next leg is a different flight.
            //
            // A connecting leg also departs from where the previous one
            // arrived, on (at the earliest) that same day — so seed the
            // new segment's depart airport / date from the previous
            // leg's arrival. Saves the user re-entering the connection
            // airport after picking a flight via Find-my-flight, and
            // keeps the chained-route name ("LAX → EWR → …") flowing.
            const inheritedDepartAirport = last?.arrivalAirport?.trim()
                ? last.arrivalAirport
                : undefined;
            const inheritedDepartDate = last?.arrivalDate?.trim()
                ? last.arrivalDate
                : undefined;
            return {
                ...prev,
                flightSegments: [
                    ...existing,
                    {
                        ...emptySegment(isoDefaultDate),
                        flightNumber: last?.flightNumber,
                        ...(inheritedDepartAirport
                            ? { departAirport: inheritedDepartAirport }
                            : {}),
                        ...(inheritedDepartDate
                            ? {
                                  departDate: inheritedDepartDate,
                                  arrivalDate: inheritedDepartDate,
                              }
                            : {}),
                    },
                ],
            };
        });
    };

    /** Apply a /flights/lookup result to a segment. The watcher only
     *  re-fires when (flight number, depart date) changes — i.e. the
     *  user is explicitly re-querying — so overwrite every field the
     *  result covers. Keeps the second lookup feeling like a real
     *  update instead of a stale half-update. Fields the API doesn't
     *  return (rare) keep whatever was there. */
    const applyFlightLookup = (
        segIdx: number,
        result: FlightLookupResult,
    ) => {
        setPlace((prev) => {
            const segments = prev.flightSegments?.length
                ? [...prev.flightSegments]
                : [emptySegment(isoDefaultDate)];
            const current = segments[segIdx] ?? {};
            segments[segIdx] = {
                ...current,
                departAirport: result.departAirport ?? current.departAirport,
                arrivalAirport: result.arrivalAirport ?? current.arrivalAirport,
                departDate: result.departDate ?? current.departDate,
                departTime: result.departTime ?? current.departTime,
                arrivalDate: result.arrivalDate ?? current.arrivalDate,
                arrivalTime: result.arrivalTime ?? current.arrivalTime,
            };
            return { ...prev, flightSegments: segments };
        });
        // Note: we intentionally do NOT auto-expand the details panel
        // here. Once the smart-entry / lookup populates airports +
        // times, the header reads "Segment 1 · UA123" and that's
        // usually enough — the user can click "Show details" to
        // verify the fields. Auto-expanding felt cluttered.
    };

    /** Apply a picked departures-search result to a segment. Same
     *  overwrite-when-present posture as `applyFlightLookup` — the user
     *  explicitly picked this row, so it's the new source of truth.
     *  Also seeds `arrivalCity` (the airport name the provider returns)
     *  so the hero-image fetch can run, exactly like the lookup path. */
    const applyFlightDeparture = (
        segIdx: number,
        item: FlightDepartureOption,
    ) => {
        setPlace((prev) => {
            const segments = prev.flightSegments?.length
                ? [...prev.flightSegments]
                : [emptySegment(isoDefaultDate)];
            const current = segments[segIdx] ?? {};
            segments[segIdx] = {
                ...current,
                flightNumber: item.flightNumber ?? current.flightNumber,
                departAirport: item.departAirport ?? current.departAirport,
                arrivalAirport: item.arrivalAirport ?? current.arrivalAirport,
                departDate: item.departDate ?? current.departDate,
                departTime: item.departTime ?? current.departTime,
                arrivalDate: item.arrivalDate ?? current.arrivalDate,
                arrivalTime: item.arrivalTime ?? current.arrivalTime,
            };
            return { ...prev, flightSegments: segments };
        });
        if (item.arrivalAirportName) setArrivalCity(item.arrivalAirportName);
    };

    const toggleSegmentExpanded = (segIdx: number) => {
        setExpandedSegments((prev) => {
            const next = new Set(prev);
            if (next.has(segIdx)) next.delete(segIdx);
            else next.add(segIdx);
            return next;
        });
    };

    const toggleSegmentOpen = (segIdx: number) => {
        setOpenSegments((prev) => {
            const next = new Set(prev);
            if (next.has(segIdx)) next.delete(segIdx);
            else next.add(segIdx);
            return next;
        });
    };

    /** Natural-language smart entry. Parses things like
     *      "UA123 tomorrow"
     *      "UA123 today stopover BA245"
     *  and rebuilds `flightSegments` so each detected leg becomes a
     *  row (with its existing FlightSegmentLookupWatcher firing the
     *  per-leg lookup). Auto-opens every populated segment so the
     *  user sees the result without hunting for a toggle. */
    const handleSmartEntry = (text: string) => {
        setSmartEntry(text);
        setError(null);
        const parsed = parseFlightInfo(text);
        // Empty / no-match: leave segments alone so the user's manual
        // edits aren't blown away by typing then deleting in this
        // field.
        if (parsed.segments.length === 0) return;
        setPlace((prev) => {
            const existing = prev.flightSegments ?? [];
            // Propagate the most-recent date forward: when a downstream
            // leg ("stopover BA245") doesn't get its own date keyword,
            // a same-day connection is the overwhelmingly common case
            // — so fall back to the prior leg's departDate. Without
            // this, the per-leg lookup stays disabled (it needs a
            // YYYY-MM-DD) and BA245 reads as an unpopulated stub.
            let runningDate: string | undefined;
            const merged = parsed.segments.map((p, i) => {
                const base = existing[i] ?? emptySegment(isoDefaultDate);
                const resolvedDate =
                    p.departDate ?? runningDate ?? base.departDate;
                if (resolvedDate) runningDate = resolvedDate;
                return {
                    ...base,
                    flightNumber: p.flightNumber ?? base.flightNumber,
                    ...(resolvedDate
                        ? {
                              departDate: resolvedDate,
                              arrivalDate:
                                  base.arrivalDate &&
                                  base.arrivalDate !== base.departDate
                                      ? base.arrivalDate
                                      : resolvedDate,
                          }
                        : {}),
                };
            });
            // If the parser found fewer legs than already exist, keep
            // the trailing segments untouched (user might be mid-edit
            // and the parser hasn't caught up). Multi-leg shrinking
            // is rare; expanding is the common case.
            const finalSegments =
                merged.length >= existing.length
                    ? merged
                    : [...merged, ...existing.slice(merged.length)];
            return { ...prev, flightSegments: finalSegments };
        });
        // Intentionally leave openSegments alone: the user wants to
        // see only the flight numbers (visible in the segment header
        // sub-label) after smart entry. The segment body stays
        // collapsed until they click the header to expand.
    };

    const handleLookupLoadingChange = (segIdx: number, loading: boolean) => {
        setLookupLoading((prev) => {
            const has = prev.has(segIdx);
            if (loading && has) return prev;
            if (!loading && !has) return prev;
            const next = new Set(prev);
            if (loading) next.add(segIdx);
            else next.delete(segIdx);
            return next;
        });
    };

    /** Apply a /transit/lookup result to a transit segment. Same
     *  posture as `applyFlightLookup`: the user is explicitly
     *  re-querying (operator + number changed), so overwrite every
     *  field the lookup returned. Fields the model didn't fill keep
     *  whatever was already typed in. */
    const applyTransitLookup = (
        segIdx: number,
        result: import('api/transitLookupApi').TransitLookupResult,
    ) => {
        setPlace((prev) => {
            const segments = prev.transitSegments?.length
                ? [...prev.transitSegments]
                : [emptyTransitSegment(isoDefaultDate)];
            const current = segments[segIdx] ?? {};
            segments[segIdx] = {
                ...current,
                operator: result.operator ?? current.operator,
                number: result.number ?? current.number,
                departStation: result.departStation ?? current.departStation,
                arrivalStation: result.arrivalStation ?? current.arrivalStation,
                departTime: result.departTime ?? current.departTime,
                arrivalTime: result.arrivalTime ?? current.arrivalTime,
                departDate: result.departDate ?? current.departDate,
                arrivalDate: result.arrivalDate ?? current.arrivalDate,
            };
            return { ...prev, transitSegments: segments };
        });
        // The lookup just resolved this segment's stations — fire the AI
        // field suggestion for empty time/cost. Skip RENTAL_CAR (no
        // lookup fires for it anyway) — train/bus only. fromRaw values
        // win over the result's nullable fields for the suggest args.
        const k = place.kind ?? ACTIVITY_KIND.PLACE;
        if (k === ACTIVITY_KIND.TRAIN || k === ACTIVITY_KIND.BUS) {
            fireTransitSuggest({
                kind: k,
                departLocation: result.departStation ?? undefined,
                arrivalLocation: result.arrivalStation ?? undefined,
                provider: result.operator ?? undefined,
                date: result.departDate ?? undefined,
            });
        }
    };

    const handleTransitLookupLoadingChange = (
        segIdx: number,
        loading: boolean,
    ) => {
        setTransitLookupLoading((prev) => {
            const has = prev.has(segIdx);
            if (loading && has) return prev;
            if (!loading && !has) return prev;
            const next = new Set(prev);
            if (loading) next.add(segIdx);
            else next.delete(segIdx);
            return next;
        });
    };

    // No auto-expand. Both the outer segment block and the inner
    // airport/date/time panel stay collapsed by default — the user
    // sees a compact list of segment headers (each showing the
    // flight number once populated) and clicks the row to expand.
    // Less visual noise after smart-entry parsing or edit hydrate.

    const handleRemoveSegment = (index: number) => {
        setError(null);
        setPlace((prev) => {
            const segments = prev.flightSegments ?? [];
            if (segments.length <= 1) return prev;
            return {
                ...prev,
                flightSegments: segments.filter((_, i) => i !== index),
            };
        });
    };

    /** Train / bus equivalents of the flight-segment helpers above. Kept
     *  parallel rather than abstracted into a single generic so each
     *  set's typing stays narrow (FlightInfo vs TransitInfo) and the
     *  forms can render kind-specific labels. */
    const handleTransitField = <K extends keyof TransitInfo>(
        index: number,
        name: K,
        value: TransitInfo[K]
    ) => {
        setError(null);
        // Editing operator or number wipes the stale "not found" hint
        // for this segment — same defensive clear as the flight form
        // does on flightNumber edits.
        if (name === 'operator' || name === 'number') {
            setTransitLookupNotFound((prev) => {
                if (!(index in prev)) return prev;
                const next = { ...prev };
                delete next[index];
                return next;
            });
        }
        setPlace((prev) => {
            const segments = prev.transitSegments?.length
                ? [...prev.transitSegments]
                : [emptyTransitSegment(isoDefaultDate)];
            const current = segments[index];
            const updated = { ...current, [name]: value };
            // Mirror the flight cascade: auto-fill arrival date when the
            // user changes depart and arrival is empty or still tracking
            // the old depart.
            if (
                name === 'departDate' &&
                typeof value === 'string' &&
                value &&
                (!current.arrivalDate || current.arrivalDate === current.departDate)
            ) {
                updated.arrivalDate = value;
            }
            segments[index] = updated;
            return { ...prev, transitSegments: segments };
        });
    };

    const handleAddTransitSegment = () => {
        setError(null);
        setPlace((prev) => {
            const existing = prev.transitSegments ?? [];
            const last = existing[existing.length - 1];
            // Multi-leg transit almost always continues from where the
            // previous leg ended on the same carrier (Renfe transfer,
            // FlixBus connection, same rental company). Inherit those
            // two fields so a transfer adds one tap instead of four;
            // user can still edit if the next leg is a different
            // operator / origin.
            const inheritedDepartStation = last?.arrivalStation?.trim()
                ? last.arrivalStation
                : undefined;
            const inheritedOperator = last?.operator?.trim()
                ? last.operator
                : undefined;
            return {
                ...prev,
                transitSegments: [
                    ...existing,
                    {
                        ...emptyTransitSegment(isoDefaultDate),
                        ...(inheritedDepartStation
                            ? { departStation: inheritedDepartStation }
                            : {}),
                        ...(inheritedOperator
                            ? { operator: inheritedOperator }
                            : {}),
                    },
                ],
            };
        });
    };

    const handleRemoveTransitSegment = (index: number) => {
        setError(null);
        setPlace((prev) => {
            const segments = prev.transitSegments ?? [];
            if (segments.length <= 1) return prev;
            return {
                ...prev,
                transitSegments: segments.filter((_, i) => i !== index),
            };
        });
    };

    /** Kind toggle handler — only callable from the ADD flow (the
     *  toggle is hidden on EDIT). Resets fields that don't apply to
     *  the new kind so an in-progress place doesn't bleed cost / note
     *  into a flight draft when the user changes their mind.
     *
     *  Hotel + transit kinds share the standard top-level fields:
     *  - HOTEL_CHECKIN / HOTEL_CHECKOUT: name = hotel, location =
     *    address, startTime = check-in/out time, cost = stay cost,
     *    confirmationNumber on the draft.
     *  - TRAIN / BUS: top-level fields cover the headline display
     *    (name = "Train Renfe AVE 4123" or "Bus FlixBus N1900");
     *    structured per-leg data lives on transitSegments. */
    const handleKindChange = (next: ActivityKind) => {
        setError(null);
        if (next !== ACTIVITY_KIND.FLIGHT) {
            setArrivalCity(null);
        }
        // Reset all smart-entry state so switching kinds shows a clean
        // form — without this, a place name typed under PLACE would
        // still drive a stale lookup after the user toggles to HOTEL,
        // and the warning / loading indicators would linger.
        setSmartEntry('');
        setPlaceSmartEntry('');
        setPlaceSmartLoading(false);
        setPlaceSuggestLoading(false);
        setPlaceSmartWarning(null);
        setPlaceDetailsExpanded(false);
        setHotelSmartEntry('');
        setHotelSmartLoading(false);
        setHotelSmartWarning(null);
        setHotelDetailsExpanded(false);
        setTransitSmartEntry('');
        setTransitDetailsExpanded(false);
        setTransitSmartWarning(null);
        const isHotel =
            next === ACTIVITY_KIND.HOTEL_CHECKIN ||
            next === ACTIVITY_KIND.HOTEL_CHECKOUT;
        const isTransit =
            next === ACTIVITY_KIND.TRAIN ||
            next === ACTIVITY_KIND.BUS ||
            next === ACTIVITY_KIND.RENTAL_CAR ||
            next === ACTIVITY_KIND.OTHER;
        setPlace((prev) => ({
            ...prev,
            kind: next,
            // Carry the name across (relevant to every kind). Drop the
            // bits that don't make sense on the new form. `location`
            // doubles as the hotel address on hotel kinds, so keep it
            // for PLACE + hotel; drop it elsewhere.
            location:
                next === ACTIVITY_KIND.PLACE || isHotel
                    ? prev.location
                    : undefined,
            cost:
                next === ACTIVITY_KIND.PLACE ||
                next === ACTIVITY_KIND.FLIGHT ||
                isHotel ||
                isTransit
                    ? prev.cost
                    : undefined,
            image: next === ACTIVITY_KIND.PLACE ? prev.image : undefined,
            // Notes carry no time slot; flights store time inside
            // flightSegments; transit kinds store time inside
            // transitSegments. Hotel + place use the top-level start
            // time, with end time only relevant for place.
            startTime:
                next === ACTIVITY_KIND.NOTE ||
                next === ACTIVITY_KIND.FLIGHT ||
                isTransit
                    ? undefined
                    : prev.startTime ?? now('HH:mm'),
            endTime:
                next === ACTIVITY_KIND.PLACE
                    ? prev.endTime ?? now('HH:mm')
                    : undefined,
            flightSegments:
                next === ACTIVITY_KIND.FLIGHT
                    ? prev.flightSegments?.length
                        ? prev.flightSegments
                        : [emptySegment(isoDefaultDate)]
                    : undefined,
            transitSegments: isTransit
                ? prev.transitSegments?.length
                    ? prev.transitSegments
                    : [emptyTransitSegment(isoDefaultDate)]
                : undefined,
            confirmationNumber: isHotel ? prev.confirmationNumber : undefined,
        }));
    };

    /** AI suggestion picked from PlaceAutocomplete — prefill name + location
     *  + image in one go. The user can still edit any of them before saving.
     *
     *  Also stashes the structured place block (city / country / countryCode /
     *  lat / lng) from the suggestion so it rides along on save. The Mapper
     *  trip-link cascade reads those fields off the saved activity to write
     *  self-only `visited_places` rows with a tripId back-link. If the user
     *  later edits the activity's name into something unrelated, that's
     *  fine — the structured block stays as the picked place's identity. */
    const handlePlacePicked = (suggestion: PlaceSuggestion) => {
        setError(null);
        setPlace((prev) => ({
            ...prev,
            name: suggestion.name,
            location: suggestion.location,
            // Picking a new place clears the previous image — keeping
            // `prev.image` would leak the previous smart-entry hit's
            // photo (e.g. Rokurinsha) onto a freshly-picked place
            // (e.g. Mount Fuji) when the new pick happens to lack
            // its own photo URL.
            image: suggestion.imageUrl
                ? { url: suggestion.imageUrl, name: suggestion.name }
                : null,
            placeCity: suggestion.city || null,
            placeCountry: suggestion.country || null,
            countryCode: suggestion.countryCode ?? null,
            latitude: suggestion.latitude ?? null,
            longitude: suggestion.longitude ?? null,
            // Only the smart-entry URL path supplies sourceUrl. A chip /
            // autocomplete pick has none, which clears any prior link so
            // re-picking a different place doesn't keep a stale source.
            sourceUrl: suggestion.sourceUrl ?? null,
            // Global rating snapshot from the smart-entry Google lookup.
            // Cleared on a chip/autocomplete pick (no snapshot) so a
            // re-pick doesn't keep the previous place's rating.
            googleRating: suggestion.googleRating ?? null,
            googleRatingCount: suggestion.googleRatingCount ?? null,
            openaiRating: suggestion.openaiRating ?? null,
            // Prefill the note with the place's AI summary (the recommender's
            // `description`), but ONLY when the note is still empty — so a note
            // the user typed, or a previous pick's summary they chose to keep,
            // is never clobbered. There's no separate description column on the
            // activity, so the note is where this lives + renders in the card.
            note: prev.note?.trim() ? prev.note : suggestion.note ?? prev.note,
        }));
        // Reveal the details panel so the just-populated name /
        // location / image are visible. Same intent as the smart-
        // entry onResult: a successful pick should never silently
        // change hidden state. Both the PlaceSuggestions chip pick
        // and the hotel-suggestions pick route through here, so this
        // covers both surfaces.
        setPlaceDetailsExpanded(true);
        setHotelDetailsExpanded(true);
    };

    /** Fire-and-forget AI field suggestion after a PLACE smart entry
     *  resolves. Fills ONLY empty draft fields (cost / start / end time,
     *  and location / city / country for name-only entries) so nothing
     *  the user typed or a prior pick filled is clobbered. Guarded to
     *  fire once per resolved identity; non-blocking so the review can
     *  show first and re-render reactively when the suggestion lands. */
    const firePlaceSuggest = (args: {
        name?: string;
        location?: string;
        city?: string | null;
        country?: string | null;
    }) => {
        const name = args.name?.trim();
        if (!name) return;
        const key = `place:${name}|${(args.location ?? '').trim()}`;
        if (suggestAppliedKeyRef.current === key) return;
        suggestAppliedKeyRef.current = key;
        setPlaceSuggestLoading(true);
        void suggestActivityFields({
            kind: ACTIVITY_KIND.PLACE,
            name,
            location: args.location?.trim() || undefined,
            city: args.city?.trim() || undefined,
            country: args.country?.trim() || undefined,
            date: isoDefaultDate,
        })
            .then((s: ActivitySuggestion | null) => {
                if (!s) return;
                setPlace((prev) => ({
                    ...prev,
                    // The backend only returns `name` as a confident
                    // correction of a misspelled / informal entry
                    // ("bukinhan palance" → "Buckingham Palace"), so applying
                    // it IS the desired "better guess". Unlike the other
                    // fields below this overrides whatever the user typed.
                    name: s.name?.trim() ? s.name : prev.name,
                    location:
                        prev.location?.trim() || !s.location
                            ? prev.location
                            : s.location,
                    placeCity:
                        prev.placeCity || !s.city ? prev.placeCity : s.city,
                    placeCountry:
                        prev.placeCountry || !s.country
                            ? prev.placeCountry
                            : s.country,
                    startTime:
                        prev.startTime?.trim() || !s.startTime
                            ? prev.startTime
                            : s.startTime,
                    endTime:
                        prev.endTime?.trim() || !s.endTime
                            ? prev.endTime
                            : s.endTime,
                    cost:
                        (prev.cost != null && String(prev.cost).trim()) ||
                        !s.cost
                            ? prev.cost
                            : s.cost,
                }));
            })
            .catch(() => {})
            .finally(() => setPlaceSuggestLoading(false));
    };

    /** Fire-and-forget AI field suggestion after a HOTEL smart entry
     *  resolves its location. Hotel stores the check-in time on the
     *  draft's top-level `startTime`; a separate check-out time rides on
     *  `pendingHotelCheckout` (spawned into the paired HOTEL_CHECKOUT on
     *  save). Fill only what's still empty. */
    const fireHotelSuggest = (args: {
        name?: string;
        location?: string;
        city?: string | null;
        country?: string | null;
    }) => {
        const name = args.name?.trim();
        if (!name) return;
        const key = `hotel:${name}|${(args.location ?? '').trim()}`;
        if (suggestAppliedKeyRef.current === key) return;
        suggestAppliedKeyRef.current = key;
        void suggestActivityFields({
            kind: 'hotel',
            name,
            location: args.location?.trim() || undefined,
            city: args.city?.trim() || undefined,
            country: args.country?.trim() || undefined,
        })
            .then((s: ActivitySuggestion | null) => {
                if (!s) return;
                setPlace((prev) => ({
                    ...prev,
                    // Check-in time = draft startTime; only fill if empty.
                    startTime:
                        prev.startTime?.trim() || !s.checkInTime
                            ? prev.startTime
                            : s.checkInTime,
                    cost:
                        (prev.cost != null && String(prev.cost).trim()) ||
                        !s.cost
                            ? prev.cost
                            : s.cost,
                }));
            })
            .catch(() => {});
    };

    /** Fire-and-forget AI field suggestion after a GROUND transit entry
     *  resolves its stations. Applies to the FIRST segment's empty
     *  depart/arrival times and the draft-level cost. RENTAL_CAR is
     *  skipped by the callers — no meaningful AI time/cost for a private
     *  booking. */
    const fireTransitSuggest = (args: {
        kind: ActivityKind;
        departLocation?: string;
        arrivalLocation?: string;
        provider?: string;
        date?: string;
    }) => {
        const from = args.departLocation?.trim();
        const to = args.arrivalLocation?.trim();
        if (!from && !to) return;
        const key = `transit:${args.kind}|${from ?? ''}→${to ?? ''}`;
        if (suggestAppliedKeyRef.current === key) return;
        suggestAppliedKeyRef.current = key;
        void suggestActivityFields({
            kind: args.kind,
            departLocation: from,
            arrivalLocation: to,
            provider: args.provider?.trim() || undefined,
            date: args.date,
        })
            .then((s: ActivitySuggestion | null) => {
                if (!s) return;
                setPlace((prev) => {
                    const segments = prev.transitSegments?.length
                        ? [...prev.transitSegments]
                        : [emptyTransitSegment(isoDefaultDate)];
                    const first = { ...segments[0] };
                    // Segments seed depart/arrival time to the '00:00'
                    // placeholder (see emptyTransitSegment), so treat that
                    // as still-empty — only a user-set time blocks the fill.
                    const isUnsetTime = (t?: string) =>
                        !t?.trim() || t === '00:00';
                    if (isUnsetTime(first.departTime) && s.departTime) {
                        first.departTime = s.departTime;
                    }
                    if (isUnsetTime(first.arrivalTime) && s.arrivalTime) {
                        first.arrivalTime = s.arrivalTime;
                    }
                    segments[0] = first;
                    return {
                        ...prev,
                        transitSegments: segments,
                        cost:
                            (prev.cost != null &&
                                String(prev.cost).trim()) ||
                            !s.cost
                                ? prev.cost
                                : s.cost,
                    };
                });
            })
            .catch(() => {});
    };

    const handleImageChange = (e: { target: { value: string } } | React.ChangeEvent<HTMLInputElement>) => {
        const target = (e as React.ChangeEvent<HTMLInputElement>).target;
        const file = target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            handleOnChange('image', { url: String(reader.result), name: file.name });
        };
        reader.readAsDataURL(file);
    };

    /** Permissive "is there anything identifying this activity?" check.
     *  Sets the Snackbar error + returns false when the draft is blank
     *  for its kind; clears the error + returns true otherwise. Shared by
     *  the wizard's Next button (Step 2 → 3) and the final submit. */
    const validateDraft = (): boolean => {
        const kind = place.kind ?? ACTIVITY_KIND.PLACE;
        const missing: string[] = [];

        // Lazy-user mode: validation is intentionally permissive so
        // anyone can save a partial activity and flesh it out later.
        // We only block when there's literally nothing identifying
        // the activity — every kind needs at least ONE meaningful
        // field set so the timeline doesn't end up with an unreadable
        // blank card.
        if (kind === ACTIVITY_KIND.NOTE) {
            // Notes are a single free-form text field. The form no longer
            // has a separate title — the first line of the note doubles
            // as the headline on the timeline card (see name-derivation
            // below in finalName).
            if (!place.note?.trim()) {
                missing.push(t('addForms.activity.validation.note'));
            }
        } else if (kind === ACTIVITY_KIND.FLIGHT) {
            const segments = place.flightSegments ?? [];
            // Need at least one segment with a flight number OR an
            // airport (otherwise the card has nothing to render).
            const anyContent = segments.some(
                (s) =>
                    s.flightNumber?.trim() ||
                    s.departAirport?.trim() ||
                    s.arrivalAirport?.trim(),
            );
            if (!segments.length || !anyContent) {
                missing.push(t('addForms.activity.validation.flight'));
            }
        } else if (
            kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
            kind === ACTIVITY_KIND.HOTEL_CHECKOUT
        ) {
            // Hotel needs at least a name OR an address so the card
            // identifies what hotel this is. Time / cost / confirmation
            // can all be added later.
            if (!place.name?.trim() && !place.location?.trim()) {
                missing.push(t('addForms.activity.validation.hotel'));
            }
        } else if (
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS ||
            kind === ACTIVITY_KIND.RENTAL_CAR ||
            kind === ACTIVITY_KIND.OTHER
        ) {
            const segments = place.transitSegments ?? [];
            // Need at least one segment with SOMETHING identifying
            // it: operator, number, or depart station / pickup.
            const anyContent = segments.some(
                (s) =>
                    s.operator?.trim() ||
                    s.number?.trim() ||
                    s.departStation?.trim() ||
                    s.arrivalStation?.trim(),
            );
            if (!segments.length || !anyContent) {
                const isRental = kind === ACTIVITY_KIND.RENTAL_CAR;
                missing.push(
                    isRental
                        ? t('addForms.activity.validation.rental')
                        : t('addForms.activity.validation.transit'),
                );
            }
        } else {
            // PLACE kind — just need a name. Time window, cost, note,
            // image are all optional.
            if (!place.name?.trim())
                missing.push(t('addForms.activity.validation.name'));
        }

        if (missing.length) {
            setError(
                t('addForms.activity.validation.message', {
                    fields: missing.join(', '),
                }),
            );
            return false;
        }
        setError(null);
        return true;
    };

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const kind = place.kind ?? ACTIVITY_KIND.PLACE;

        if (!validateDraft()) return;
        modelRef.current?.closeModal();

        // Synthesize a sensible default name for kinds whose form
        // doesn't ask for one directly. Always lets the user override
        // by typing into the kind-specific name field.
        let finalName = place.name;
        if (kind === ACTIVITY_KIND.NOTE) {
            // NOTE has no title field — derive the timeline headline
            // from the note's first non-empty line, falling back to
            // "Note" so the saved activity always has a title.
            finalName = deriveNoteName(
                place.name,
                place.note,
                t('addForms.activity.name.noteFallback'),
            );
        } else if (kind === ACTIVITY_KIND.FLIGHT) {
            // No user-facing flight-name field anymore — derive
            // entirely from the segments. Two strategies in priority
            // order: (1) route chain "JFK → LAX → SFO" when the user
            // typed any airports; (2) flight number chain "UA123 +
            // BA245" when only flight numbers are filled. The smart
            // entry above usually populates one or the other.
            finalName =
                place.name?.trim() ||
                (() => {
                    const segs = place.flightSegments ?? [];
                    if (!segs.length) return '';
                    const chain = [
                        segs[0]?.departAirport ?? '',
                        ...segs.map((s) => s.arrivalAirport ?? ''),
                    ].filter((s) => s && s.trim());
                    if (chain.length) return chain.join(' → ');
                    const numbers = segs
                        .map((s) => s.flightNumber?.trim() ?? '')
                        .filter(Boolean);
                    return numbers.join(' + ');
                })();
        } else if (
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS ||
            kind === ACTIVITY_KIND.RENTAL_CAR ||
            kind === ACTIVITY_KIND.OTHER
        ) {
            // "Train Renfe AVE 4123" / "Bus FlixBus N1900" / "Rental
            // car Hertz ABC123" / "Ride Uber" — prefix + operator +
            // number is the most recognizable label for a transit entry
            // on the day timeline.
            finalName =
                place.name?.trim() ||
                (() => {
                    const seg = place.transitSegments?.[0];
                    if (!seg) return '';
                    const prefix =
                        kind === ACTIVITY_KIND.TRAIN
                            ? t('addForms.activity.name.train')
                            : kind === ACTIVITY_KIND.BUS
                              ? t('addForms.activity.name.bus')
                              : kind === ACTIVITY_KIND.OTHER
                                ? t('addForms.activity.name.ride')
                                : t('addForms.activity.name.rentalCar');
                    const bits = [
                        prefix,
                        seg.operator?.trim(),
                        seg.number?.trim(),
                    ].filter(Boolean);
                    return bits.join(' ');
                })();
        } else if (kind === ACTIVITY_KIND.HOTEL_CHECKIN) {
            finalName = place.name?.trim()
                ? t('addForms.activity.name.checkInPrefix', {
                      name: place.name.trim(),
                  })
                : t('addForms.activity.name.hotelCheckin');
        } else if (kind === ACTIVITY_KIND.HOTEL_CHECKOUT) {
            finalName = place.name?.trim()
                ? t('addForms.activity.name.checkOutPrefix', {
                      name: place.name.trim(),
                  })
                : t('addForms.activity.name.hotelCheckout');
        }

        // For train + bus, the depart segment's date/time is the
        // headline time on the day timeline. Mirror to top-level
        // startTime so existing rendering paths show the right slot
        // without needing transit-aware logic.
        const isTransitKind =
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS ||
            kind === ACTIVITY_KIND.RENTAL_CAR ||
            kind === ACTIVITY_KIND.OTHER;
        const transitStartTime = isTransitKind
            ? place.transitSegments?.[0]?.departTime
            : undefined;
        const transitEndTime = isTransitKind
            ? place.transitSegments?.[place.transitSegments.length - 1]
                  ?.arrivalTime
            : undefined;

        // Lift the draft's freeform `confirmationNumber` into the
        // structured `hotelInfo` shape that Activity expects, and only
        // when this is actually a hotel kind. Keeps the Activity type
        // tidy (hotelInfo isn't a draft-level field on the activity).
        const isHotel =
            kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
            kind === ACTIVITY_KIND.HOTEL_CHECKOUT;
        const hotelInfo =
            isHotel && place.confirmationNumber?.trim()
                ? { confirmationNumber: place.confirmationNumber.trim() }
                : undefined;

        // Strip draft-only `confirmationNumber` from the spread so it
        // doesn't sneak through onto the Activity payload as an extra
        // top-level field (which would type-check today but pollute the
        // shape later when something narrows on the activity keys).
        const { confirmationNumber: _draftConfirmation, ...placePayload } = place;

        onChange?.({
            ...placePayload,
            kind,
            name: finalName,
            startTime: transitStartTime ?? place.startTime,
            endTime: transitEndTime ?? place.endTime,
            hotelInfo,
        });
        if (type === ACTION.ADD) {
            setPlace(buildInitialPlace());
            setFormKey((k) => k + 1);
            setWizardStep(1);
            setMethod(null);
            setReviewEditing(false);
        }
    };

    useEffect(() => {
        setError(null);
        if (data && type === ACTION.EDIT) {
            const dataKind: ActivityKind =
                (data.kind as ActivityKind | undefined) ?? ACTIVITY_KIND.PLACE;
            const isHotelEdit =
                dataKind === ACTIVITY_KIND.HOTEL_CHECKIN ||
                dataKind === ACTIVITY_KIND.HOTEL_CHECKOUT;
            const isTransitEdit =
                dataKind === ACTIVITY_KIND.TRAIN ||
                dataKind === ACTIVITY_KIND.BUS ||
                dataKind === ACTIVITY_KIND.RENTAL_CAR ||
                dataKind === ACTIVITY_KIND.OTHER;
            // Strip the "Check in: " / "Check out: " prefix the submit
            // helper added on create, so the editable hotel-name field
            // shows just the hotel itself rather than the synthesized
            // headline.
            let editName = data.name;
            if (dataKind === ACTIVITY_KIND.HOTEL_CHECKIN) {
                editName = data.name?.replace(
                    /^(?:Check in|Entrada):\s*/i,
                    '',
                );
            } else if (dataKind === ACTIVITY_KIND.HOTEL_CHECKOUT) {
                editName = data.name?.replace(
                    /^(?:Check out|Salida):\s*/i,
                    '',
                );
            }
            setPlace({
                id: data.id,
                kind: dataKind,
                name: editName,
                // Notes are timeless — strip start/end on edit so the
                // form doesn't surface stale values from a different
                // kind. Flights and transit carry their times inside
                // their segment arrays.
                startTime:
                    dataKind === ACTIVITY_KIND.NOTE ||
                    dataKind === ACTIVITY_KIND.FLIGHT ||
                    isTransitEdit
                        ? undefined
                        : data.startTime || now('HH:mm'),
                endTime:
                    dataKind === ACTIVITY_KIND.PLACE
                        ? data.endTime || now('HH:mm')
                        : undefined,
                location: data.location,
                cost: data.cost,
                note: data.note,
                status:
                    data.status && typeof data.status === 'object'
                        ? (data.status as DropdownOption)
                        : undefined,
                image: data.image,
                flightSegments:
                    dataKind === ACTIVITY_KIND.FLIGHT
                        ? data.flightSegments?.length
                            ? data.flightSegments
                            : [emptySegment(isoDefaultDate)]
                        : undefined,
                transitSegments: isTransitEdit
                    ? data.transitSegments?.length
                        ? data.transitSegments
                        : [emptyTransitSegment(isoDefaultDate)]
                    : undefined,
                confirmationNumber: isHotelEdit
                    ? data.hotelInfo?.confirmationNumber
                    : undefined,
                // Preserve the structured place block across edit. Without
                // this, saving an edited place would null out the city /
                // country / coords on the server and break the Mapper
                // trip-link cascade. The block isn't user-editable in the
                // form today — it lives or dies by whether the original
                // create picked from PlaceAutocomplete.
                placeCity: data.placeCity ?? null,
                placeCountry: data.placeCountry ?? null,
                countryCode: data.countryCode ?? null,
                latitude: data.latitude ?? null,
                longitude: data.longitude ?? null,
                // Preserve the pasted source link across an edit — like the
                // structured place block, it isn't user-editable in the form
                // but must survive a save so it isn't nulled server-side.
                sourceUrl: data.sourceUrl ?? null,
                // Likewise preserve the rating snapshots across an edit.
                googleRating: data.googleRating ?? null,
                googleRatingCount: data.googleRatingCount ?? null,
                openaiRating: data.openaiRating ?? null,
            });
        } else {
            setPlace(buildInitialPlace());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, type]);

    // Reset per-modal-instance state when the modal closes. Without
    // this, reopening the modal would show stale smart-entry text,
    // stale per-segment loading flags, and leftover segment open /
    // detail-expand states from the previous editing session.
    const handleModalClose = () => {
        setSmartEntry('');
        setPlaceSmartEntry('');
        setPlaceSmartLoading(false);
        setPlaceSuggestLoading(false);
        setPlaceSmartWarning(null);
        setPlaceDetailsExpanded(false);
        setHotelSmartEntry('');
        setHotelSmartLoading(false);
        setHotelSmartWarning(null);
        setHotelDetailsExpanded(false);
        setTransitSmartEntry('');
        setTransitDetailsExpanded(false);
        setTransitSmartWarning(null);
        setOpenSegments(new Set());
        setExpandedSegments(new Set());
        setLookupLoading(new Set());
        setLookupNotFound({});
        setTransitLookupLoading(new Set());
        setTransitLookupNotFound({});
        setError(null);
        // ADD mode: drop the in-progress form too so reopening the
        // modal shows a clean activity-name field. EDIT mode keeps the
        // saved data because the [data, type] useEffect won't re-fire
        // if the user closes without changes (deps unchanged).
        if (isAdd) {
            setPlace(buildInitialPlace());
            setFormKey((k) => k + 1);
            // Reopening ADD always starts at Step 1 with no method chosen.
            setWizardStep(1);
            setMethod(null);
            setReviewEditing(false);
        }
    };

    /** Case-insensitive country-name comparison. Returns `true` when
     *  the two values clearly describe the same country (or when
     *  either is missing, since we can't compare). Used to block the
     *  smart-entry auto-populate when a pasted Yelp / Google link
     *  resolves to a place outside the trip's destination country.
     *
     *  Recommender occasionally returns `country` as a malformed
     *  "City, Country" string (e.g. "Panama City, Panama" on a Panama
     *  trip) — comparing the whole thing to "Panama" would falsely
     *  fire the warning. Take the last comma segment as the country
     *  so the tail still matches. */
    const sameCountry = (
        tripCountry?: string,
        itemCountry?: string | null,
    ): boolean => {
        if (!tripCountry || !itemCountry) return true;
        const tail = (s: string): string => {
            const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
            return (parts[parts.length - 1] ?? s).toLowerCase();
        };
        return tail(tripCountry) === tail(itemCountry);
    };

    const currentKind = place.kind ?? ACTIVITY_KIND.PLACE;

    /** Step 1 tile pick: reset the kind (existing handler) and advance
     *  to Step 2. Preselect the method when the kind has exactly one
     *  (Note → custom) so the chooser auto-skips. */
    const handleTypePick = (next: ActivityKind) => {
        handleKindChange(next);
        const available = methodsForKind(next);
        setMethod(available.length === 1 ? available[0] : null);
        setWizardStep(2);
    };

    const handleMethodPick = (next: AddMethod) => {
        setMethod(next);
    };

    /** Smart-box submit from Step 1: the user typed free text and we
     *  detected a kind. Route it straight into the existing SMART
     *  pipeline — same as if they'd picked the tile, chosen "Smart
     *  entry", and typed the text into that kind's smart field:
     *    1. Reset to the detected kind via the existing kind-change path
     *       (so per-kind seeding / field clearing runs).
     *    2. Force the SMART method.
     *    3. Seed that kind's smart-entry state, which fires the same
     *       watcher/effect that powers typing (place/hotel watchers key
     *       on `rawInput`; the transit effect keys on `transitSmartEntry`;
     *       flight runs `handleSmartEntry` which rebuilds segments).
     *    4. Land on Step 2 — the SMART pipeline + auto-advance then carry
     *       the user to the review with no further taps.
     *  handleKindChange wipes every smart field, so seed AFTER it. */
    const handleSmartBoxSubmit = (text: string, kind: ActivityKind) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        handleKindChange(kind);
        setMethod(ADD_METHOD.SMART);
        if (kind === ACTIVITY_KIND.FLIGHT) {
            handleSmartEntry(trimmed);
        } else if (
            kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
            kind === ACTIVITY_KIND.HOTEL_CHECKOUT
        ) {
            setHotelSmartEntry(trimmed);
        } else if (
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS ||
            kind === ACTIVITY_KIND.RENTAL_CAR ||
            kind === ACTIVITY_KIND.OTHER
        ) {
            setTransitSmartEntry(trimmed);
        } else {
            setPlaceSmartEntry(trimmed);
        }
        setWizardStep(2);
    };

    /** A flight was picked from the "Find my flight" departures search.
     *  Populate segment 0, then drop the user into the normal flight
     *  form (via the CUSTOM method) so the cost field is reachable and
     *  they can press "+ Add segment (stopover)" for a connecting leg —
     *  whose depart airport/date pre-seed from this leg's arrival. */
    const handleFlightDeparturePick = (item: FlightDepartureOption) => {
        applyFlightDeparture(0, item);
        setMethod(ADD_METHOD.CUSTOM);
    };

    /** Mirror the headline name `handleSubmit` will synthesize, so the
     *  review step shows exactly what lands on the timeline card. */
    const deriveActivityName = (): string => {
        const kind = currentKind;
        if (kind === ACTIVITY_KIND.NOTE) {
            return deriveNoteName(
                place.name,
                place.note,
                t('addForms.activity.name.noteFallback'),
            );
        }
        if (kind === ACTIVITY_KIND.FLIGHT) {
            if (place.name?.trim()) return place.name.trim();
            const segs = place.flightSegments ?? [];
            if (!segs.length) return '';
            const chain = [
                segs[0]?.departAirport ?? '',
                ...segs.map((s) => s.arrivalAirport ?? ''),
            ].filter((s) => s && s.trim());
            if (chain.length) return chain.join(' → ');
            return segs
                .map((s) => s.flightNumber?.trim() ?? '')
                .filter(Boolean)
                .join(' + ');
        }
        if (
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS ||
            kind === ACTIVITY_KIND.RENTAL_CAR ||
            kind === ACTIVITY_KIND.OTHER
        ) {
            if (place.name?.trim()) return place.name.trim();
            const seg = place.transitSegments?.[0];
            if (!seg) return '';
            const prefix =
                kind === ACTIVITY_KIND.TRAIN
                    ? t('addForms.activity.name.train')
                    : kind === ACTIVITY_KIND.BUS
                      ? t('addForms.activity.name.bus')
                      : kind === ACTIVITY_KIND.OTHER
                        ? t('addForms.activity.name.ride')
                        : t('addForms.activity.name.rentalCar');
            return [prefix, seg.operator?.trim(), seg.number?.trim()]
                .filter(Boolean)
                .join(' ');
        }
        if (kind === ACTIVITY_KIND.HOTEL_CHECKIN) {
            return place.name?.trim()
                ? t('addForms.activity.name.checkInPrefix', {
                      name: place.name.trim(),
                  })
                : t('addForms.activity.name.hotelCheckin');
        }
        if (kind === ACTIVITY_KIND.HOTEL_CHECKOUT) {
            return place.name?.trim()
                ? t('addForms.activity.name.checkOutPrefix', {
                      name: place.name.trim(),
                  })
                : t('addForms.activity.name.hotelCheckout');
        }
        return place.name?.trim() ?? '';
    };

    // The cohesive controller bundle threaded to every per-kind form.
    // The parent owns all state + handlers; the forms are presentational.
    const controller: FormController = {
        place,
        isAdd,
        countryScope,
        cityScope,
        handleOnChange,
        handlePlacePicked,
        firePlaceSuggest,
        fireHotelSuggest,
        handleImageChange,
        setPlace,
        placeSmartEntry,
        setPlaceSmartEntry,
        placeSmartLoading,
        setPlaceSmartLoading,
        placeSuggestLoading,
        placeSmartWarning,
        setPlaceSmartWarning,
        placeDetailsExpanded,
        setPlaceDetailsExpanded,
        smartEntry,
        handleSmartEntry,
        expandedSegments,
        openSegments,
        lookupLoading,
        lookupNotFound,
        setLookupNotFound,
        toggleSegmentOpen,
        toggleSegmentExpanded,
        handleSegmentField,
        handleAddSegment,
        handleRemoveSegment,
        applyFlightLookup,
        handleLookupLoadingChange,
        setArrivalCity,
        hotelSmartEntry,
        setHotelSmartEntry,
        hotelSmartLoading,
        setHotelSmartLoading,
        hotelSmartWarning,
        setHotelSmartWarning,
        hotelDetailsExpanded,
        setHotelDetailsExpanded,
        transitSmartEntry,
        setTransitSmartEntry,
        transitSmartWarning,
        transitDetailsExpanded,
        setTransitDetailsExpanded,
        transitLookupLoading,
        transitLookupNotFound,
        setTransitLookupNotFound,
        handleTransitField,
        handleAddTransitSegment,
        handleRemoveTransitSegment,
        applyTransitLookup,
        handleTransitLookupLoadingChange,
        emptySegment,
        emptyTransitSegment,
        isoDefaultDate,
        sameCountry,
        smartEntryLocation,
        tripMinDate,
        tripMaxDate,
    };

    /** Render the right per-kind form for the given mode (edit full-form
     *  or an ADD wizard method-slice). */
    const renderKindForm = (mode: FormMode) => {
        switch (currentKind) {
            case ACTIVITY_KIND.NOTE:
                return <NoteForm controller={controller} />;
            case ACTIVITY_KIND.FLIGHT:
                return <FlightForm controller={controller} mode={mode} />;
            case ACTIVITY_KIND.HOTEL_CHECKIN:
            case ACTIVITY_KIND.HOTEL_CHECKOUT:
                return <HotelForm controller={controller} mode={mode} />;
            case ACTIVITY_KIND.TRAIN:
            case ACTIVITY_KIND.BUS:
            case ACTIVITY_KIND.RENTAL_CAR:
            case ACTIVITY_KIND.OTHER:
                return <TransitForm controller={controller} mode={mode} />;
            default:
                return <PlaceForm controller={controller} mode={mode} />;
        }
    };

    const availableMethods = methodsForKind(currentKind);

    // Step 2 shows the method chooser only when no method is chosen yet
    // AND the kind offers more than one. Single-method kinds (Note) jump
    // straight to the input via the preselect in handleTypePick.
    const showMethodChooser = wizardStep === 2 && method === null;

    // FLIGHT + "Find my flight" replaces the per-kind form with the
    // departures-search UI. On pick we switch the method to CUSTOM (see
    // handleFlightDeparturePick), so this flips back to the populated
    // FlightForm — where cost + "+ Add segment (stopover)" live.
    const flightSearchActive =
        currentKind === ACTIVITY_KIND.FLIGHT && method === ADD_METHOD.SEARCH;

    // Whether the SMART method's input is the active Step-2 view. The
    // flight "Find my flight" SEARCH branch is deliberately excluded (it
    // keeps its own Next/pick flow). Drives the no-Next footer, the
    // inline searching/not-found UI, and the auto-advance below.
    const isSmartMethodActive =
        wizardStep === 2 &&
        !showMethodChooser &&
        !flightSearchActive &&
        method === ADD_METHOD.SMART;

    // The smart-entry text for the current kind — the auto-advance keys
    // its fired-once guard on this so a fresh entry can re-advance.
    const isHotelKind =
        currentKind === ACTIVITY_KIND.HOTEL_CHECKIN ||
        currentKind === ACTIVITY_KIND.HOTEL_CHECKOUT;
    const isTransitKindNow =
        currentKind === ACTIVITY_KIND.TRAIN ||
        currentKind === ACTIVITY_KIND.BUS ||
        currentKind === ACTIVITY_KIND.RENTAL_CAR ||
        currentKind === ACTIVITY_KIND.OTHER;
    const activeSmartEntry =
        currentKind === ACTIVITY_KIND.FLIGHT
            ? smartEntry
            : isHotelKind
              ? hotelSmartEntry
              : isTransitKindNow
                ? transitSmartEntry
                : placeSmartEntry;

    // Derive the smart pipeline status from the loading + not-found +
    // draft state each kind already exposes. "resolved" means the async
    // settled AND the draft carries the key field(s) for the kind.
    const smartStatus: SmartStatus = useMemo(() => {
        const entry = activeSmartEntry.trim();
        // Empty / trivially short input is idle — no spinner, no advance.
        if (entry.length < 2) return 'idle';

        if (currentKind === ACTIVITY_KIND.FLIGHT) {
            const resolved = (place.flightSegments ?? []).some(
                (s) => s.departAirport?.trim() && s.arrivalAirport?.trim(),
            );
            if (resolved) return 'resolved';
            if (lookupLoading.size > 0) return 'searching';
            if (Object.keys(lookupNotFound).length > 0) return 'notfound';
            return 'searching';
        }
        if (isTransitKindNow) {
            const resolved = (place.transitSegments ?? []).some(
                (s) =>
                    (s.departStation?.trim() && s.arrivalStation?.trim()) ||
                    (s.operator?.trim() && s.number?.trim()),
            );
            if (resolved) return 'resolved';
            if (transitLookupLoading.size > 0) return 'searching';
            if (
                transitSmartWarning ||
                Object.keys(transitLookupNotFound).length > 0
            ) {
                return 'notfound';
            }
            return 'searching';
        }
        // PLACE + HOTEL share the place-watcher shape. Resolved = a name
        // plus either a location string or real coordinates (the bare-
        // match path fills only the name and raises a warning → notfound).
        //
        // Exception: a pasted LINK that resolved a name counts as resolved even
        // without an address/coords. Many hotel/booking sites (e.g. riu.com)
        // expose only a <title>, no schema.org address, so the scraper returns
        // a name-only result. The user explicitly handed us the place via the
        // link, so advance to the prefilled review instead of dead-ending on
        // "Couldn't find a match".
        const isUrlEntry = /^https?:\/\//i.test(entry);
        const resolved =
            Boolean(place.name?.trim()) &&
            (Boolean(place.location?.trim()) ||
                place.latitude != null ||
                isUrlEntry);
        const loading = isHotelKind ? hotelSmartLoading : placeSmartLoading;
        const warning = isHotelKind ? hotelSmartWarning : placeSmartWarning;
        // PLACE-only: the place SEARCH and the suggest-fields AI call run in
        // sequence — the search resolves the name/coords, then fires the
        // suggest for the corrected name + location/cost/time. Keep the flow
        // "searching" until BOTH settle so the user never sees a premature
        // "couldn't find" (bare-match warning) or a half-filled review that
        // a beat later fills in. HOTEL has no parallel suggest-gate here.
        const suggestPending =
            currentKind === ACTIVITY_KIND.PLACE && placeSuggestLoading;
        if (loading || suggestPending) return 'searching';
        if (resolved) return 'resolved';
        if (warning) return 'notfound';
        return 'searching';
    }, [
        activeSmartEntry,
        currentKind,
        isHotelKind,
        isTransitKindNow,
        place.flightSegments,
        place.transitSegments,
        place.name,
        place.location,
        place.latitude,
        lookupLoading,
        lookupNotFound,
        transitLookupLoading,
        transitLookupNotFound,
        transitSmartWarning,
        placeSmartLoading,
        placeSuggestLoading,
        hotelSmartLoading,
        placeSmartWarning,
        hotelSmartWarning,
    ]);

    // PLACE-only "still resolving" flag — true while the place search or
    // the suggest-fields AI call is in flight. Gates the review's ADD
    // button so the user can't add a half-resolved activity (and shows a
    // spinner on it). Other kinds never set these, so they're unaffected.
    const placeResolving =
        currentKind === ACTIVITY_KIND.PLACE &&
        (placeSmartLoading || placeSuggestLoading);

    // Clearing the smart field resets the fired-once guard so a brand-new
    // entry can auto-advance again.
    useEffect(() => {
        if (!activeSmartEntry.trim()) {
            autoAdvancedKeyRef.current = null;
            suggestAppliedKeyRef.current = null;
        }
    }, [activeSmartEntry]);

    // Auto-advance to the review step once the smart pipeline resolves.
    // Fires at most once per distinct resolved input (keyed by the smart
    // text), never while searching, and only while the SMART input is the
    // active view. A short settle delay keeps it from jumping mid-typing.
    useEffect(() => {
        if (!isSmartMethodActive) return;
        if (smartStatus !== 'resolved') return;
        const key = activeSmartEntry.trim();
        if (!key) return;
        if (autoAdvancedKeyRef.current === key) return;
        const timer = setTimeout(() => {
            autoAdvancedKeyRef.current = key;
            setWizardStep(3);
        }, 500);
        return () => clearTimeout(timer);
    }, [isSmartMethodActive, smartStatus, activeSmartEntry]);

    // View-only instances (e.g. the edit pencil on a locked / Confirmed
    // activity) render nothing. This MUST stay below every hook above:
    // an earlier return changed the hook count when `isViewMode` flips
    // (toggling an activity to Confirmed locks its pencil), which React
    // rejects with "rendered more hooks than during the previous render".
    if (isViewMode) return null;

    const handleWizardNext = () => {
        // Run the same up-front validation handleSubmit does; on failure
        // it sets the Snackbar error and we stay on Step 2.
        if (!validateDraft()) return;
        setWizardStep(3);
    };

    /** Save from the review's in-place edit sub-view. Same permissive
     *  validation as Step 2 → 3; on success drop back to the read-only
     *  review (now reflecting the live-mutated draft). On failure stay on
     *  the edit form — validateDraft already raised the Snackbar error. */
    const handleReviewEditSave = () => {
        if (!validateDraft()) return;
        setReviewEditing(false);
    };

    const handleWizardBackFromInput = () => {
        // Single-method kinds skip the chooser entirely — Back from their
        // input returns to Step 1. Multi-method kinds drop back to the
        // chooser.
        if (availableMethods.length <= 1) {
            setWizardStep(1);
        } else {
            setMethod(null);
        }
    };

    const modalElement = (
        <ModalButton
            ref={modelRef}
            title={
                isAdd
                    ? t('addForms.activity.trigger.add')
                    : data?.name
                      ? t('addForms.activity.trigger.editNamed', {
                            name: data.name,
                        })
                      : t('addForms.activity.trigger.edit')
            }
            onClose={handleModalClose}
            // Pre-warm the destination's place suggestions the moment the
            // Add-Activity modal opens, so the Suggestions strip is already
            // loaded by the time the user reaches it. Add-mode only; uses the
            // same country/city scope the strip queries with so the cache hits.
            onOpen={
                isAdd
                    ? () =>
                          prefetchActivitySuggestions(
                              queryClient,
                              countryScope,
                              cityScope,
                          )
                    : undefined
            }
            // Activity form is content-heavy; flips to a full-viewport
            // sheet on mobile so the user doesn't fight a tiny centered
            // window with double scrollbars on every device under 480px.
            containerClassName="add-place-modal"
            buttonProps={
                triggerIcon
                    ? {
                          // Icon-only trigger — no text label so it sits
                          // tight next to an activity title.
                          title: '',
                          Icon: triggerIcon,
                          type: BUTTON_VARIANT.TEXT_PLAIN,
                          className: triggerClassName,
                          iconProps: { fontSize: 'small' },
                          ariaLabel: isAdd
                              ? t('addForms.activity.trigger.add')
                              : data?.name
                                ? t('addForms.activity.trigger.editNamed', {
                                      name: data.name,
                                  })
                                : t('addForms.activity.trigger.edit'),
                      }
                    : {
                          title: isAdd
                              ? t('addForms.activity.trigger.add')
                              : t('addForms.activity.trigger.edit'),
                          Icon:
                              buttonType === BUTTON_VARIANT.STANDARD
                                  ? AddCircleIcon
                                  : null,
                          type: buttonType,
                      }
            }
        >
                    {/* EDIT: the full single-screen form, exactly as
                        before — kind toggle hidden, details shown, one
                        Save button. ADD: the calm 3-step wizard. */}
                    {!isAdd ? (
                        <Grid container key={formKey}>
                            <Grid
                                item
                                lg={12}
                                md={12}
                                xs={12}
                                id="add-place-form-container"
                            >
                                {renderKindForm('edit')}
                            </Grid>
                            <Grid item lg={12} md={12} xs={12}>
                                <ButtonCustom
                                    onClick={handleSubmit}
                                    label={t('addForms.activity.trigger.save')}
                                    type={BUTTON_VARIANT.STANDARD}
                                    capitalizeType="uppercase"
                                />
                            </Grid>
                        </Grid>
                    ) : (
                        <Grid container key={formKey}>
                            <Grid
                                item
                                lg={12}
                                md={12}
                                xs={12}
                                id="add-place-form-container"
                            >
                                {wizardStep === 1 && (
                                    <TypeStep
                                        currentKind={currentKind}
                                        onPick={handleTypePick}
                                        onSmartSubmit={handleSmartBoxSubmit}
                                    />
                                )}
                                {wizardStep === 2 && showMethodChooser && (
                                    <>
                                        <MethodStep
                                            methods={availableMethods}
                                            onPick={handleMethodPick}
                                        />
                                        <WizardNav
                                            onBack={() => setWizardStep(1)}
                                        />
                                    </>
                                )}
                                {wizardStep === 2 &&
                                    !showMethodChooser &&
                                    flightSearchActive && (
                                        <FlightDeparturesSearch
                                            // Default From = the user's home
                                            // airport (departure is from home);
                                            // respect a segment value if one
                                            // was already seeded/edited.
                                            initialAirport={
                                                place.flightSegments?.[0]
                                                    ?.departAirport ||
                                                nearestAirport?.iataCode ||
                                                ''
                                            }
                                            // Default To = the trip's
                                            // destination airport (where the
                                            // trip is): the flight-derived
                                            // arrival, or the country/city
                                            // resolved from the airport
                                            // catalog. Swap flips them for a
                                            // return flight.
                                            initialArrival={defaultArrivalAirport}
                                            initialDate={isoDefaultDate ?? ''}
                                            onPick={handleFlightDeparturePick}
                                            onBack={handleWizardBackFromInput}
                                        />
                                    )}
                                {wizardStep === 2 &&
                                    !showMethodChooser &&
                                    !flightSearchActive && (
                                        <>
                                            {renderKindForm({
                                                method:
                                                    method ??
                                                    availableMethods[0],
                                            })}
                                            {/* SMART method: no manual Next —
                                                the pipeline auto-advances on
                                                resolve. Surface a subtle
                                                "Searching…" while in flight,
                                                and a manual/suggestions
                                                fallback when nothing matched. */}
                                            {isSmartMethodActive &&
                                                smartStatus === 'searching' && (
                                                    <div className="add-smart-pipeline add-smart-pipeline-searching">
                                                        <CircularProgress
                                                            size={16}
                                                            className="add-smart-pipeline-spinner"
                                                        />
                                                        <span>
                                                            {t(
                                                                'addForms.common.searching',
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            {isSmartMethodActive &&
                                                smartStatus === 'notfound' && (
                                                    <div className="add-smart-pipeline add-smart-pipeline-notfound">
                                                        <span className="add-smart-pipeline-msg">
                                                            {availableMethods.includes(
                                                                ADD_METHOD.SUGGESTIONS,
                                                            )
                                                                ? t(
                                                                      'addForms.activity.smartPipeline.notFoundWithSuggestions',
                                                                  )
                                                                : t(
                                                                      'addForms.activity.smartPipeline.notFound',
                                                                  )}
                                                        </span>
                                                        <div className="add-smart-pipeline-actions">
                                                            <ButtonCustom
                                                                label={t(
                                                                    'addForms.activity.smartPipeline.addManually',
                                                                )}
                                                                type={
                                                                    BUTTON_VARIANT.LINE
                                                                }
                                                                onClick={() =>
                                                                    setMethod(
                                                                        ADD_METHOD.CUSTOM,
                                                                    )
                                                                }
                                                            />
                                                            {availableMethods.includes(
                                                                ADD_METHOD.SUGGESTIONS,
                                                            ) && (
                                                                <ButtonCustom
                                                                    label={t(
                                                                        'addForms.activity.smartPipeline.seeSuggestions',
                                                                    )}
                                                                    type={
                                                                        BUTTON_VARIANT.LINE
                                                                    }
                                                                    onClick={() =>
                                                                        setMethod(
                                                                            ADD_METHOD.SUGGESTIONS,
                                                                        )
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            <WizardNav
                                                onBack={
                                                    handleWizardBackFromInput
                                                }
                                                onNext={
                                                    isSmartMethodActive
                                                        ? undefined
                                                        : handleWizardNext
                                                }
                                            />
                                        </>
                                    )}
                                {wizardStep === 3 && !reviewEditing && (
                                    <>
                                        <ReviewStep
                                            place={place}
                                            derivedName={deriveActivityName()}
                                            resolving={placeResolving}
                                            onEdit={() => {
                                                setError(null);
                                                setReviewEditing(true);
                                            }}
                                        />
                                        <WizardNav
                                            onBack={() => setWizardStep(2)}
                                            onConfirm={() =>
                                                handleSubmit({
                                                    preventDefault: () => {},
                                                } as React.MouseEvent<HTMLButtonElement>)
                                            }
                                            confirmDisabled={placeResolving}
                                        />
                                    </>
                                )}
                                {wizardStep === 3 && reviewEditing && (
                                    <>
                                        {/* Force the full editable form
                                            (CUSTOM presentation) so every
                                            field shows regardless of how the
                                            draft was originally created. */}
                                        {renderKindForm({
                                            method: ADD_METHOD.CUSTOM,
                                        })}
                                        <WizardNav
                                            onBack={() =>
                                                setReviewEditing(false)
                                            }
                                            backLabel={t(
                                                'addForms.common.cancel',
                                            )}
                                            onConfirm={handleReviewEditSave}
                                            confirmLabel={t(
                                                'addForms.common.save',
                                            )}
                                        />
                                    </>
                                )}
                            </Grid>
                        </Grid>
                    )}
                    {/* Validation feedback as a transient Snackbar
                        instead of an inline alert at the bottom of the
                        form. Avoids pushing the submit button down the
                        page when a long Hotel / Ground form already
                        crowds the modal, and auto-clears so the form
                        stays clean once the user fixes the issue. */}
                    <Snackbar
                        open={Boolean(error)}
                        autoHideDuration={5000}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        onClose={() => setError(null)}
                    >
                        <Alert
                            severity="error"
                            variant="filled"
                            onClose={() => setError(null)}
                            sx={{ width: '100%' }}
                        >
                            {error}
                        </Alert>
                    </Snackbar>
                </ModalButton>
    );

    // Icon-only trigger: render bare so the trigger sits inline next to
    // surrounding flex items (e.g. activity title + status pill). The Grid
    // wrappers used by the standard/text variants force a full-width row
    // and push the trigger below the title.
    if (triggerIcon) {
        return modalElement;
    }

    return (
        <Grid
            container
            className={classNames({
                'add-place-container-standard': buttonType === BUTTON_VARIANT.STANDARD,
                'add-place-container-simple': buttonType === BUTTON_VARIANT.TEXT,
            })}
        >
            <Grid
                item
                lg={12}
                md={12}
                xs={12}
                className={classNames({
                    'place-left': tripTypeId === TRIP_BASIC.MULTIPLE.id,
                })}
            >
                {modalElement}
            </Grid>
        </Grid>
    );
};

export default AddPlaceBtn;
