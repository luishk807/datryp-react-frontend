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
import CountryPicker from './CountryPicker';
import TransportStep, {
    type TransportKind,
    type TransportDraft,
} from './TransportStep';

const DESTINATION_LABEL = {
    ADD: 'Add Destination',
    EDIT: 'Edit',
    SAVE: 'Save Destination',
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

const WIZARD_STEP = { DESTINATION: 1, TRANSPORT: 2 } as const;
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

    const [step, setStep] = useState<WizardStep>(WIZARD_STEP.DESTINATION);
    const [country, setCountry] = useState<Country | null>(null);
    const [transport, setTransport] = useState<TransportDraft>(emptyTransport);
    const [error, setError] = useState<string | null>(null);
    // True when step 2 was reached via step 1's smart text (kind already
    // detected + parsed). Step 2 then skips its own "describe your
    // transportation" box and shows the parsed result outright.
    const [seededFromSmart, setSeededFromSmart] = useState(false);

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
            setCountry(data.country ?? null);
            setTransport(seedTransportFromData(data, isoDate, isoDefaultDate));
            setStep(WIZARD_STEP.DESTINATION);
            setSeededFromSmart(false);
        } else {
            setCountry(null);
            setTransport(emptyTransport());
            setStep(WIZARD_STEP.DESTINATION);
            setSeededFromSmart(false);
        }
        // isoDefaultDate is derived from defaultDate; isoDate is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, defaultDate, type]);

    const resetTransient = () => {
        setCountry(null);
        setTransport(emptyTransport());
        setStep(WIZARD_STEP.DESTINATION);
        setSeededFromSmart(false);
        setError(null);
    };

    // Reset on every close so re-opening always starts clean (ADD), or
    // restores the saved destination (EDIT) — stale flight/transit input
    // from a previous open must never leak into the next one.
    const handleModalClose = () => {
        if (isAdd) {
            resetTransient();
        } else if (data) {
            setCountry(data.country ?? null);
            setTransport(seedTransportFromData(data, isoDate, isoDefaultDate));
            setStep(WIZARD_STEP.DESTINATION);
            setSeededFromSmart(false);
            setError(null);
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
            setError('Pick a destination country first.');
            // In ADD mode jump back to step 1 so the picker is visible.
            if (isAdd) setStep(WIZARD_STEP.DESTINATION);
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
                    {/* ADD step 1 / EDIT always: destination picker. */}
                    {(!isAdd || step === WIZARD_STEP.DESTINATION) && (
                        <CountryPicker
                            mode={isAdd ? 'add' : 'edit'}
                            country={country}
                            defaultCountry={data?.country}
                            onCountryChange={(c) => {
                                setCountry(c);
                                setError(null);
                                // Picking a destination from Search jumps
                                // straight to step 2 — no Continue click.
                                if (isAdd && c) {
                                    setSeededFromSmart(false);
                                    setStep(WIZARD_STEP.TRANSPORT);
                                }
                            }}
                            onSmartAdvance={(text, resolvedCountry, kind) => {
                                if (resolvedCountry) setCountry(resolvedCountry);
                                // Pre-select the detected transport kind and
                                // seed its first segment so step 2 lands on the
                                // parsed result (TransportStep auto-parses the
                                // smartText) instead of the empty chooser.
                                setTransport((prev) => ({
                                    ...prev,
                                    kind,
                                    smartText: text,
                                    flightSegments:
                                        kind === ACTIVITY_KIND.FLIGHT &&
                                        !prev.flightSegments.length
                                            ? [emptyFlightSegment(isoDefaultDate)]
                                            : prev.flightSegments,
                                    transitSegments:
                                        kind !== ACTIVITY_KIND.FLIGHT &&
                                        !prev.transitSegments.length
                                            ? [emptyTransitSegment(isoDefaultDate)]
                                            : prev.transitSegments,
                                }));
                                setSeededFromSmart(true);
                                setStep(WIZARD_STEP.TRANSPORT);
                            }}
                        />
                    )}

                    {/* ADD step 2 / EDIT always: transport editor. */}
                    {(!isAdd || step === WIZARD_STEP.TRANSPORT) && (
                        <TransportStep
                            mode={isAdd ? 'add' : 'edit'}
                            transport={transport}
                            setTransport={setTransport}
                            country={country}
                            defaultCountry={data?.country}
                            isoDefaultDate={isoDefaultDate}
                            tripMaxDate={normalizedTripMaxDate}
                            seededFromSmart={seededFromSmart}
                            emptyFlightSegment={emptyFlightSegment}
                            emptyTransitSegment={emptyTransitSegment}
                            onCountryChange={(c) => {
                                setCountry(c);
                                setError(null);
                            }}
                        />
                    )}

                    {error && (
                        <p className="add-destination-error" role="alert">
                            {error}
                        </p>
                    )}

                    {/* No footer on step 1: "Type it" advances via the smart
                        box arrow, "Search" advances on pick. The footer only
                        appears on the transport step (add) / the single edit
                        screen. */}
                    {(!isAdd || step === WIZARD_STEP.TRANSPORT) && (
                    <div className="add-destination-actions">
                        {isAdd && step === WIZARD_STEP.TRANSPORT && (
                            <ButtonCustom
                                onClick={() => setStep(WIZARD_STEP.DESTINATION)}
                                label="Back"
                                type={BUTTON_VARIANT.LINE}
                                capitalizeType="capitalize"
                            />
                        )}
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
