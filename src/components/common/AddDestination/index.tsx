import { useState, useEffect, useMemo, useRef } from 'react';
import './index.scss';
import { formatDate, isValidDate, now } from 'utils';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import classNames from 'classnames';
import { ACTION, ACTIVITY_KIND, ADD_METHOD, BUTTON_VARIANT } from 'constants';
import type {
    ActivityKind,
    AddEditButtonProps,
    AddMethod,
    Country,
    Destination,
    FlightInfo,
    TransitInfo,
} from 'types';
import { parseFlightInfo } from 'components/common/AddPlaceBtn/parseFlightInfo';
import { parseTransitEntry } from 'components/common/AddPlaceBtn/parseTransitQuery';
import FlightDeparturesSearch from 'components/common/AddPlaceBtn/FlightDeparturesSearch';
import type { FlightDepartureOption } from 'api/flightDeparturesApi';
import { useNearestAirport } from 'api/hooks/useHomeDeparture';
import TypeStep, { LATER, type TypePick } from './TypeStep';
import MethodStep from './MethodStep';
import DescribeStep from './DescribeStep';
import TransportResolver from './TransportResolver';
import ConfirmStep from './ConfirmStep';
import type { CountrySource, TransportKind, TransportDraft } from './types';

// Detect the transport kind from a free-text smart entry. A destination
// defaults to FLIGHT (you fly to a country far more often than not) and
// only flips to train / bus / rental when the text says so explicitly.
const TRAIN_RE =
    /\b(train|rail|railway|renfe|amtrak|eurostar|sncf|trenitalia|shinkansen|ave|tgv|ice)\b/i;
const BUS_RE = /\b(bus|flixbus|greyhound|megabus|coach|ouibus)\b/i;
const RENTAL_RE =
    /\b(rental|car rental|rent a car|hertz|avis|enterprise|sixt|budget|alamo|thrifty)\b/i;

const detectTransportKind = (text: string): TransportKind => {
    if (TRAIN_RE.test(text)) return ACTIVITY_KIND.TRAIN;
    if (BUS_RE.test(text)) return ACTIVITY_KIND.BUS;
    if (RENTAL_RE.test(text)) return ACTIVITY_KIND.RENTAL_CAR;
    return ACTIVITY_KIND.FLIGHT;
};

const DESTINATION_LABEL = {
    ADD: 'Add Destination',
    EDIT: 'Edit',
    SAVE: 'Save Destination',
    CONTINUE: 'Continue',
    BACK: 'Back',
} as const;

export interface DestinationDraft {
    id?: number;
    country?: Country | null;
    /** The day the traveler arrives at this destination (its flight/transport
     *  arrival, or the trip default). Drives the destination's `startDate`; its
     *  `endDate` is derived from the next destination's start at render time. */
    startDate?: string;
    /** The destination's arrival FLIGHT, rendered as the destination header
     *  band (depart/arrive legs) — NOT as an itinerary activity. Carries the
     *  per-leg `segments` plus the flat headline fields synced from segment 0
     *  (flightNumber / depart+arrival airports / dates / times / cost) for
     *  callers that only read the headline. Ground transport (train / bus /
     *  rental) still seeds an itinerary activity instead. */
    flightInfo?: FlightInfo;
    itinerary?: Destination['itinerary'];
}

export interface AddDestinationBtnProps
    extends AddEditButtonProps<DestinationDraft, Destination> {
    defaultDate?: string;
    tripMinDate?: string | null;
    tripMaxDate?: string | null;
    /** Trigger-button label override for the ADD variant. The timeline uses
     *  "Add next destination" to make clear it's moving to the next place, not
     *  adding a per-day destination. Defaults to "Add Destination". */
    addButtonLabel?: string;
}

const WIZARD_STEP = { TYPE: 1, METHOD: 2, DESCRIBE: 3, CONFIRM: 4 } as const;
type WizardStep = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];

/** Methods offered per transport kind on the Method step. Flight gets the
 *  departures search ("Find my flight"); ground kinds get smart + custom
 *  only. SUGGESTIONS is place-only and never appears here. */
const methodsForKind = (kind: TransportKind): AddMethod[] =>
    kind === ACTIVITY_KIND.FLIGHT
        ? [ADD_METHOD.SMART, ADD_METHOD.SEARCH, ADD_METHOD.CUSTOM]
        : [ADD_METHOD.SMART, ADD_METHOD.CUSTOM];

/** Ground-transport kinds whose arrival rides on `dest.flightInfo` (tagged
 *  with `mode`) the same way a flight does. */
const GROUND_ARRIVAL_KINDS: ReadonlySet<ActivityKind> = new Set([
    ACTIVITY_KIND.TRAIN,
    ACTIVITY_KIND.BUS,
    ACTIVITY_KIND.RENTAL_CAR,
]);

const emptyFlightSegment = (date: string): FlightInfo => ({
    departDate: date,
    departTime: now('HH:mm'),
    arrivalDate: date,
    arrivalTime: now('HH:mm'),
});

const emptyTransitSegment = (date: string): TransitInfo => ({
    departDate: date,
    arrivalDate: date,
});

const emptyTransport = (): TransportDraft => ({
    kind: null,
    smartText: '',
    flightSegments: [],
    transitSegments: [],
    cost: '',
});

const AddDestinationBtn = ({
    defaultDate,
    tripMinDate,
    tripMaxDate,
    onChange,
    type = ACTION.ADD,
    data = null,
    buttonType = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
    addButtonLabel,
}: AddDestinationBtnProps) => {
    const isAdd = type === ACTION.ADD;
    const title = useMemo(
        () =>
            isAdd
                ? addButtonLabel ?? DESTINATION_LABEL.ADD
                : DESTINATION_LABEL.EDIT,
        [isAdd, addButtonLabel],
    );

    const modelRef = useRef<ModalButtonHandle>(null);

    const [step, setStep] = useState<WizardStep>(WIZARD_STEP.TYPE);
    const [country, setCountry] = useState<Country | null>(null);
    // How `country` was set, so TransportResolver can prefer the authoritative
    // source: a flight's arrival airport overrides a fuzzy text guess, but
    // neither overrides an explicit user pick (or the saved edit country). A
    // ref (not state) — it's read during render alongside the country it
    // describes and never needs to drive a render on its own.
    const countrySourceRef = useRef<CountrySource>(null);
    const applyCountry = (next: Country | null, source: CountrySource) => {
        countrySourceRef.current = next ? source : null;
        setCountry(next);
    };
    const [transport, setTransport] = useState<TransportDraft>(emptyTransport);
    // Which add-method the user picked on the Method step. Drives the Describe
    // input (SMART = smart box, CUSTOM = fields open, SEARCH = flight search)
    // and the Back target. Null until a tile + method are chosen (or the smart-
    // box shortcut / "I'll add later" path, which skip the Method step).
    const [method, setMethod] = useState<AddMethod | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Seed the flight-departures search's From-airport with the user's home
    // airport (a flight to the destination departs from home).
    const { data: nearestAirport } = useNearestAirport();
    // Per-segment "couldn't find this flight/route" hints. Lifted here (from
    // DescribeStep) because the always-mounted TransportResolver writes them
    // and DescribeStep — unmounted on the Confirm step — reads them.
    const [lookupNotFound, setLookupNotFound] = useState<
        Record<number, string>
    >({});
    // True once the user explicitly picked "I'll add later" (kind stays null,
    // but distinct from the initial unset state — used to highlight that tile
    // and to allow the Describe step's destination-only entry).
    const [chooseLater, setChooseLater] = useState(false);

    // Normalize whatever date format comes in (MM/DD/YYYY from
    // DestinationDetail or YYYY-MM-DD from raw state) into ISO YYYY-MM-DD.
    const isoDate = (raw?: string | null): string | undefined => {
        if (!raw) return undefined;
        return isValidDate(raw) ? formatDate(raw) : undefined;
    };

    const isoDefaultDate = isoDate(defaultDate) ?? now();
    const normalizedTripMinDate = isoDate(tripMinDate ?? undefined);
    const normalizedTripMaxDate = isoDate(tripMaxDate ?? undefined);

    // Seed edit mode from the saved destination: country + a single
    // combined transport editor pre-filled from the first transport
    // activity already on the itinerary (or the legacy header flight).
    useEffect(() => {
        if (data && type === ACTION.EDIT) {
            const seeded = seedTransportFromData(data, isoDate, isoDefaultDate);
            // The saved destination is fixed — mark it `user` so derivation
            // never re-resolves it from a flight/transit edit.
            applyCountry(data.country ?? null, 'user');
            setTransport(seeded);
            setStep(WIZARD_STEP.TYPE);
            setChooseLater(seeded.kind === null);
            setMethod(null);
            setLookupNotFound({});
        } else {
            applyCountry(null, null);
            setTransport(emptyTransport());
            setStep(WIZARD_STEP.TYPE);
            setChooseLater(false);
            setMethod(null);
            setLookupNotFound({});
        }
        // isoDefaultDate is derived from defaultDate; isoDate is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, defaultDate, type]);

    const resetTransient = () => {
        applyCountry(null, null);
        setTransport(emptyTransport());
        setStep(WIZARD_STEP.TYPE);
        setChooseLater(false);
        setMethod(null);
        setError(null);
        setLookupNotFound({});
    };

    // Reset on every close so re-opening always starts clean (ADD), or
    // restores the saved destination (EDIT) — stale flight/transit input
    // from a previous open must never leak into the next one.
    const handleModalClose = () => {
        if (isAdd) {
            resetTransient();
        } else if (data) {
            const seeded = seedTransportFromData(data, isoDate, isoDefaultDate);
            applyCountry(data.country ?? null, 'user');
            setTransport(seeded);
            setStep(WIZARD_STEP.TYPE);
            setChooseLater(seeded.kind === null);
            setMethod(null);
            setError(null);
            setLookupNotFound({});
        }
    };

    /** Build the destination's header FLIGHT from the current draft. The
     *  flight renders as the destination header band (depart/arrive legs),
     *  not as an itinerary activity, so its data lives on `flightInfo`. The
     *  flat headline fields are synced from segment 0 for callers that only
     *  read the headline; `segments` carries the full per-leg breakdown. */
    const buildFlightInfo = (): { flightInfo: FlightInfo; arrivalDate?: string } => {
        const segments = transport.flightSegments.length
            ? transport.flightSegments
            : [emptyFlightSegment(isoDefaultDate)];
        const first = segments[0];
        const last = segments[segments.length - 1];
        return {
            flightInfo: {
                flightNumber: first.flightNumber,
                departAirport: first.departAirport,
                arrivalAirport: first.arrivalAirport,
                departDate: first.departDate,
                departTime: first.departTime,
                arrivalDate: first.arrivalDate,
                arrivalTime: first.arrivalTime,
                cost: transport.cost || undefined,
                segments,
            },
            arrivalDate: last.arrivalDate ?? first.departDate,
        };
    };

    /** Build the destination's arrival header for GROUND kinds (train / bus /
     *  rental) — same `flightInfo` home as a flight, tagged with `mode` so the
     *  header band renders the right label. Maps transit legs (station /
     *  operator) onto the generic FlightInfo leg shape (departAirport holds the
     *  station, flightNumber the service number, carrier/seatOrClass the rest).
     *  Returns null for "add later" (no kind) or a flight draft. */
    const buildGroundArrivalInfo = (): {
        flightInfo: FlightInfo;
        arrivalDate?: string;
    } | null => {
        const { kind } = transport;
        if (!kind || kind === ACTIVITY_KIND.FLIGHT) return null;
        const segments = transport.transitSegments.length
            ? transport.transitSegments
            : [emptyTransitSegment(isoDefaultDate)];
        const first = segments[0];
        const last = segments[segments.length - 1];
        const legs: FlightInfo[] = segments.map((seg) => ({
            departAirport: seg.departStation,
            arrivalAirport: seg.arrivalStation,
            flightNumber: seg.number,
            carrier: seg.operator,
            seatOrClass: seg.classOrSeat,
            departDate: seg.departDate,
            departTime: seg.departTime,
            arrivalDate: seg.arrivalDate,
            arrivalTime: seg.arrivalTime,
        }));
        return {
            flightInfo: {
                mode: kind,
                ...legs[0],
                cost: transport.cost || undefined,
                segments: legs,
            },
            arrivalDate: last.arrivalDate ?? first.departDate,
        };
    };

    const handleSubmit = () => {
        if (!country) {
            setError(
                "We couldn't read a destination from your details yet — add an arrival airport or destination text.",
            );
            return;
        }
        setError(null);

        const isFlight = transport.kind === ACTIVITY_KIND.FLIGHT;
        // Any arrival mode (flight OR ground) rides on the destination header
        // via `flightInfo` (which now carries `mode`) — never as a seeded
        // activity card. "Add later" (no kind) seeds nothing.
        const arrival = isFlight ? buildFlightInfo() : buildGroundArrivalInfo();

        const departDate =
            transport.flightSegments[0]?.departDate ??
            transport.transitSegments[0]?.departDate;
        const dayDate =
            arrival?.arrivalDate ?? departDate ?? isoDefaultDate;

        // EDIT: strip any legacy arrival activity (a "Flight to …" / transit
        // leg saved as a day-1 card by an older client) so the arrival isn't
        // shown twice (header + card). New saves never create one.
        const editItinerary: Destination['itinerary'] =
            type === ACTION.EDIT && data?.itinerary
                ? data.itinerary.map((day, idx) =>
                      idx === 0
                          ? {
                                ...day,
                                activities: day.activities.filter(
                                    (a) =>
                                        a.kind !== ACTIVITY_KIND.FLIGHT &&
                                        !(
                                            a.kind != null &&
                                            GROUND_ARRIVAL_KINDS.has(a.kind)
                                        ),
                                ),
                            }
                          : day,
                  )
                : data?.itinerary;

        modelRef.current?.closeModal();
        onChange?.({
            id: data?.id,
            country,
            flightInfo: arrival?.flightInfo,
            itinerary: type === ACTION.EDIT ? editItinerary : undefined,
            // Arrival day = this destination's start; the timeline derives the
            // end from the next destination's arrival.
            startDate: dayDate,
        });

        if (isAdd) resetTransient();
    };

    if (isViewMode) return null;

    const canSubmit = Boolean(country);
    // On the Describe step, the flight "Find my flight" method swaps the
    // smart/custom form for the departures search instead.
    const flightSearchActive =
        isAdd &&
        step === WIZARD_STEP.DESCRIBE &&
        method === ADD_METHOD.SEARCH &&
        transport.kind === ACTIVITY_KIND.FLIGHT;

    // Where the footer's Back button goes from the current step. Confirm →
    // Describe; Describe → Method (or Type for the "later"/no-kind path);
    // Method → Type.
    const describeBackTo: WizardStep =
        step === WIZARD_STEP.CONFIRM
            ? WIZARD_STEP.DESCRIBE
            : step === WIZARD_STEP.DESCRIBE
              ? transport.kind
                  ? WIZARD_STEP.METHOD
                  : WIZARD_STEP.TYPE
              : WIZARD_STEP.TYPE;

    /** Step 1 tile click: pick a transport type (or "I'll add later"), seed
     *  its first segment, and advance. A transport kind goes to the Method
     *  step (how to add it); "I'll add later" skips straight to the
     *  destination-only Describe step. Switching kinds resets the smart text +
     *  segments so a stale flight entry can't leak into a train (and v.v.). */
    const pickType = (value: TypePick) => {
        setError(null);
        if (value === LATER) {
            setChooseLater(true);
            setMethod(null);
            setTransport((prev) => ({
                ...prev,
                kind: null,
                smartText: '',
                flightSegments: [],
                transitSegments: [],
                cost: '',
            }));
            // ADD: switching to "later" drops any country derived from a
            // prior flight/transit entry so the destination-only text owns
            // it. EDIT: the saved destination is fixed — never clear it.
            if (isAdd) applyCountry(null, null);
            setStep(WIZARD_STEP.DESCRIBE);
            return;
        }
        setChooseLater(false);
        setMethod(null);
        const kindChanged = transport.kind !== value;
        setTransport((prev) => ({
            ...prev,
            kind: value,
            smartText: kindChanged ? '' : prev.smartText,
            cost: kindChanged ? '' : prev.cost,
            flightSegments:
                value === ACTIVITY_KIND.FLIGHT
                    ? prev.flightSegments.length
                        ? prev.flightSegments
                        : [emptyFlightSegment(isoDefaultDate)]
                    : [],
            transitSegments:
                value !== ACTIVITY_KIND.FLIGHT
                    ? prev.transitSegments.length
                        ? prev.transitSegments
                        : [emptyTransitSegment(isoDefaultDate)]
                    : [],
        }));
        // ADD: a kind change invalidates a previously-derived country so the
        // new entry re-derives it. EDIT: keep the saved destination fixed.
        if (isAdd && kindChanged) applyCountry(null, null);
        setStep(WIZARD_STEP.METHOD);
    };

    /** Method step pick: SMART / CUSTOM advance to the Describe step (the
     *  method drives whether the smart box or the editable fields show).
     *  SEARCH (flight only) swaps the Describe input for the departures
     *  search, also on the Describe step. */
    const pickMethod = (picked: AddMethod) => {
        setError(null);
        setMethod(picked);
        setStep(WIZARD_STEP.DESCRIBE);
    };

    /** A flight was picked from the "Find my flight" departures search. Apply
     *  it to the first segment and land the user on Confirm with a filled
     *  flight (the always-mounted resolver derives the destination country
     *  from the arrival airport). */
    const handleFlightDeparturePick = (item: FlightDepartureOption) => {
        setTransport((prev) => {
            const segs = prev.flightSegments.length
                ? [...prev.flightSegments]
                : [emptyFlightSegment(isoDefaultDate)];
            const cur = segs[0] ?? {};
            segs[0] = {
                ...cur,
                flightNumber: item.flightNumber ?? cur.flightNumber,
                departAirport: item.departAirport ?? cur.departAirport,
                arrivalAirport: item.arrivalAirport ?? cur.arrivalAirport,
                departDate: item.departDate ?? cur.departDate,
                departTime: item.departTime ?? cur.departTime,
                arrivalDate: item.arrivalDate ?? cur.arrivalDate,
                arrivalTime: item.arrivalTime ?? cur.arrivalTime,
            };
            return { ...prev, kind: ACTIVITY_KIND.FLIGHT, flightSegments: segs };
        });
        if (isAdd) applyCountry(null, null);
        setStep(WIZARD_STEP.CONFIRM);
    };

    /** Step 1 smart box: detect the kind from the typed text, parse it into
     *  that kind's first segment, and jump straight to Confirm — the always-
     *  mounted TransportResolver finishes the flight lookup + the
     *  destination-from-text/arrival derivation. Mirrors the Add-Activity
     *  smart box, which skips the method step and lands on the review. */
    const handleSmartSubmit = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setError(null);
        setChooseLater(false);
        setMethod(null);
        const kind = detectTransportKind(trimmed);
        setTransport((prev) => {
            if (kind === ACTIVITY_KIND.FLIGHT) {
                const seg = parseFlightInfo(trimmed).segments[0];
                return {
                    ...prev,
                    kind,
                    smartText: trimmed,
                    flightSegments: [
                        {
                            ...emptyFlightSegment(isoDefaultDate),
                            ...(seg?.flightNumber
                                ? { flightNumber: seg.flightNumber }
                                : {}),
                            ...(seg?.departDate
                                ? {
                                      departDate: seg.departDate,
                                      arrivalDate: seg.departDate,
                                  }
                                : {}),
                        },
                    ],
                    transitSegments: [],
                };
            }
            const parsed = parseTransitEntry(trimmed);
            return {
                ...prev,
                kind,
                smartText: trimmed,
                flightSegments: [],
                transitSegments: [
                    {
                        ...emptyTransitSegment(isoDefaultDate),
                        operator: parsed?.operator,
                        number: parsed?.number,
                        departStation: parsed?.departStation,
                        arrivalStation: parsed?.arrivalStation,
                        departTime: parsed?.departTime,
                        arrivalTime: parsed?.arrivalTime,
                        departDate: parsed?.departDate ?? isoDefaultDate,
                        arrivalDate: parsed?.arrivalDate ?? isoDefaultDate,
                    },
                ],
                cost:
                    parsed?.cost != null ? String(parsed.cost) : prev.cost,
            };
        });
        // Re-derive the destination from this fresh entry.
        if (isAdd) applyCountry(null, null);
        setStep(WIZARD_STEP.CONFIRM);
    };

    return (
        <div
            className={classNames({
                'add-place-container-standard':
                    buttonType === BUTTON_VARIANT.STANDARD,
                'add-place-container-simple': buttonType === BUTTON_VARIANT.TEXT,
            })}
        >
            <ModalButton
                title={
                    isAdd
                        ? DESTINATION_LABEL.ADD
                        : `${DESTINATION_LABEL.EDIT} ${data?.country?.name ?? ''}`
                }
                ref={modelRef}
                onClose={handleModalClose}
                containerClassName="add-destination-modal"
                buttonProps={{
                    title,
                    Icon:
                        buttonType === BUTTON_VARIANT.STANDARD
                            ? AddLocationAltRoundedIcon
                            : null,
                    type: buttonType,
                }}
            >
                <div className="add-destination-comp">
                    {/* ADD step 1 only: transport-type tiles. A tile advances
                        to the Method step ("later" jumps to Describe). Edit
                        mode skips the tile grid entirely and opens straight on
                        the (clean, collapsed) Describe form — mirroring the
                        Add-Activity edit, which edits one transport in place
                        rather than re-picking its type. */}
                    {isAdd && step === WIZARD_STEP.TYPE && (
                        <TypeStep
                            currentKind={transport.kind}
                            laterActive={chooseLater}
                            onPick={pickType}
                            onSmartSubmit={handleSmartSubmit}
                        />
                    )}

                    {/* ADD step 2 (tile path only): how to add the chosen
                        transport. The smart-box shortcut + "I'll add later"
                        skip this; edit mode never shows it. */}
                    {isAdd &&
                        step === WIZARD_STEP.METHOD &&
                        transport.kind && (
                            <MethodStep
                                methods={methodsForKind(transport.kind)}
                                onPick={pickMethod}
                            />
                        )}

                    {/* ADD step 3 / EDIT always: describe the chosen transport
                        (or the destination-only "later" entry). When the flight
                        "Find my flight" method is active the departures search
                        takes this slot instead. Entry-only in add mode — the
                        review lives on the Confirm step. */}
                    {flightSearchActive ? (
                        <FlightDeparturesSearch
                            initialAirport={
                                transport.flightSegments[0]?.departAirport ||
                                nearestAirport?.iataCode ||
                                ''
                            }
                            initialArrival={
                                transport.flightSegments[0]?.arrivalAirport || ''
                            }
                            initialDate={
                                transport.flightSegments[0]?.departDate ||
                                isoDefaultDate
                            }
                            onPick={handleFlightDeparturePick}
                            onBack={() => setStep(WIZARD_STEP.METHOD)}
                        />
                    ) : (
                        (!isAdd || step === WIZARD_STEP.DESCRIBE) && (
                            <DescribeStep
                                mode={isAdd ? 'add' : 'edit'}
                                transport={transport}
                                setTransport={setTransport}
                                isoDefaultDate={isoDefaultDate}
                                tripMinDate={normalizedTripMinDate}
                                tripMaxDate={normalizedTripMaxDate}
                                emptyFlightSegment={emptyFlightSegment}
                                emptyTransitSegment={emptyTransitSegment}
                                lookupNotFound={lookupNotFound}
                                method={isAdd ? method : undefined}
                                onChangeType={
                                    isAdd
                                        ? () =>
                                              setStep(
                                                  transport.kind
                                                      ? WIZARD_STEP.METHOD
                                                      : WIZARD_STEP.TYPE,
                                              )
                                        : undefined
                                }
                            />
                        )
                    )}

                    {/* ADD final step: read-only review before saving. */}
                    {isAdd && step === WIZARD_STEP.CONFIRM && (
                        <ConfirmStep
                            country={country}
                            transport={transport}
                            onEditTransport={() =>
                                setStep(WIZARD_STEP.DESCRIBE)
                            }
                            onSetCountry={(c) => {
                                applyCountry(c, 'user');
                                setError(null);
                            }}
                        />
                    )}

                    {/* Always mounted (every step + edit): keeps the flight /
                        transit lookups + the destination-country derivation
                        (arrival airport OR smart text) resolving even after the
                        user clicks Continue and DescribeStep unmounts on the
                        Confirm step. */}
                    <TransportResolver
                        transport={transport}
                        setTransport={setTransport}
                        country={country}
                        countrySource={countrySourceRef.current}
                        isoDefaultDate={isoDefaultDate}
                        emptyFlightSegment={emptyFlightSegment}
                        emptyTransitSegment={emptyTransitSegment}
                        setLookupNotFound={setLookupNotFound}
                        onCountryChange={(c, source) => {
                            applyCountry(c, source);
                            setError(null);
                        }}
                    />

                    {error && (
                        <p className="add-destination-error" role="alert">
                            {error}
                        </p>
                    )}

                    {/* No footer on the Type step (tiles advance on click) or
                        while the flight departures search is up (it ships its
                        own Back + Search row). Method = Back only; Describe =
                        Back + Continue; Confirm = Back + Add Destination; edit
                        = the single Save screen. */}
                    {!flightSearchActive &&
                        (!isAdd ||
                            step === WIZARD_STEP.METHOD ||
                            step === WIZARD_STEP.DESCRIBE ||
                            step === WIZARD_STEP.CONFIRM) && (
                            <div className="add-destination-actions">
                                {isAdd && (
                                    <ButtonCustom
                                        onClick={() => setStep(describeBackTo)}
                                        label={DESTINATION_LABEL.BACK}
                                        type={BUTTON_VARIANT.LINE}
                                        capitalizeType="capitalize"
                                    />
                                )}
                                {isAdd && step === WIZARD_STEP.METHOD ? null : isAdd &&
                                  step === WIZARD_STEP.DESCRIBE ? (
                                    <ButtonCustom
                                        onClick={() =>
                                            setStep(WIZARD_STEP.CONFIRM)
                                        }
                                        label={DESTINATION_LABEL.CONTINUE}
                                        type={BUTTON_VARIANT.STANDARD}
                                        capitalizeType="uppercase"
                                    />
                                ) : (
                                    <ButtonCustom
                                        onClick={handleSubmit}
                                        label={
                                            isAdd
                                                ? DESTINATION_LABEL.ADD
                                                : DESTINATION_LABEL.SAVE
                                        }
                                        type={BUTTON_VARIANT.STANDARD}
                                        capitalizeType="uppercase"
                                        disabled={!canSubmit}
                                    />
                                )}
                            </div>
                        )}
                </div>
            </ModalButton>
        </div>
    );
};

/** Pre-fill the transport draft on edit from the saved destination. The
 *  arrival (any mode) lives on the header `flightInfo`, tagged with `mode`;
 *  ground modes map their station/operator legs back into transit segments.
 *  Falls back to a legacy day-1 FLIGHT activity (older saves). Returns an
 *  empty draft (kind=null) when the destination has no transport. */
/** A transport leg carries real data when any of its identifying fields is
 *  set — mirrors `segHasData` in DestinationDetail/Multiple so the edit seed
 *  and the header band agree on which source to read. */
const segHasData = (seg?: Partial<FlightInfo>): boolean =>
    Boolean(seg && (seg.flightNumber || seg.departAirport || seg.arrivalAirport));

const seedTransportFromData = (
    data: Destination,
    isoDate: (raw?: string | null) => string | undefined,
    fallbackDate: string,
): TransportDraft => {
    const fi = data.flightInfo;
    const mode =
        (fi?.mode as TransportKind | undefined) ?? ACTIVITY_KIND.FLIGHT;

    if (mode === ACTIVITY_KIND.FLIGHT) {
        // Mirror the header band's source precedence (DestinationDetail/
        // Multiple): populated flightInfo segments → the day-1 flight activity
        // the country-page seed parks (with `flightInfo` a bare stub) →
        // flightInfo's flat fields. Reading the stub directly would seed a
        // half-empty leg (arrival only, no depart) and fire a false "couldn't
        // find an airport" warning even though the band shows the full route.
        const legacyFlight = (data.itinerary?.[0]?.activities ?? []).find(
            (a) => a.kind === ACTIVITY_KIND.FLIGHT && a.flightSegments?.length,
        );
        const fiSegments = fi?.segments?.some(segHasData)
            ? fi.segments
            : undefined;
        const segs =
            fiSegments ??
            legacyFlight?.flightSegments ??
            (fi && segHasData(fi) ? [fi] : undefined);
        if (!segs?.length) return emptyTransport();
        const cost =
            fi?.cost != null
                ? String(fi.cost)
                : legacyFlight?.cost != null
                  ? String(legacyFlight.cost)
                  : '';
        return {
            kind: ACTIVITY_KIND.FLIGHT,
            smartText: '',
            flightSegments: segs.map((seg) => ({
                ...seg,
                departDate: isoDate(seg.departDate) ?? fallbackDate,
                arrivalDate: isoDate(seg.arrivalDate) ?? fallbackDate,
            })),
            transitSegments: [],
            cost,
        };
    }

    // Ground arrival (train / bus / rental) rides on `flightInfo` tagged with
    // `mode`; map its generic legs back to the transit shape (station /
    // operator).
    const segs = fi?.segments?.length ? fi.segments : fi ? [fi] : [];
    if (!segs.length) return emptyTransport();
    return {
        kind: mode,
        smartText: '',
        flightSegments: [],
        transitSegments: segs.map((seg) => ({
            departStation: seg.departAirport,
            arrivalStation: seg.arrivalAirport,
            number: seg.flightNumber,
            operator: seg.carrier,
            classOrSeat: seg.seatOrClass,
            departDate: isoDate(seg.departDate) ?? fallbackDate,
            departTime: seg.departTime,
            arrivalDate: isoDate(seg.arrivalDate) ?? fallbackDate,
            arrivalTime: seg.arrivalTime,
        })),
        cost: fi?.cost != null ? String(fi.cost) : '',
    };
};

export default AddDestinationBtn;
