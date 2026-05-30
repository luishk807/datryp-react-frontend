import {
    useState,
    useRef,
    useEffect,
    useMemo,
    type ComponentType,
} from 'react';
import { useSearchPlaces } from 'api/hooks/useSearchPlaces';
import {
    Alert,
    CircularProgress,
    Grid,
    InputAdornment,
    Snackbar,
    TextField,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import { formatDate, isValidDate, now } from 'utils';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CarRentalRoundedIcon from '@mui/icons-material/CarRentalRounded';
import CommuteRoundedIcon from '@mui/icons-material/CommuteRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import FlightSegmentLookupWatcher from './FlightSegmentLookupWatcher';
import TransitSegmentLookupWatcher from './TransitSegmentLookupWatcher';
import { parseFlightInfo } from './parseFlightInfo';
import PlaceSmartEntryWatcher from './PlaceSmartEntryWatcher';
import { parseTransitEntry } from './parseTransitQuery';
import { pickSmartEntryLocation } from './pickSmartEntryLocation';
import type { FlightLookupResult } from 'api/flightLookupApi';
import type { PlaceRecommendation } from 'types';
import PlaceAutocomplete, {
    type PlaceSuggestion,
} from 'components/common/PlaceAutocomplete';
import PlaceSuggestions from 'components/common/PlaceSuggestions';
import { type DropdownOption } from 'components/common/FormFields/DropDown';
import classNames from 'classnames';
import { ACTION, ACTIVITY_KIND, BUTTON_VARIANT, TRIP_BASIC } from 'constants';
import {
    useNearestAirport,
    useNearestTrainStation,
} from 'api/hooks/useHomeDeparture';
import { useTripState } from 'context/TripContext';
import './index.scss';
import type {
    Activity,
    ActivityKind,
    AddEditButtonProps,
    FlightInfo,
    Friend,
    ImageRef,
    TransitInfo,
} from 'types';

const PLACE_LABEL = {
    ADD: 'Add Activity',
    EDIT: 'Edit',
    SAVE: 'Save Activity',
} as const;

interface PlaceDraft {
    id?: number;
    /** What kind of activity this entry is — picked once via the
     *  toggle at the top of the modal. Persisted on save; locked on
     *  edit (the toggle hides). */
    kind?: ActivityKind;
    name?: string;
    location?: string;
    cost?: string | number;
    startTime?: string;
    endTime?: string;
    note?: string;
    status?: DropdownOption;
    image?: ImageRef;
    friends?: Friend[];
    /** One entry per flight leg. Always present (with a single empty
     *  entry) once the kind toggle picks Flight, so the form has
     *  somewhere to write into. */
    flightSegments?: FlightInfo[];
    /** One entry per ground-transport leg (train / bus). Mirrors the
     *  flight-segment shape — a single entry covers a direct trip; a
     *  two-entry array covers a transfer. */
    transitSegments?: TransitInfo[];
    /** Hotel confirmation number for `hotel_checkin` / `hotel_checkout`
     *  kinds. Hotel name, address, time, and cost reuse the standard
     *  `name` / `location` / `startTime` / `cost` draft fields. */
    confirmationNumber?: string;
    /** Structured hotel info delivered on the onChange payload (the
     *  submit helper lifts `confirmationNumber` into this shape so the
     *  consumer's Activity stays clean). */
    hotelInfo?: { confirmationNumber?: string };
    /** Structured place data lifted off a picked PlaceSuggestion (from
     *  PlaceAutocomplete or PlaceSuggestions). Stashed on the draft so
     *  it rides along with the activity on save and reaches the
     *  backend's `activities` row. The Mapper trip-link cascade reads
     *  these on trip completion to write `visited_places` rows with a
     *  tripId back-link. Null/undefined when the user typed free-text
     *  instead of picking. */
    placeKey?: string | null;
    placeCity?: string | null;
    placeCountry?: string | null;
    countryCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

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
    const modelRef = useRef<ModalButtonHandle>(null);

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
    // Pending HOTEL_CHECKOUT to spawn alongside the primary
    // HOTEL_CHECKIN once the user clicks Save. Populated by the hotel
    // smart entry when the input mentions a separate check-out time
    // ("check-in 3pm, check-out tomorrow 11am"). Cleared on modal
    // close or after the second save fires.
    const [pendingHotelCheckout, setPendingHotelCheckout] = useState<{
        startTime?: string;
        date?: string;
    } | null>(null);
    // City of the most-recently picked arrival airport — drives the
    // optional auto-fetch of a hero image for the flight activity.
    // Resets when the modal closes or the kind toggles away from
    // FLIGHT.
    const [arrivalCity, setArrivalCity] = useState<string | null>(null);

    // Home-base auto-seed: when the user toggles to FLIGHT (or a transit
    // kind) on the very FIRST flight/transit activity of the trip, drop
    // the IATA / station code from their home city into segment 0's
    // depart slot. Skips on EDIT (we trust whatever the user saved) and
    // on the second-onwards flight (by then they're planning an
    // internal-to-trip leg, not the home-to-destination one).
    const tripState = useTripState();
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
            place.kind === ACTIVITY_KIND.RENTAL_CAR;
        if (!isTransit) return;
        if (!transitSmartEntry.trim()) return;
        const kindAtFire = place.kind;
        const timer = setTimeout(() => {
            const parsed = parseTransitEntry(transitSmartEntry);
            if (!parsed) {
                setTransitSmartWarning(
                    `Couldn't pick anything useful out of “${transitSmartEntry.trim()}”. Fill in operator / station / time using the form below.`,
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
                    `Couldn't pick anything useful out of “${transitSmartEntry.trim()}”. Fill in operator / station / time using the form below.`,
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
                        return `Car reservation with ${parsed.operator}`;
                    }
                    if (kindAtFire === ACTIVITY_KIND.TRAIN) {
                        return `Train with ${parsed.operator}`;
                    }
                    if (kindAtFire === ACTIVITY_KIND.BUS) {
                        return `Bus with ${parsed.operator}`;
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
                // kinds). Apply parsed confirmation here so it shows
                // up in the right form field and persists on save.
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
            return {
                ...prev,
                flightSegments: [
                    ...existing,
                    {
                        ...emptySegment(isoDefaultDate),
                        flightNumber: last?.flightNumber,
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
        setPlaceSmartWarning(null);
        setPlaceDetailsExpanded(false);
        setHotelSmartEntry('');
        setHotelSmartLoading(false);
        setHotelSmartWarning(null);
        setHotelDetailsExpanded(false);
        setTransitSmartEntry('');
        setTransitDetailsExpanded(false);
        setTransitSmartWarning(null);
        setPendingHotelCheckout(null);
        const isHotel =
            next === ACTIVITY_KIND.HOTEL_CHECKIN ||
            next === ACTIVITY_KIND.HOTEL_CHECKOUT;
        const isTransit =
            next === ACTIVITY_KIND.TRAIN ||
            next === ACTIVITY_KIND.BUS ||
            next === ACTIVITY_KIND.RENTAL_CAR;
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

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
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
                missing.push('a note');
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
                missing.push('a flight number or airport');
            }
        } else if (
            kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
            kind === ACTIVITY_KIND.HOTEL_CHECKOUT
        ) {
            // Hotel needs at least a name OR an address so the card
            // identifies what hotel this is. Time / cost / confirmation
            // can all be added later.
            if (!place.name?.trim() && !place.location?.trim()) {
                missing.push('a hotel name or address');
            }
        } else if (
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS ||
            kind === ACTIVITY_KIND.RENTAL_CAR
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
                        ? 'a rental company or pickup location'
                        : 'an operator or station',
                );
            }
        } else {
            // PLACE kind — just need a name. Time window, cost, note,
            // image are all optional.
            if (!place.name?.trim()) missing.push('a name');
        }

        if (missing.length) {
            setError(`Please provide ${missing.join(', ')}.`);
            return;
        }
        setError(null);
        modelRef.current?.closeModal();

        // Synthesize a sensible default name for kinds whose form
        // doesn't ask for one directly. Always lets the user override
        // by typing into the kind-specific name field.
        let finalName = place.name;
        if (kind === ACTIVITY_KIND.NOTE) {
            // NOTE has no title field — derive the timeline headline
            // from the note's first line. Trim to a sensible length so
            // a multi-paragraph note doesn't blow out the card width.
            const firstLine = (place.note ?? '')
                .split(/\r?\n/)[0]
                ?.trim() ?? '';
            finalName = place.name?.trim() || firstLine.slice(0, 80);
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
            kind === ACTIVITY_KIND.RENTAL_CAR
        ) {
            // "Train Renfe AVE 4123" / "Bus FlixBus N1900" / "Rental
            // car Hertz ABC123" — prefix + operator + number is the
            // most recognizable label for a transit entry on the day
            // timeline.
            finalName =
                place.name?.trim() ||
                (() => {
                    const seg = place.transitSegments?.[0];
                    if (!seg) return '';
                    const prefix =
                        kind === ACTIVITY_KIND.TRAIN
                            ? 'Train'
                            : kind === ACTIVITY_KIND.BUS
                              ? 'Bus'
                              : 'Rental car';
                    const bits = [
                        prefix,
                        seg.operator?.trim(),
                        seg.number?.trim(),
                    ].filter(Boolean);
                    return bits.join(' ');
                })();
        } else if (kind === ACTIVITY_KIND.HOTEL_CHECKIN) {
            finalName =
                place.name?.trim()
                    ? `Check in: ${place.name.trim()}`
                    : 'Hotel check-in';
        } else if (kind === ACTIVITY_KIND.HOTEL_CHECKOUT) {
            finalName =
                place.name?.trim()
                    ? `Check out: ${place.name.trim()}`
                    : 'Hotel check-out';
        }

        // For train + bus, the depart segment's date/time is the
        // headline time on the day timeline. Mirror to top-level
        // startTime so existing rendering paths show the right slot
        // without needing transit-aware logic.
        const isTransitKind =
            kind === ACTIVITY_KIND.TRAIN ||
            kind === ACTIVITY_KIND.BUS ||
            kind === ACTIVITY_KIND.RENTAL_CAR;
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
        // Spawn the paired HOTEL_CHECKOUT activity when the smart entry
        // captured a separate check-out instruction. Same hotel details
        // (name, address, image, confirmation, city/country) — only the
        // kind, name prefix, and start time differ. Note: the parent
        // adds activities to the current day-block; if the user
        // mentioned a different checkout date, they may need to drag
        // the spawned checkout to the right day after save.
        if (
            kind === ACTIVITY_KIND.HOTEL_CHECKIN &&
            pendingHotelCheckout?.startTime &&
            type === ACTION.ADD
        ) {
            const checkoutName = place.name?.trim()
                ? `Check out: ${place.name.trim()}`
                : 'Hotel check-out';
            onChange?.({
                ...placePayload,
                kind: ACTIVITY_KIND.HOTEL_CHECKOUT,
                name: checkoutName,
                startTime: pendingHotelCheckout.startTime,
                endTime: undefined,
                hotelInfo,
                // Cost lives on the check-in activity (whole-stay
                // total). Don't double-charge by repeating it on the
                // check-out row. Budget split is on the check-in row
                // for the same reason — it's not in PlaceDraft so we
                // don't need to clear it here; the spread can't carry
                // it across.
                cost: undefined,
            });
            setPendingHotelCheckout(null);
        }
        if (type === ACTION.ADD) {
            setPlace(buildInitialPlace());
            setFormKey((k) => k + 1);
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
                dataKind === ACTIVITY_KIND.RENTAL_CAR;
            // Strip the "Check in: " / "Check out: " prefix the submit
            // helper added on create, so the editable hotel-name field
            // shows just the hotel itself rather than the synthesized
            // headline.
            let editName = data.name;
            if (dataKind === ACTIVITY_KIND.HOTEL_CHECKIN) {
                editName = data.name?.replace(/^Check in:\s*/i, '');
            } else if (dataKind === ACTIVITY_KIND.HOTEL_CHECKOUT) {
                editName = data.name?.replace(/^Check out:\s*/i, '');
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
            });
        } else {
            setPlace(buildInitialPlace());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, type]);

    if (isViewMode) return null;

    // Reset per-modal-instance state when the modal closes. Without
    // this, reopening the modal would show stale smart-entry text,
    // stale per-segment loading flags, and leftover segment open /
    // detail-expand states from the previous editing session.
    const handleModalClose = () => {
        setSmartEntry('');
        setPlaceSmartEntry('');
        setPlaceSmartLoading(false);
        setPlaceSmartWarning(null);
        setPlaceDetailsExpanded(false);
        setHotelSmartEntry('');
        setHotelSmartLoading(false);
        setHotelSmartWarning(null);
        setHotelDetailsExpanded(false);
        setTransitSmartEntry('');
        setTransitDetailsExpanded(false);
        setTransitSmartWarning(null);
        setPendingHotelCheckout(null);
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

    const modalElement = (
        <ModalButton
            ref={modelRef}
            title={isAdd ? PLACE_LABEL.ADD : `${PLACE_LABEL.EDIT} ${data?.name ?? ''}`}
            onClose={handleModalClose}
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
                              ? PLACE_LABEL.ADD
                              : `${PLACE_LABEL.EDIT} ${data?.name ?? ''}`,
                      }
                    : {
                          title: isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.EDIT,
                          Icon:
                              buttonType === BUTTON_VARIANT.STANDARD
                                  ? AddCircleIcon
                                  : null,
                          type: buttonType,
                      }
            }
        >
                    <Grid container key={formKey}>
                        {isAdd && (
                            <Grid
                                item
                                lg={12}
                                md={12}
                                xs={12}
                                className="add-place-kind-toggle"
                                role="tablist"
                                aria-label="Activity kind"
                            >
                                {[
                                    {
                                        value: ACTIVITY_KIND.PLACE,
                                        label: 'Place',
                                        Icon: PlaceRoundedIcon,
                                        // Single ACTIVITY_KIND value → active
                                        // when `place.kind` equals it.
                                        activeKinds: [ACTIVITY_KIND.PLACE],
                                    },
                                    {
                                        value: ACTIVITY_KIND.NOTE,
                                        label: 'Note',
                                        Icon: StickyNote2RoundedIcon,
                                        activeKinds: [ACTIVITY_KIND.NOTE],
                                    },
                                    {
                                        value: ACTIVITY_KIND.FLIGHT,
                                        label: 'Flight',
                                        Icon: FlightRoundedIcon,
                                        activeKinds: [ACTIVITY_KIND.FLIGHT],
                                    },
                                    {
                                        // Hotel folds the two check-in/out
                                        // event kinds behind one chip. Click
                                        // defaults to check-in; an in-form
                                        // toggle below switches to check-out
                                        // (and back) without leaving the
                                        // Hotel form. Both events still
                                        // persist with their distinct
                                        // ACTIVITY_KIND so the timeline
                                        // shows two separate cards.
                                        value: ACTIVITY_KIND.HOTEL_CHECKIN,
                                        label: 'Hotel',
                                        Icon: HotelRoundedIcon,
                                        activeKinds: [
                                            ACTIVITY_KIND.HOTEL_CHECKIN,
                                            ACTIVITY_KIND.HOTEL_CHECKOUT,
                                        ],
                                    },
                                    {
                                        // Ground folds the three surface-
                                        // transit kinds (train, bus, rental
                                        // car) behind one chip. Click
                                        // defaults to Train; an in-form
                                        // toggle switches between the three
                                        // without leaving the shared
                                        // transit form. Same pattern as the
                                        // Hotel chip above — keeps the
                                        // top-level toggle compact while
                                        // still persisting each event with
                                        // a distinct ACTIVITY_KIND so the
                                        // timeline shows the correct
                                        // train / bus / rental-car icon.
                                        value: ACTIVITY_KIND.TRAIN,
                                        label: 'Ground',
                                        Icon: CommuteRoundedIcon,
                                        activeKinds: [
                                            ACTIVITY_KIND.TRAIN,
                                            ACTIVITY_KIND.BUS,
                                            ACTIVITY_KIND.RENTAL_CAR,
                                        ],
                                    },
                                ].map(({ value, label, Icon, activeKinds }) => {
                                    const currentKind =
                                        place.kind ?? ACTIVITY_KIND.PLACE;
                                    const active = (
                                        activeKinds as ActivityKind[]
                                    ).includes(currentKind);
                                    return (
                                        <button
                                            key={value}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            className={classNames('add-place-kind-btn', {
                                                selected: active,
                                            })}
                                            onClick={() => handleKindChange(value)}
                                        >
                                            <Icon className="add-place-kind-icon" fontSize="small" />
                                            <span>{label}</span>
                                        </button>
                                    );
                                })}
                            </Grid>
                        )}
                        <Grid item lg={12} md={12} xs={12} id="add-place-form-container">
                            {(place.kind ?? ACTIVITY_KIND.PLACE) === ACTIVITY_KIND.PLACE && (
                                <Grid container>
                                    {isAdd && countryScope && (
                                        <Grid item lg={12} xs={12} className="py-5">
                                            <PlaceSuggestions
                                                country={countryScope}
                                                city={cityScope}
                                                onPick={handlePlacePicked}
                                            />
                                        </Grid>
                                    )}
                                    {/* Smart entry — accepts either a plain
                                        place name OR a Google Maps share
                                        link. The watcher debounces, unwraps
                                        the URL if any, searches, and applies
                                        the top match via handlePlacePicked
                                        so name / location / image / city /
                                        coords all populate in one shot. */}
                                    {isAdd && (
                                        <Grid item lg={12} xs={12} className="py-5">
                                            <div className="flight-smart-entry">
                                                <div className="flight-smart-entry-field">
                                                    <TextField
                                                        fullWidth
                                                        variant="outlined"
                                                        value={placeSmartEntry}
                                                        onChange={(e) =>
                                                            setPlaceSmartEntry(e.target.value)
                                                        }
                                                        placeholder={
                                                            countryScope
                                                                ? `e.g. "Ankole Grill at 10am-12pm, around $50" — searched in ${countryScope}`
                                                                : 'e.g. "Ankole Grill at 10am-12pm, around $50", or paste a Google Maps link'
                                                        }
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    {placeSmartLoading ? (
                                                                        <CircularProgress
                                                                            size={16}
                                                                            className="flight-smart-entry-input-icon"
                                                                        />
                                                                    ) : (
                                                                        <AutoAwesomeRoundedIcon className="flight-smart-entry-input-icon" />
                                                                    )}
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </div>
                                                <div className="flight-smart-entry-hint">
                                                    <span>
                                                        {placeSmartLoading
                                                            ? 'Looking up the place…'
                                                            : countryScope
                                                              ? `Type a place, sentence, or paste a Google Maps / Yelp link. We'll search ${countryScope} and fill in the details below.`
                                                              : "Type a place, sentence, or paste a Google Maps / Yelp link. We'll search and fill in the details below."}
                                                    </span>
                                                </div>
                                                {placeSmartWarning && (
                                                    <div className="flight-smart-entry-warning">
                                                        {placeSmartWarning}
                                                    </div>
                                                )}
                                            </div>
                                            <PlaceSmartEntryWatcher
                                                rawInput={placeSmartEntry}
                                                // Bias just to the trip country, not the
                                                // per-day pickSmartEntryLocation context.
                                                // Place activities are often tourist
                                                // destinations hours from the user's
                                                // current hotel — biasing to "Quepos,
                                                // Costa Rica" while searching "san blas"
                                                // for a Panama trip made the recommender
                                                // return malformed unrelated matches.
                                                // Hotel form below keeps the tighter
                                                // bias since hotel searches really are
                                                // local.
                                                country={countryScope}
                                                onResult={(item: PlaceRecommendation, parsed, extras) => {
                                                    // Two failure modes get a
                                                    // friendly "add manually"
                                                    // message instead of
                                                    // silently populating
                                                    // wrong/empty data:
                                                    //
                                                    // 1) Wrong country. Famous
                                                    //    landmarks (Mount Fuji,
                                                    //    Eiffel Tower) leak
                                                    //    through the country
                                                    //    bias and would write
                                                    //    foreign coords /
                                                    //    place_key / image
                                                    //    into a Panama trip.
                                                    // 2) Bare synthetic — the
                                                    //    PlaceSmartEntryWatcher
                                                    //    fell back to a stub
                                                    //    when no recommender,
                                                    //    Google Places, OR
                                                    //    photo match landed
                                                    //    (lat/lng null AND no
                                                    //    formatted address).
                                                    //    Populating the name
                                                    //    is fine but we should
                                                    //    tell the user we
                                                    //    couldn't enrich it.
                                                    //
                                                    // User can prefix with `#`
                                                    // to force-keep the typed
                                                    // name as a free-text
                                                    // reminder.
                                                    const isWrongCountry =
                                                        Boolean(countryScope) &&
                                                        !sameCountry(countryScope, item.country);
                                                    const isBareMatch =
                                                        item.latitude == null &&
                                                        item.longitude == null &&
                                                        !extras?.formattedAddress?.trim();
                                                    if (isWrongCountry) {
                                                        setPlaceSmartWarning(
                                                            `Couldn't find “${item.name}” in ${countryScope}` +
                                                                (item.country
                                                                    ? ` — closest match is in ${item.country}.`
                                                                    : '.') +
                                                                ` Add it manually using the details form below, or prefix the search with # to keep this exact name.`,
                                                        );
                                                        return;
                                                    }
                                                    if (isBareMatch) {
                                                        setPlaceSmartWarning(
                                                            `Couldn't find an exact match for “${item.name}”. Fill in the location / cost / time using the form below.`,
                                                        );
                                                        // Populate name only — leave city /
                                                        // country / coords blank so we don't
                                                        // ship bogus place_key data on save.
                                                        handleOnChange('name', item.name);
                                                        if (parsed.startTime) {
                                                            handleOnChange('startTime', parsed.startTime);
                                                        }
                                                        if (parsed.endTime) {
                                                            handleOnChange('endTime', parsed.endTime);
                                                        }
                                                        if (parsed.cost != null) {
                                                            handleOnChange('cost', String(parsed.cost));
                                                        }
                                                        setPlaceDetailsExpanded(true);
                                                        return;
                                                    }
                                                    setPlaceSmartWarning(null);
                                                    handlePlacePicked({
                                                        name: item.name,
                                                        // Prefer Google's
                                                        // formatted street
                                                        // address over the
                                                        // recommender's
                                                        // "City, Country"
                                                        // string when Google
                                                        // found a match.
                                                        location:
                                                            extras?.formattedAddress?.trim() ||
                                                            [item.city, item.country]
                                                                .filter((s) => s && s.trim())
                                                                .join(', '),
                                                        city: item.city,
                                                        country: item.country,
                                                        countryCode: item.countryCode,
                                                        imageUrl: item.imageUrl,
                                                        latitude: item.latitude,
                                                        longitude: item.longitude,
                                                    });
                                                    // Apply any times / cost the
                                                    // user typed in the same
                                                    // sentence. handlePlacePicked
                                                    // only fills name + location
                                                    // + image; these other fields
                                                    // are independent so we set
                                                    // them through the standard
                                                    // form handler.
                                                    if (parsed.startTime) {
                                                        handleOnChange('startTime', parsed.startTime);
                                                    }
                                                    if (parsed.endTime) {
                                                        handleOnChange('endTime', parsed.endTime);
                                                    }
                                                    if (parsed.cost != null) {
                                                        handleOnChange('cost', String(parsed.cost));
                                                    }
                                                    // Open the collapsed
                                                    // details panel any time
                                                    // the smart entry lands a
                                                    // result. handlePlacePicked
                                                    // above writes name /
                                                    // location / image into
                                                    // fields that live inside
                                                    // this panel, so leaving
                                                    // it collapsed means the
                                                    // user types something,
                                                    // the search succeeds,
                                                    // and they see no visible
                                                    // change — looks broken.
                                                    setPlaceDetailsExpanded(true);
                                                }}
                                                onLoadingChange={setPlaceSmartLoading}
                                                onWarning={setPlaceSmartWarning}
                                            />
                                        </Grid>
                                    )}
                                    {/* Name + location → image fields are hidden
                                        by default during ADD — the smart entry
                                        above usually fills them in. User clicks
                                        "Show details" to verify or tweak. On
                                        EDIT we skip the toggle entirely and
                                        show the form fields open: the user
                                        opened the modal specifically to change
                                        something, so hiding the inputs adds an
                                        extra click. */}
                                    {isAdd && (
                                        <Grid item lg={12} xs={12} className="py-1">
                                            <button
                                                type="button"
                                                className="flight-segment-toggle"
                                                onClick={() =>
                                                    setPlaceDetailsExpanded((v) => !v)
                                                }
                                                aria-expanded={placeDetailsExpanded}
                                            >
                                                {placeDetailsExpanded ? (
                                                    <>
                                                        Hide details
                                                        <ExpandLessRoundedIcon fontSize="small" />
                                                    </>
                                                ) : (
                                                    <>
                                                        Show details (name, location, cost, time, note, image)
                                                        <ExpandMoreRoundedIcon fontSize="small" />
                                                    </>
                                                )}
                                            </button>
                                        </Grid>
                                    )}
                                    {(placeDetailsExpanded || !isAdd) && (
                                    <>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <PlaceAutocomplete
                                            value={place.name ?? ''}
                                            onTextChange={(text) =>
                                                handleOnChange('name', text)
                                            }
                                            onSelect={handlePlacePicked}
                                            country={countryScope}
                                            label={
                                                countryScope
                                                    ? `Activity name (or place in ${countryScope})`
                                                    : 'Activity name'
                                            }
                                            placeholder="Type a place to get AI suggestions, or any activity (e.g. 'Check out of hotel')"
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.location ?? ''}
                                            name="location"
                                            label="Location (optional)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('location', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.cost ? String(place.cost) : ''}
                                            name="cost"
                                            onChange={(e) => handleOnChange('cost', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5">
                                        <InputField
                                            value={place.startTime ?? ''}
                                            name="startTime"
                                            type="time"
                                            label="Start Time"
                                            onChange={(e) => handleOnChange('startTime', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                        <InputField
                                            value={place.endTime ?? ''}
                                            name="endTime"
                                            type="time"
                                            label="End Time"
                                            onChange={(e) => handleOnChange('endTime', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.note ?? ''}
                                            name="note"
                                            onChange={(e) => handleOnChange('note', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        {/* Show the current image when set
                                            — covers both file uploads and
                                            smart-entry URL hits. Without
                                            this, the file input shows
                                            nothing for URL-sourced images
                                            and users think the smart entry
                                            never set one. */}
                                        {place.image?.url && (
                                            <div className="place-image-preview">
                                                <img
                                                    src={place.image.url}
                                                    alt={place.image.name ?? place.name ?? 'Activity image'}
                                                />
                                                <button
                                                    type="button"
                                                    className="place-image-preview-clear"
                                                    onClick={() => handleOnChange('image', undefined as unknown as ImageRef)}
                                                    aria-label="Remove image"
                                                >
                                                    <CloseRoundedIcon fontSize="small" />
                                                </button>
                                            </div>
                                        )}
                                        <InputField
                                            type="file"
                                            label="image"
                                            name="image"
                                            onChange={handleImageChange}
                                        />
                                    </Grid>
                                    </>
                                    )}
                                </Grid>
                            )}

                            {place.kind === ACTIVITY_KIND.NOTE && (
                                <Grid container>
                                    {/* Notes are free-form text only — no
                                        separate title. The first line of the
                                        note doubles as the headline on the
                                        timeline card (handleSubmit fills
                                        place.name from the note if name is
                                        empty). Using a multiline TextField
                                        instead of the standard InputField so
                                        users can write paragraphs without the
                                        textbox feeling cramped. */}
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <TextField
                                            fullWidth
                                            multiline
                                            minRows={4}
                                            maxRows={12}
                                            variant="outlined"
                                            value={place.note ?? ''}
                                            name="note"
                                            label="Note"
                                            placeholder="Jot down anything — reminders, ideas, links, packing checklist…"
                                            onChange={(e) =>
                                                handleOnChange('note', e.target.value)
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            {place.kind === ACTIVITY_KIND.FLIGHT && (
                                <Grid container>
                                    {/* Smart entry — natural-language shortcut.
                                        Sits above the segments list so users can
                                        type "UA123 tomorrow" or "UA123 today
                                        stopover BA245" and the parser builds /
                                        populates the segment rows. Moved above
                                        the Flight-name field because the smart
                                        entry now auto-derives a name from the
                                        route, so most users never need to fill
                                        the name field at all. The segment
                                        fields below stay plain (no per-field
                                        parser) — this is the only place that
                                        accepts free-form input. AI-flavored
                                        styling (gradient border + sparkle
                                        adornment) signals it's not a regular
                                        form field. */}
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <div className="flight-smart-entry">
                                            <div className="flight-smart-entry-field">
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    minRows={1}
                                                    maxRows={3}
                                                    variant="outlined"
                                                    value={smartEntry}
                                                    onChange={(e) =>
                                                        handleSmartEntry(e.target.value)
                                                    }
                                                    placeholder='Try: "UA123 tomorrow" or "UA123 today stopover BA245"'
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <AutoAwesomeRoundedIcon className="flight-smart-entry-input-icon" />
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            </div>
                                            <div className="flight-smart-entry-hint">
                                                <span>
                                                    Type your flight(s) here and
                                                    we&rsquo;ll auto-create the
                                                    segments below. Or expand a
                                                    segment and fill it in
                                                    manually.
                                                </span>
                                            </div>
                                        </div>
                                    </Grid>
                                    {(place.flightSegments ?? [emptySegment(isoDefaultDate)]).map(
                                        (segment, segIdx, allSegs) => (
                                            <Grid
                                                key={segIdx}
                                                item
                                                lg={12}
                                                xs={12}
                                                className="flight-segment-block"
                                            >
                                                <div className="flight-segment-header">
                                                    <button
                                                        type="button"
                                                        className="flight-segment-open-toggle"
                                                        onClick={() =>
                                                            toggleSegmentOpen(segIdx)
                                                        }
                                                        aria-expanded={openSegments.has(segIdx)}
                                                    >
                                                        {openSegments.has(segIdx) ? (
                                                            <ExpandLessRoundedIcon fontSize="small" />
                                                        ) : (
                                                            <ExpandMoreRoundedIcon fontSize="small" />
                                                        )}
                                                        <span className="flight-segment-label">
                                                            {`Segment ${segIdx + 1}`}
                                                            {segment.flightNumber?.trim() && (
                                                                <span className="flight-segment-label-sub">
                                                                    {' · '}
                                                                    {segment.flightNumber.trim().toUpperCase()}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                    {allSegs.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="flight-segment-remove"
                                                            onClick={() =>
                                                                handleRemoveSegment(segIdx)
                                                            }
                                                            aria-label={`Remove segment ${segIdx + 1}`}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Auto-populates this segment's airports +
                                                    times when the user types a real flight
                                                    number and a depart date. Silent on
                                                    failure (no match / no API key) — the
                                                    user's typed values stay untouched. The
                                                    watcher stays mounted across collapse so
                                                    the lookup completes even if the user
                                                    closes the segment mid-fetch. */}
                                                <FlightSegmentLookupWatcher
                                                    flightNumber={segment.flightNumber}
                                                    departDate={segment.departDate}
                                                    onResult={(result) => {
                                                        applyFlightLookup(segIdx, result);
                                                        // Successful lookup clears any
                                                        // stale "not found" hint that
                                                        // a prior typo had set.
                                                        setLookupNotFound((prev) => {
                                                            if (!(segIdx in prev)) return prev;
                                                            const next = { ...prev };
                                                            delete next[segIdx];
                                                            return next;
                                                        });
                                                    }}
                                                    onLoadingChange={(loading) =>
                                                        handleLookupLoadingChange(segIdx, loading)
                                                    }
                                                    onNotFound={(num) =>
                                                        setLookupNotFound((prev) => ({
                                                            ...prev,
                                                            [segIdx]: num,
                                                        }))
                                                    }
                                                />
                                                {openSegments.has(segIdx) && (
                                                <Grid container>
                                                    <Grid item lg={12} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.flightNumber ?? ''}
                                                            name={`flightNumber-${segIdx}`}
                                                            label="Flight number"
                                                            placeholder="e.g. UA123"
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'flightNumber',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    {/* Hint + lookup spinner — explains why the
                                                        airport / date / time fields stay hidden
                                                        until the user expands them. Spinner shows
                                                        while AeroDataBox is queried. The
                                                        not-found nudge below replaces the generic
                                                        hint when a lookup settled empty so the
                                                        user knows to fill in the segment by hand. */}
                                                    <Grid item lg={12} xs={12} className="py-1">
                                                        <div className="flight-segment-hint">
                                                            {lookupLoading.has(segIdx) ? (
                                                                <CircularProgress
                                                                    size={14}
                                                                    className="flight-segment-hint-spinner"
                                                                />
                                                            ) : (
                                                                <AutoAwesomeRoundedIcon
                                                                    fontSize="small"
                                                                    className="flight-segment-hint-icon"
                                                                />
                                                            )}
                                                            <span className="flight-segment-hint-text">
                                                                {lookupLoading.has(segIdx)
                                                                    ? 'Looking up flight details…'
                                                                    : lookupNotFound[segIdx]
                                                                      ? `Couldn't find flight ${lookupNotFound[segIdx]}. Fill in the airport, date, and time below manually.`
                                                                      : "We'll auto-fill the airport, date, and time once you enter a flight number."}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="flight-segment-toggle"
                                                                onClick={() =>
                                                                    toggleSegmentExpanded(segIdx)
                                                                }
                                                                aria-expanded={expandedSegments.has(segIdx)}
                                                            >
                                                                {expandedSegments.has(segIdx) ? (
                                                                    <>
                                                                        Hide details
                                                                        <ExpandLessRoundedIcon fontSize="small" />
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        Show details
                                                                        <ExpandMoreRoundedIcon fontSize="small" />
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </Grid>
                                                    {expandedSegments.has(segIdx) && (
                                                    <>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <AirportAutocomplete
                                                            value={segment.departAirport ?? ''}
                                                            onChange={(code) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'departAirport',
                                                                    code
                                                                )
                                                            }
                                                            label="Depart airport"
                                                            placeholder="IATA code, city, or airport"
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <AirportAutocomplete
                                                            value={segment.arrivalAirport ?? ''}
                                                            onChange={(code) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'arrivalAirport',
                                                                    code
                                                                )
                                                            }
                                                            onSelectMeta={(opt) => {
                                                                // Only the LAST segment's
                                                                // arrival airport drives the
                                                                // flight image — that's the
                                                                // final destination.
                                                                const segs =
                                                                    place.flightSegments ?? [];
                                                                if (segIdx === segs.length - 1) {
                                                                    setArrivalCity(opt.city);
                                                                }
                                                            }}
                                                            label="Arrival airport"
                                                            placeholder="IATA code, city, or airport"
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.departDate ?? ''}
                                                            name={`departDate-${segIdx}`}
                                                            type="date"
                                                            label="Depart date"
                                                            labelOnTop
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'departDate',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.departTime ?? ''}
                                                            name={`departTime-${segIdx}`}
                                                            type="time"
                                                            label="Depart time"
                                                            labelOnTop
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'departTime',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.arrivalDate ?? ''}
                                                            name={`arrivalDate-${segIdx}`}
                                                            type="date"
                                                            label="Arrival date"
                                                            labelOnTop
                                                            minDate={segment.departDate || undefined}
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'arrivalDate',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.arrivalTime ?? ''}
                                                            name={`arrivalTime-${segIdx}`}
                                                            type="time"
                                                            label="Arrival time"
                                                            labelOnTop
                                                            onChange={(e) =>
                                                                handleSegmentField(
                                                                    segIdx,
                                                                    'arrivalTime',
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    </>
                                                    )}
                                                </Grid>
                                                )}
                                            </Grid>
                                        )
                                    )}
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <button
                                            type="button"
                                            className="flight-segment-add"
                                            onClick={handleAddSegment}
                                        >
                                            + Add segment (stopover)
                                        </button>
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            defaultValue={place.cost ? String(place.cost) : ''}
                                            name="cost"
                                            label="Cost (optional)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('cost', e.target.value)
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            )}

                            {(place.kind === ACTIVITY_KIND.HOTEL_CHECKIN ||
                                place.kind === ACTIVITY_KIND.HOTEL_CHECKOUT) && (
                                <Grid container>
                                    {/* In-form side toggle — picks whether
                                        this activity represents the
                                        check-in or the check-out event.
                                        Persists as ACTIVITY_KIND.HOTEL_CHECKIN
                                        or HOTEL_CHECKOUT so the timeline
                                        keeps two distinct icons + time
                                        labels. Hidden on EDIT to keep the
                                        kind-locked-at-create-time contract;
                                        editing a hotel event preserves its
                                        existing side. */}
                                    {isAdd && (
                                        <Grid
                                            item
                                            lg={12}
                                            xs={12}
                                            className="pt-5 pb-0"
                                        >
                                            <div
                                                className={classNames(
                                                    'hotel-side-toggle',
                                                    `is-${place.kind === ACTIVITY_KIND.HOTEL_CHECKOUT ? 'checkout' : 'checkin'}`,
                                                )}
                                                role="tablist"
                                                aria-label="Hotel event side"
                                            >
                                                <span
                                                    className="hotel-side-thumb"
                                                    aria-hidden="true"
                                                />
                                                {[
                                                    {
                                                        value: ACTIVITY_KIND.HOTEL_CHECKIN,
                                                        label: 'Check-in',
                                                        Icon: LoginRoundedIcon,
                                                    },
                                                    {
                                                        value: ACTIVITY_KIND.HOTEL_CHECKOUT,
                                                        label: 'Check-out',
                                                        Icon: LogoutRoundedIcon,
                                                    },
                                                ].map(({ value, label, Icon }) => {
                                                    const active = place.kind === value;
                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={active}
                                                            className={classNames(
                                                                'hotel-side-btn',
                                                                { selected: active },
                                                            )}
                                                            onClick={() =>
                                                                // Switch the
                                                                // saved kind
                                                                // without
                                                                // re-running
                                                                // handleKindChange's
                                                                // full reset —
                                                                // the form
                                                                // fields are
                                                                // identical for
                                                                // both sides.
                                                                setPlace((prev) => ({
                                                                    ...prev,
                                                                    kind: value,
                                                                }))
                                                            }
                                                        >
                                                            <Icon
                                                                className="hotel-side-icon"
                                                                fontSize="small"
                                                            />
                                                            <span>{label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Grid>
                                    )}
                                    {isAdd && countryScope && (
                                        <Grid item lg={12} xs={12} className="pt-8 pb-5">
                                            <PlaceSuggestions
                                                country={countryScope}
                                                city={cityScope}
                                                topic="top hotels"
                                                headingPrefix="Suggested hotels in"
                                                onPick={handlePlacePicked}
                                            />
                                        </Grid>
                                    )}
                                    {/* Smart entry — natural language /
                                        Google Maps link → search →
                                        populate hotel name + address +
                                        image in one shot. Same shape as
                                        the PLACE smart entry. */}
                                    {isAdd && (
                                        <Grid item lg={12} xs={12} className="py-5">
                                            <div className="flight-smart-entry">
                                                <div className="flight-smart-entry-field">
                                                    <TextField
                                                        fullWidth
                                                        variant="outlined"
                                                        value={hotelSmartEntry}
                                                        onChange={(e) =>
                                                            setHotelSmartEntry(e.target.value)
                                                        }
                                                        placeholder={
                                                            countryScope
                                                                ? `e.g. "Hilton Tokyo, check-in 3pm, $200" — searched in ${countryScope}`
                                                                : 'e.g. "Hilton Tokyo, check-in 3pm, $200", or paste a Google Maps link'
                                                        }
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    {hotelSmartLoading ? (
                                                                        <CircularProgress
                                                                            size={16}
                                                                            className="flight-smart-entry-input-icon"
                                                                        />
                                                                    ) : (
                                                                        <AutoAwesomeRoundedIcon className="flight-smart-entry-input-icon" />
                                                                    )}
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </div>
                                                <div className="flight-smart-entry-hint">
                                                    <span>
                                                        {hotelSmartLoading
                                                            ? 'Looking up the hotel…'
                                                            : countryScope
                                                              ? `Type a hotel, sentence, or paste a Google Maps / Yelp link. We'll search ${countryScope} and fill in the details below.`
                                                              : "Type a hotel, sentence, or paste a Google Maps / Yelp link. We'll search and fill in the details below."}
                                                    </span>
                                                </div>
                                                {hotelSmartWarning && (
                                                    <div className="flight-smart-entry-warning">
                                                        {hotelSmartWarning}
                                                    </div>
                                                )}
                                            </div>
                                            <PlaceSmartEntryWatcher
                                                rawInput={hotelSmartEntry}
                                                country={smartEntryLocation ?? countryScope}
                                                onResult={(item: PlaceRecommendation, parsed, extras) => {
                                                    // Same two-failure handling as the
                                                    // PLACE smart entry above — wrong-
                                                    // country and bare-match get a clear
                                                    // "add manually below" message instead
                                                    // of silently populating bogus data.
                                                    const isWrongCountry =
                                                        Boolean(countryScope) &&
                                                        !sameCountry(countryScope, item.country);
                                                    const isBareMatch =
                                                        item.latitude == null &&
                                                        item.longitude == null &&
                                                        !extras?.formattedAddress?.trim();
                                                    if (isWrongCountry) {
                                                        setHotelSmartWarning(
                                                            `Couldn't find “${item.name}” in ${countryScope}` +
                                                                (item.country
                                                                    ? ` — closest match is in ${item.country}.`
                                                                    : '.') +
                                                                ` Add it manually using the details form below, or prefix the search with # to keep this exact name.`,
                                                        );
                                                        return;
                                                    }
                                                    if (isBareMatch) {
                                                        setHotelSmartWarning(
                                                            `Couldn't find an exact match for “${item.name}”. Fill in the address / cost / time using the form below.`,
                                                        );
                                                        handleOnChange('name', item.name);
                                                        if (parsed.startTime) {
                                                            handleOnChange('startTime', parsed.startTime);
                                                        }
                                                        if (parsed.cost != null) {
                                                            handleOnChange('cost', String(parsed.cost));
                                                        }
                                                        if (parsed.confirmationNumber) {
                                                            handleOnChange(
                                                                'confirmationNumber',
                                                                parsed.confirmationNumber,
                                                            );
                                                        }
                                                        setHotelDetailsExpanded(true);
                                                        return;
                                                    }
                                                    setHotelSmartWarning(null);
                                                    handlePlacePicked({
                                                        name: item.name,
                                                        // Prefer Google's
                                                        // formatted street
                                                        // address over the
                                                        // recommender's
                                                        // "City, Country"
                                                        // string when Google
                                                        // found a match.
                                                        location:
                                                            extras?.formattedAddress?.trim() ||
                                                            [item.city, item.country]
                                                                .filter((s) => s && s.trim())
                                                                .join(', '),
                                                        city: item.city,
                                                        country: item.country,
                                                        countryCode: item.countryCode,
                                                        imageUrl: item.imageUrl,
                                                        latitude: item.latitude,
                                                        longitude: item.longitude,
                                                    });
                                                    if (parsed.startTime) {
                                                        handleOnChange('startTime', parsed.startTime);
                                                    }
                                                    if (parsed.cost != null) {
                                                        handleOnChange('cost', String(parsed.cost));
                                                    }
                                                    if (parsed.confirmationNumber) {
                                                        handleOnChange(
                                                            'confirmationNumber',
                                                            parsed.confirmationNumber,
                                                        );
                                                    }
                                                    // Capture a separate
                                                    // HOTEL_CHECKOUT to spawn
                                                    // alongside the primary
                                                    // CHECKIN once the user
                                                    // clicks Save. Cleared
                                                    // when the smart entry no
                                                    // longer mentions check-
                                                    // out (so editing the
                                                    // input clears a stale
                                                    // pending checkout).
                                                    if (parsed.checkOutTime) {
                                                        setPendingHotelCheckout({
                                                            startTime: parsed.checkOutTime,
                                                            date: parsed.checkOutDate,
                                                        });
                                                    } else {
                                                        setPendingHotelCheckout(null);
                                                    }
                                                    // Auto-expand the hotel
                                                    // details block when the
                                                    // smart entry actually
                                                    // populated time / cost /
                                                    // confirmation — otherwise
                                                    // the user can't see what
                                                    // we just filled in.
                                                    if (
                                                        parsed.startTime ||
                                                        parsed.cost != null ||
                                                        parsed.confirmationNumber
                                                    ) {
                                                        setHotelDetailsExpanded(true);
                                                    }
                                                }}
                                                onLoadingChange={setHotelSmartLoading}
                                                onWarning={setHotelSmartWarning}
                                            />
                                        </Grid>
                                    )}
                                    {/* Name + address → notes hidden by default.
                                        Smart entry above usually fills the
                                        name + address + time + cost; user
                                        expands to verify or tweak. */}
                                    <Grid item lg={12} xs={12} className="py-1">
                                        <button
                                            type="button"
                                            className="flight-segment-toggle"
                                            onClick={() =>
                                                setHotelDetailsExpanded((v) => !v)
                                            }
                                            aria-expanded={hotelDetailsExpanded}
                                        >
                                            {hotelDetailsExpanded ? (
                                                <>
                                                    Hide details
                                                    <ExpandLessRoundedIcon fontSize="small" />
                                                </>
                                            ) : (
                                                <>
                                                    Show details (name, address, time, confirmation, cost, notes)
                                                    <ExpandMoreRoundedIcon fontSize="small" />
                                                </>
                                            )}
                                        </button>
                                    </Grid>
                                    {hotelDetailsExpanded && (
                                    <>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <PlaceAutocomplete
                                            value={place.name ?? ''}
                                            onTextChange={(text) =>
                                                handleOnChange('name', text)
                                            }
                                            onSelect={handlePlacePicked}
                                            country={countryScope}
                                            queryPrefix="hotel"
                                            label={
                                                countryScope
                                                    ? `Hotel name (or search in ${countryScope})`
                                                    : 'Hotel name'
                                            }
                                            placeholder="Type a hotel name — we'll suggest matches"
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.location ?? ''}
                                            name="location"
                                            label="Address (optional)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('location', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.startTime ?? ''}
                                            name="startTime"
                                            type="time"
                                            label={
                                                place.kind ===
                                                ACTIVITY_KIND.HOTEL_CHECKIN
                                                    ? 'Check-in time'
                                                    : 'Check-out time'
                                            }
                                            labelOnTop
                                            onChange={(e) =>
                                                handleOnChange('startTime', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.confirmationNumber ?? ''}
                                            name="confirmationNumber"
                                            label="Confirmation # (optional)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange(
                                                    'confirmationNumber',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.cost ? String(place.cost) : ''}
                                            name="cost"
                                            label={
                                                place.kind ===
                                                ACTIVITY_KIND.HOTEL_CHECKIN
                                                    ? 'Cost (optional — total stay)'
                                                    : 'Cost (optional)'
                                            }
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('cost', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <InputField
                                            value={place.note ?? ''}
                                            name="note"
                                            label="Notes (optional)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('note', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    </>
                                    )}
                                </Grid>
                            )}

                            {(place.kind === ACTIVITY_KIND.TRAIN ||
                                place.kind === ACTIVITY_KIND.BUS ||
                                place.kind === ACTIVITY_KIND.RENTAL_CAR) && (
                                <Grid container>
                                    {/* In-form mode toggle — picks
                                        Train, Bus, or Rental car. Same
                                        sliding-thumb treatment as the
                                        hotel side toggle above;
                                        persists as ACTIVITY_KIND.TRAIN /
                                        BUS / RENTAL_CAR so the timeline
                                        icon + labels stay accurate.
                                        Hidden on EDIT to match the rest
                                        of the modal's "kind locks at
                                        create time" contract. */}
                                    {isAdd && (
                                        <Grid
                                            item
                                            lg={12}
                                            xs={12}
                                            className="pt-5 pb-0"
                                        >
                                            <div
                                                className={classNames(
                                                    'hotel-side-toggle',
                                                    'is-three',
                                                    `is-${
                                                        place.kind === ACTIVITY_KIND.BUS
                                                            ? 'bus'
                                                            : place.kind === ACTIVITY_KIND.RENTAL_CAR
                                                              ? 'rental-car'
                                                              : 'train'
                                                    }`,
                                                )}
                                                role="tablist"
                                                aria-label="Ground transport mode"
                                            >
                                                <span
                                                    className="hotel-side-thumb"
                                                    aria-hidden="true"
                                                />
                                                {[
                                                    {
                                                        value: ACTIVITY_KIND.TRAIN,
                                                        label: 'Train',
                                                        Icon: DirectionsTransitRoundedIcon,
                                                    },
                                                    {
                                                        value: ACTIVITY_KIND.BUS,
                                                        label: 'Bus',
                                                        Icon: DirectionsBusRoundedIcon,
                                                    },
                                                    {
                                                        value: ACTIVITY_KIND.RENTAL_CAR,
                                                        label: 'Rental car',
                                                        Icon: CarRentalRoundedIcon,
                                                    },
                                                ].map(({ value, label, Icon }) => {
                                                    const active = place.kind === value;
                                                    return (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={active}
                                                            className={classNames(
                                                                'hotel-side-btn',
                                                                { selected: active },
                                                            )}
                                                            onClick={() =>
                                                                // Switch
                                                                // the saved
                                                                // kind. Both
                                                                // sides share
                                                                // identical
                                                                // form fields
                                                                // (operator,
                                                                // number,
                                                                // stations,
                                                                // times,
                                                                // class/seat,
                                                                // cost) so no
                                                                // reset
                                                                // needed —
                                                                // just flip
                                                                // the kind
                                                                // and the
                                                                // labels
                                                                // adapt.
                                                                setPlace((prev) => ({
                                                                    ...prev,
                                                                    kind: value,
                                                                }))
                                                            }
                                                        >
                                                            <Icon
                                                                className="hotel-side-icon"
                                                                fontSize="small"
                                                            />
                                                            <span>{label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </Grid>
                                    )}
                                    {/* Smart entry — natural language →
                                        fills depart/arrival station + times
                                        + cost on the first segment in one
                                        shot. Synchronous parser, no backend
                                        call (transit doesn't have an AI
                                        recommender). Always visible; the
                                        per-segment fields below stay hidden
                                        behind Show details to keep the form
                                        compact for the common case. */}
                                    {isAdd && (
                                        <Grid item lg={12} xs={12} className="py-5">
                                            <div className="flight-smart-entry">
                                                <div className="flight-smart-entry-field">
                                                    <TextField
                                                        fullWidth
                                                        variant="outlined"
                                                        value={transitSmartEntry}
                                                        onChange={(e) =>
                                                            setTransitSmartEntry(e.target.value)
                                                        }
                                                        placeholder={
                                                            place.kind === ACTIVITY_KIND.RENTAL_CAR
                                                                ? 'e.g. "Hertz pickup JFK 10am $50"'
                                                                : 'e.g. "Tokyo to Kyoto 9am-12pm $100"'
                                                        }
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <AutoAwesomeRoundedIcon className="flight-smart-entry-input-icon" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </div>
                                                <div className="flight-smart-entry-hint">
                                                    <span>
                                                        Type stations, times, and cost — we&rsquo;ll fill the details below.
                                                    </span>
                                                </div>
                                                {transitSmartWarning && (
                                                    <div className="flight-smart-entry-warning">
                                                        {transitSmartWarning}
                                                    </div>
                                                )}
                                            </div>
                                        </Grid>
                                    )}
                                    {/* Show details toggle — collapses the
                                        whole per-segment form (trip name,
                                        legs, times, cost) so the smart entry
                                        alone is enough for the common single-
                                        leg case. Auto-expands once the smart
                                        entry resolves anything. */}
                                    <Grid item lg={12} xs={12} className="py-1">
                                        <button
                                            type="button"
                                            className="flight-segment-toggle"
                                            onClick={() =>
                                                setTransitDetailsExpanded((v) => !v)
                                            }
                                            aria-expanded={transitDetailsExpanded}
                                        >
                                            {transitDetailsExpanded ? (
                                                <>
                                                    <ExpandLessRoundedIcon fontSize="small" />
                                                    Hide details
                                                </>
                                            ) : (
                                                <>
                                                    <ExpandMoreRoundedIcon fontSize="small" />
                                                    Show details (trip name, segments, times, cost)
                                                </>
                                            )}
                                        </button>
                                    </Grid>
                                    {transitDetailsExpanded && (
                                    <>
                                    <Grid item lg={12} xs={12} className="pt-5 pb-5">
                                        <InputField
                                            value={place.name ?? ''}
                                            name="name"
                                            label="Trip name (optional — auto-fills from operator + number)"
                                            required={false}
                                            onChange={(e) =>
                                                handleOnChange('name', e.target.value)
                                            }
                                        />
                                    </Grid>
                                    {(place.transitSegments ?? [emptyTransitSegment(isoDefaultDate)]).map(
                                        (segment, segIdx, allSegs) => (
                                            <Grid
                                                key={segIdx}
                                                item
                                                lg={12}
                                                xs={12}
                                                className="flight-segment-block"
                                            >
                                                <div className="flight-segment-header">
                                                    <span className="flight-segment-label">
                                                        {allSegs.length > 1
                                                            ? `Leg ${segIdx + 1}`
                                                            : 'Trip details'}
                                                    </span>
                                                    {allSegs.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="flight-segment-remove"
                                                            onClick={() =>
                                                                handleRemoveTransitSegment(segIdx)
                                                            }
                                                            aria-label={`Remove leg ${segIdx + 1}`}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                {/* OpenAI-backed schedule lookup, train + bus
                                                    only. Rental cars carry private booking
                                                    codes that aren't schedule-lookupable, so
                                                    they're excluded — same reason
                                                    parseTransitEntry doesn't try to enrich
                                                    rental confirmations. Hint row below
                                                    surfaces loading / not-found state per
                                                    segment, mirroring the flight form. */}
                                                {(place.kind === ACTIVITY_KIND.TRAIN ||
                                                    place.kind === ACTIVITY_KIND.BUS) && (
                                                    <>
                                                        <TransitSegmentLookupWatcher
                                                            operator={segment.operator}
                                                            number={segment.number}
                                                            kind={
                                                                place.kind === ACTIVITY_KIND.TRAIN
                                                                    ? 'train'
                                                                    : 'bus'
                                                            }
                                                            departDate={segment.departDate}
                                                            country={countryScope}
                                                            onResult={(result) => {
                                                                applyTransitLookup(segIdx, result);
                                                                setTransitLookupNotFound((prev) => {
                                                                    if (!(segIdx in prev)) return prev;
                                                                    const next = { ...prev };
                                                                    delete next[segIdx];
                                                                    return next;
                                                                });
                                                            }}
                                                            onLoadingChange={(loading) =>
                                                                handleTransitLookupLoadingChange(
                                                                    segIdx,
                                                                    loading,
                                                                )
                                                            }
                                                            onNotFound={(label) =>
                                                                setTransitLookupNotFound((prev) => ({
                                                                    ...prev,
                                                                    [segIdx]: label,
                                                                }))
                                                            }
                                                        />
                                                        <div className="flight-segment-hint">
                                                            {transitLookupLoading.has(segIdx) ? (
                                                                <CircularProgress
                                                                    size={14}
                                                                    className="flight-segment-hint-spinner"
                                                                />
                                                            ) : (
                                                                <AutoAwesomeRoundedIcon
                                                                    fontSize="small"
                                                                    className="flight-segment-hint-icon"
                                                                />
                                                            )}
                                                            <span className="flight-segment-hint-text">
                                                                {transitLookupLoading.has(segIdx)
                                                                    ? 'Looking up schedule…'
                                                                    : transitLookupNotFound[segIdx]
                                                                      ? `Couldn't find ${transitLookupNotFound[segIdx]}. Fill in the stations, date, and time below manually.`
                                                                      : "Type the operator + number and we'll try to auto-fill the stations and times."}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                <Grid container>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.operator ?? ''}
                                                            name={`transitOperator-${segIdx}`}
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.TRAIN
                                                                    ? 'Operator (e.g. Renfe, JR)'
                                                                    : place.kind ===
                                                                        ACTIVITY_KIND.RENTAL_CAR
                                                                      ? 'Rental company (e.g. Hertz, Avis)'
                                                                      : 'Operator (e.g. FlixBus, Greyhound)'
                                                            }
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'operator',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.number ?? ''}
                                                            name={`transitNumber-${segIdx}`}
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.TRAIN
                                                                    ? 'Train number'
                                                                    : place.kind ===
                                                                        ACTIVITY_KIND.RENTAL_CAR
                                                                      ? 'Confirmation #'
                                                                      : 'Bus number / route'
                                                            }
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'number',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.departStation ?? ''}
                                                            name={`transitDepartStation-${segIdx}`}
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.RENTAL_CAR
                                                                    ? 'Pickup location'
                                                                    : 'Depart station'
                                                            }
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'departStation',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.arrivalStation ?? ''}
                                                            name={`transitArrivalStation-${segIdx}`}
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.RENTAL_CAR
                                                                    ? 'Dropoff location (optional)'
                                                                    : 'Arrival station (optional)'
                                                            }
                                                            required={false}
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'arrivalStation',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.departDate ?? ''}
                                                            name={`transitDepartDate-${segIdx}`}
                                                            type="date"
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.RENTAL_CAR
                                                                    ? 'Pickup date'
                                                                    : 'Depart date'
                                                            }
                                                            labelOnTop
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'departDate',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.departTime ?? ''}
                                                            name={`transitDepartTime-${segIdx}`}
                                                            type="time"
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.RENTAL_CAR
                                                                    ? 'Pickup time'
                                                                    : 'Depart time'
                                                            }
                                                            labelOnTop
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'departTime',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.arrivalDate ?? ''}
                                                            name={`transitArrivalDate-${segIdx}`}
                                                            type="date"
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.RENTAL_CAR
                                                                    ? 'Dropoff date (optional)'
                                                                    : 'Arrival date (optional)'
                                                            }
                                                            labelOnTop
                                                            required={false}
                                                            minDate={segment.departDate || undefined}
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'arrivalDate',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            value={segment.arrivalTime ?? ''}
                                                            name={`transitArrivalTime-${segIdx}`}
                                                            type="time"
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.RENTAL_CAR
                                                                    ? 'Dropoff time (optional)'
                                                                    : 'Arrival time (optional)'
                                                            }
                                                            labelOnTop
                                                            required={false}
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'arrivalTime',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5">
                                                        <InputField
                                                            value={segment.classOrSeat ?? ''}
                                                            name={`transitClassOrSeat-${segIdx}`}
                                                            label={
                                                                place.kind ===
                                                                ACTIVITY_KIND.TRAIN
                                                                    ? 'Class / seat (optional)'
                                                                    : place.kind ===
                                                                        ACTIVITY_KIND.RENTAL_CAR
                                                                      ? 'Car class (e.g. Compact, SUV) (optional)'
                                                                      : 'Seat (optional)'
                                                            }
                                                            required={false}
                                                            onChange={(e) =>
                                                                handleTransitField(
                                                                    segIdx,
                                                                    'classOrSeat',
                                                                    e.target.value,
                                                                )
                                                            }
                                                        />
                                                    </Grid>
                                                    <Grid item lg={6} xs={12} className="py-5 lg:pl-2">
                                                        <InputField
                                                            defaultValue={
                                                                segIdx === 0 && place.cost
                                                                    ? String(place.cost)
                                                                    : ''
                                                            }
                                                            name={`transitCost-${segIdx}`}
                                                            label="Cost (optional)"
                                                            required={false}
                                                            onChange={(e) =>
                                                                // Only the first segment's cost
                                                                // edits the top-level cost; later
                                                                // segments are display-only on the
                                                                // headline number. Keeps the
                                                                // existing Activity.cost contract
                                                                // intact (one number per activity).
                                                                segIdx === 0
                                                                    ? handleOnChange(
                                                                          'cost',
                                                                          e.target.value,
                                                                      )
                                                                    : undefined
                                                            }
                                                            disabled={segIdx !== 0}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        ),
                                    )}
                                    <Grid item lg={12} xs={12} className="py-5">
                                        <button
                                            type="button"
                                            className="flight-segment-add"
                                            onClick={handleAddTransitSegment}
                                        >
                                            {place.kind === ACTIVITY_KIND.RENTAL_CAR
                                                ? '+ Add stopover'
                                                : '+ Add leg (transfer)'}
                                        </button>
                                    </Grid>
                                    </>
                                    )}
                                </Grid>
                            )}
                        </Grid>
                        <Grid item lg={12} md={12} xs={12}>
                            <ButtonCustom
                                onClick={handleSubmit}
                                label={isAdd ? PLACE_LABEL.ADD : PLACE_LABEL.SAVE}
                                type={BUTTON_VARIANT.STANDARD}
                                capitalizeType="uppercase"
                            />
                        </Grid>
                    </Grid>
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
