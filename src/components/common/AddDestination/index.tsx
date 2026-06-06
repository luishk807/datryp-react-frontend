import { useState, useEffect, useMemo, useRef } from 'react';
import './index.scss';
import { formatDate, isValidDate, now } from 'utils';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import ModalButton, { type ModalButtonHandle } from 'components/ModalButton';
import ButtonCustom from 'components/common/FormFields/ButtonCustom';
import classNames from 'classnames';
import { ACTION, ACTIVITY_KIND, BUTTON_VARIANT } from 'constants';
import type {
    Activity,
    AddEditButtonProps,
    Country,
    Destination,
    FlightInfo,
    TransitInfo,
} from 'types';
import { parseFlightInfo } from 'components/common/AddPlaceBtn/parseFlightInfo';
import { parseTransitEntry } from 'components/common/AddPlaceBtn/parseTransitQuery';
import TypeStep, { LATER, type TypePick } from './TypeStep';
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
    /** Legacy header flight — never written by this component anymore.
     *  Transport is seeded as a first-day activity instead. Kept on the
     *  draft type only so edit-mode round-trips of older data don't lose
     *  it on the way out. */
    flightInfo?: FlightInfo;
    itinerary?: Destination['itinerary'];
}

export interface AddDestinationBtnProps
    extends AddEditButtonProps<DestinationDraft, Destination> {
    defaultDate?: string;
    tripMaxDate?: string | null;
}

const WIZARD_STEP = { TYPE: 1, DESCRIBE: 2, CONFIRM: 3 } as const;
type WizardStep = (typeof WIZARD_STEP)[keyof typeof WIZARD_STEP];

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
    const [error, setError] = useState<string | null>(null);
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
            setLookupNotFound({});
        } else {
            setCountry(null);
            setTransport(emptyTransport());
            setStep(WIZARD_STEP.TYPE);
            setChooseLater(false);
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
            setError(null);
            setLookupNotFound({});
        }
    };

    /** Build the seeded transport activity from the current transport
     *  draft. Returns null for "add later" (no kind) or an empty draft. */
    const buildTransportActivity = (
        baseId: number,
    ): { activity: Activity; arrivalDate?: string } | null => {
        const { kind } = transport;
        if (!kind) return null;
        const name = `${TRANSPORT_NAME_PREFIX[kind]} ${country?.name ?? ''}`.trim();

        if (kind === ACTIVITY_KIND.FLIGHT) {
            const segments = transport.flightSegments.length
                ? transport.flightSegments
                : [emptyFlightSegment(isoDefaultDate)];
            const first = segments[0];
            const last = segments[segments.length - 1];
            return {
                activity: {
                    id: baseId,
                    kind: ACTIVITY_KIND.FLIGHT,
                    name,
                    startTime: first.departTime,
                    endTime: last.arrivalTime,
                    cost: transport.cost || undefined,
                    flightSegments: segments,
                },
                arrivalDate: last.arrivalDate ?? first.departDate,
            };
        }

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
        const transportSeed = buildTransportActivity(base + 2);
        const activities: Activity[] = [];

        if (transportSeed) activities.push(transportSeed.activity);

        const departDate =
            transport.flightSegments[0]?.departDate ??
            transport.transitSegments[0]?.departDate;
        const dayDate =
            transportSeed?.arrivalDate ?? departDate ?? isoDefaultDate;

        const itinerary: Destination['itinerary'] = activities.length
            ? [{ id: base, date: dayDate, activities }]
            : type === ACTION.EDIT
              ? data?.itinerary
              : undefined;

        modelRef.current?.closeModal();
        onChange?.({
            id: data?.id,
            country,
            itinerary,
        });

        if (isAdd) resetTransient();
    };

    if (isViewMode) return null;

    const canSubmit = Boolean(country);

    /** Step 1 tile click: pick a transport type (or "I'll add later"), seed
     *  its first segment, and advance to the Describe step. Switching kinds
     *  resets the smart text + segments so a stale flight entry can't leak
     *  into a train (and vice versa). */
    const pickType = (value: TypePick) => {
        setError(null);
        if (value === LATER) {
            setChooseLater(true);
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
        setStep(WIZARD_STEP.DESCRIBE);
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
                    {/* ADD step 1 / EDIT always: transport-type tiles. Tiles
                        advance to Describe on click in add mode; in edit mode
                        they sit inline above the (always-shown) Describe form. */}
                    {(!isAdd || step === WIZARD_STEP.TYPE) && (
                        <TypeStep
                            currentKind={transport.kind}
                            laterActive={chooseLater}
                            onPick={pickType}
                            onSmartSubmit={isAdd ? handleSmartSubmit : undefined}
                        />
                    )}

                    {/* ADD step 2 / EDIT always: describe the chosen transport
                        (or the destination-only "later" entry). Entry-only in
                        add mode — the review lives on the Confirm step. */}
                    {(!isAdd || step === WIZARD_STEP.DESCRIBE) && (
                        <DescribeStep
                            mode={isAdd ? 'add' : 'edit'}
                            transport={transport}
                            setTransport={setTransport}
                            isoDefaultDate={isoDefaultDate}
                            tripMaxDate={normalizedTripMaxDate}
                            emptyFlightSegment={emptyFlightSegment}
                            emptyTransitSegment={emptyTransitSegment}
                            lookupNotFound={lookupNotFound}
                            onChangeType={
                                isAdd
                                    ? () => setStep(WIZARD_STEP.TYPE)
                                    : undefined
                            }
                        />
                    )}

                    {/* ADD step 3: read-only review before saving. */}
                    {isAdd && step === WIZARD_STEP.CONFIRM && (
                        <ConfirmStep
                            country={country}
                            transport={transport}
                            onEditTransport={() =>
                                setStep(WIZARD_STEP.DESCRIBE)
                            }
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

                    {/* No footer on step 1 (tiles advance on click). Step 2
                        (add) = Back + Continue; step 3 (add) = Back + Add
                        Destination; edit = the single Save screen. */}
                    {(!isAdd ||
                        step === WIZARD_STEP.DESCRIBE ||
                        step === WIZARD_STEP.CONFIRM) && (
                        <div className="add-destination-actions">
                            {isAdd && (
                                <ButtonCustom
                                    onClick={() =>
                                        setStep(
                                            step === WIZARD_STEP.CONFIRM
                                                ? WIZARD_STEP.DESCRIBE
                                                : WIZARD_STEP.TYPE,
                                        )
                                    }
                                    label={DESTINATION_LABEL.BACK}
                                    type={BUTTON_VARIANT.LINE}
                                    capitalizeType="capitalize"
                                />
                            )}
                            {isAdd && step === WIZARD_STEP.DESCRIBE ? (
                                <ButtonCustom
                                    onClick={() => setStep(WIZARD_STEP.CONFIRM)}
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
