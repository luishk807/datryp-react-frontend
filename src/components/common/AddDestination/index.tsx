import { useState, useEffect, useMemo, useRef } from 'react';
import './index.scss';
import { formatDate, isValidDate, now } from 'utils';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import classNames from 'classnames';
import { ACTION, ACTIVITY_KIND, ADD_METHOD, BUTTON_VARIANT } from 'constants';
import type {
    Activity,
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
import type { TransportKind, TransportDraft } from './types';

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
    tripMaxDate?: string | null;
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

/** Title prefix for the seeded transport activity, by kind. */
const TRANSPORT_NAME_PREFIX: Record<TransportKind, string> = {
    [ACTIVITY_KIND.FLIGHT]: 'Flight to',
    [ACTIVITY_KIND.TRAIN]: 'Train to',
    [ACTIVITY_KIND.BUS]: 'Bus to',
    [ACTIVITY_KIND.RENTAL_CAR]: 'Car to',
};

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
    tripMaxDate,
    onChange,
    type = ACTION.ADD,
    data = null,
    buttonType = BUTTON_VARIANT.STANDARD,
    isViewMode = false,
}: AddDestinationBtnProps) => {
    const isAdd = type === ACTION.ADD;
    const title = useMemo(
        () => (isAdd ? DESTINATION_LABEL.ADD : DESTINATION_LABEL.EDIT),
        [isAdd],
    );

    const modelRef = useRef<ModalButtonHandle>(null);

    const [step, setStep] = useState<WizardStep>(WIZARD_STEP.TYPE);
    const [country, setCountry] = useState<Country | null>(null);
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
    const normalizedTripMaxDate = isoDate(tripMaxDate ?? undefined);

    // Seed edit mode from the saved destination: country + a single
    // combined transport editor pre-filled from the first transport
    // activity already on the itinerary (or the legacy header flight).
    useEffect(() => {
        if (data && type === ACTION.EDIT) {
            const seeded = seedTransportFromData(data, isoDate, isoDefaultDate);
            setCountry(data.country ?? null);
            setTransport(seeded);
            setStep(WIZARD_STEP.TYPE);
            setChooseLater(seeded.kind === null);
            setMethod(null);
            setLookupNotFound({});
        } else {
            setCountry(null);
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
        setCountry(null);
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
            setCountry(data.country ?? null);
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

    /** Build the seeded transport activity for GROUND kinds (train / bus /
     *  rental). Flight no longer rides here — it's the destination header.
     *  Returns null for "add later" (no kind) or a flight draft. */
    const buildTransportActivity = (
        baseId: number,
    ): { activity: Activity; arrivalDate?: string } | null => {
        const { kind } = transport;
        if (!kind || kind === ACTIVITY_KIND.FLIGHT) return null;
        const name = `${TRANSPORT_NAME_PREFIX[kind]} ${country?.name ?? ''}`.trim();

        const segments = transport.transitSegments.length
            ? transport.transitSegments
            : [emptyTransitSegment(isoDefaultDate)];
        const first = segments[0];
        const last = segments[segments.length - 1];
        return {
            activity: {
                id: baseId,
                kind,
                name,
                startTime: first.departTime,
                endTime: last.arrivalTime,
                cost: transport.cost || undefined,
                transitSegments: segments,
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

        const base = Date.now();
        const isFlight = transport.kind === ACTIVITY_KIND.FLIGHT;
        // FLIGHT → header (flightInfo). Ground kinds → first-day activity.
        const flightSeed = isFlight ? buildFlightInfo() : null;
        const transportSeed = isFlight ? null : buildTransportActivity(base + 2);
        const activities: Activity[] = [];

        if (transportSeed) activities.push(transportSeed.activity);

        const departDate =
            transport.flightSegments[0]?.departDate ??
            transport.transitSegments[0]?.departDate;
        const dayDate =
            flightSeed?.arrivalDate ??
            transportSeed?.arrivalDate ??
            departDate ??
            isoDefaultDate;

        // EDIT fallback: keep the saved itinerary, but when this destination's
        // transport is now a FLIGHT header, strip any legacy "Flight to …"
        // activity off day 1 so the flight isn't shown twice (header + card).
        const editItinerary: Destination['itinerary'] =
            isFlight && data?.itinerary
                ? data.itinerary.map((day, idx) =>
                      idx === 0
                          ? {
                                ...day,
                                activities: day.activities.filter(
                                    (a) => a.kind !== ACTIVITY_KIND.FLIGHT,
                                ),
                            }
                          : day,
                  )
                : data?.itinerary;

        const itinerary: Destination['itinerary'] = activities.length
            ? [{ id: base, date: dayDate, activities }]
            : type === ACTION.EDIT
              ? editItinerary
              : undefined;

        modelRef.current?.closeModal();
        onChange?.({
            id: data?.id,
            country,
            flightInfo: flightSeed?.flightInfo,
            itinerary,
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
            if (isAdd) setCountry(null);
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
        if (isAdd && kindChanged) setCountry(null);
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
        if (isAdd) setCountry(null);
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
        if (isAdd) setCountry(null);
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
                    {/* ADD step 1 / EDIT always: transport-type tiles. A tile
                        advances to the Method step in add mode ("later" jumps
                        to Describe); in edit mode they sit inline above the
                        (always-shown) Describe form. */}
                    {(!isAdd || step === WIZARD_STEP.TYPE) && (
                        <TypeStep
                            currentKind={transport.kind}
                            laterActive={chooseLater}
                            onPick={pickType}
                            onSmartSubmit={isAdd ? handleSmartSubmit : undefined}
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
                                setCountry(c);
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
                        isoDefaultDate={isoDefaultDate}
                        emptyFlightSegment={emptyFlightSegment}
                        emptyTransitSegment={emptyTransitSegment}
                        setLookupNotFound={setLookupNotFound}
                        onCountryChange={(c) => {
                            setCountry(c);
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

/** Pre-fill the transport draft on edit from the saved destination. Reads
 *  the first FLIGHT / transit activity off day 1; falls back to the legacy
 *  header `flightInfo`. Returns an empty draft (kind=null) when the saved
 *  destination has no transport. */
const seedTransportFromData = (
    data: Destination,
    isoDate: (raw?: string | null) => string | undefined,
    fallbackDate: string,
): TransportDraft => {
    const activities = data.itinerary?.[0]?.activities ?? [];
    const flight = activities.find(
        (a) => a.kind === ACTIVITY_KIND.FLIGHT && a.flightSegments?.length,
    );
    if (flight?.flightSegments?.length) {
        return {
            kind: ACTIVITY_KIND.FLIGHT,
            smartText: '',
            flightSegments: flight.flightSegments.map((seg) => ({
                ...seg,
                departDate: isoDate(seg.departDate) ?? fallbackDate,
                arrivalDate: isoDate(seg.arrivalDate) ?? fallbackDate,
            })),
            transitSegments: [],
            cost: flight.cost != null ? String(flight.cost) : '',
        };
    }

    const transit = activities.find(
        (a) =>
            (a.kind === ACTIVITY_KIND.TRAIN ||
                a.kind === ACTIVITY_KIND.BUS ||
                a.kind === ACTIVITY_KIND.RENTAL_CAR) &&
            a.transitSegments?.length,
    );
    if (transit?.transitSegments?.length) {
        return {
            kind: transit.kind as TransportKind,
            smartText: '',
            flightSegments: [],
            transitSegments: transit.transitSegments.map((seg) => ({
                ...seg,
                departDate: isoDate(seg.departDate) ?? fallbackDate,
                arrivalDate: isoDate(seg.arrivalDate) ?? fallbackDate,
            })),
            cost: transit.cost != null ? String(transit.cost) : '',
        };
    }

    // Legacy header flight (older saved destinations).
    const legacy = data.flightInfo;
    if (legacy?.flightNumber || legacy?.arrivalAirport) {
        const segments = legacy.segments?.length
            ? legacy.segments
            : [legacy];
        return {
            kind: ACTIVITY_KIND.FLIGHT,
            smartText: '',
            flightSegments: segments.map((seg) => ({
                ...seg,
                departDate: isoDate(seg.departDate) ?? fallbackDate,
                arrivalDate: isoDate(seg.arrivalDate) ?? fallbackDate,
            })),
            transitSegments: [],
            cost: legacy.cost != null ? String(legacy.cost) : '',
        };
    }

    return emptyTransport();
};

export default AddDestinationBtn;
