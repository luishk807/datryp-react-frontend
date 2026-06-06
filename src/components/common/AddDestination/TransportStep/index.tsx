import {
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import classNames from 'classnames';
import FlightRoundedIcon from '@mui/icons-material/FlightRounded';
import DirectionsTransitRoundedIcon from '@mui/icons-material/DirectionsTransitRounded';
import DirectionsBusRoundedIcon from '@mui/icons-material/DirectionsBusRounded';
import CarRentalRoundedIcon from '@mui/icons-material/CarRentalRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import SearchBar from 'components/SearchBar';
import { parseFlightInfo } from 'components/common/AddPlaceBtn/parseFlightInfo';
import { parseTransitEntry } from 'components/common/AddPlaceBtn/parseTransitQuery';
import { ACTIVITY_KIND } from 'constants';
import type { Country, FlightInfo, TransitInfo } from 'types';
import './index.scss';

/** The four real transport kinds AddDestination seeds. (`other` rides are
 *  out of scope for a destination-arrival transport.) */
export type TransportKind =
    | typeof ACTIVITY_KIND.FLIGHT
    | typeof ACTIVITY_KIND.TRAIN
    | typeof ACTIVITY_KIND.BUS
    | typeof ACTIVITY_KIND.RENTAL_CAR;

export interface TransportDraft {
    /** null = no transport chosen yet (or "I'll add later"). */
    kind: TransportKind | null;
    /** Raw smart-box text seeded from step 1 / typed here. */
    smartText: string;
    flightSegments: FlightInfo[];
    transitSegments: TransitInfo[];
    cost: string;
}

export interface TransportStepProps {
    mode: 'add' | 'edit';
    transport: TransportDraft;
    setTransport: Dispatch<SetStateAction<TransportDraft>>;
    country: Country | null;
    defaultCountry?: Country | null;
    isoDefaultDate: string;
    tripMaxDate?: string;
    /** True when step 1's smart text already produced this transport. The
     *  step's own "describe your transportation" box is then redundant, so
     *  it's hidden and the parsed result shows outright. */
    seededFromSmart?: boolean;
    emptyFlightSegment: (date: string) => FlightInfo;
    emptyTransitSegment: (date: string) => TransitInfo;
    onCountryChange: (country: Country | null) => void;
    /** Per-segment "couldn't find this flight/route" hints, owned by the
     *  orchestrator's always-mounted TransportResolver. Read-only here —
     *  surfaced as a manual-entry nudge under the smart box. */
    lookupNotFound: Record<number, string>;
}

const TYPE_CHIPS: {
    value: TransportKind | 'later';
    label: string;
    sub: string;
    Icon: typeof FlightRoundedIcon;
}[] = [
    {
        value: ACTIVITY_KIND.FLIGHT,
        label: 'Flight',
        sub: 'Fly to your destination.',
        Icon: FlightRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.TRAIN,
        label: 'Train',
        sub: 'Rail journey.',
        Icon: DirectionsTransitRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.BUS,
        label: 'Bus',
        sub: 'Coach or intercity.',
        Icon: DirectionsBusRoundedIcon,
    },
    {
        value: ACTIVITY_KIND.RENTAL_CAR,
        label: 'Rental Car',
        sub: 'Pick up a car.',
        Icon: CarRentalRoundedIcon,
    },
    {
        value: 'later',
        label: "I'll add later",
        sub: 'Decide this later.',
        Icon: BlockRoundedIcon,
    },
];

const isRentalKind = (kind: TransportKind | null) =>
    kind === ACTIVITY_KIND.RENTAL_CAR;
const isFlightKind = (kind: TransportKind | null) =>
    kind === ACTIVITY_KIND.FLIGHT;

/** Step 2 — how are you getting there. Type chips → smart box (parsed via
 *  parseFlightInfo / parseTransitEntry) → "Edit details" expanding the full
 *  per-segment fields. Surfaces a country confirm/picker when step 1 couldn't
 *  resolve one. Entry-only: the read-only review + the async route/country
 *  enrichment live on the Confirm step / the always-mounted TransportResolver. */
const TransportStep = ({
    mode,
    transport,
    setTransport,
    country,
    defaultCountry,
    isoDefaultDate,
    tripMaxDate,
    seededFromSmart = false,
    emptyFlightSegment,
    emptyTransitSegment,
    onCountryChange,
    lookupNotFound,
}: TransportStepProps) => {
    const isEdit = mode === 'edit';
    const { kind } = transport;
    // Edit mode opens straight into the editable fields; add mode shows the
    // collapsed parsed summary first.
    const [showDetails, setShowDetails] = useState(isEdit);
    // The transport-type chips only need to show when the kind is still
    // unknown (the Search → Continue path). When step 1's smart text already
    // determined the kind ("UA123" → Flight), re-asking "how are you getting
    // there?" is redundant — open straight into the parsed result with a
    // quiet "Change" affordance instead.
    const [chooserOpen, setChooserOpen] = useState(!kind);
    // The step's own smart box is redundant when step 1's smart text already
    // produced the transport — hide it (the parsed result + Edit Details
    // cover everything). The manual "pick a mode" path shows it so the user
    // has somewhere to describe the leg.
    const [showSmartBox, setShowSmartBox] = useState(!seededFromSmart && !isEdit);
    // Track whether we've already auto-parsed the seeded smart text so a
    // re-render doesn't clobber subsequent manual edits.
    const parsedSmartRef = useRef<string | null>(null);

    useEffect(() => {
        setShowDetails(isEdit);
    }, [isEdit, kind]);

    const pickKind = (value: TransportKind | 'later') => {
        if (value === 'later') {
            setTransport((prev) => ({
                ...prev,
                kind: null,
                flightSegments: [],
                transitSegments: [],
            }));
            return;
        }
        setTransport((prev) => ({
            ...prev,
            kind: value,
            flightSegments:
                value === ACTIVITY_KIND.FLIGHT && !prev.flightSegments.length
                    ? [emptyFlightSegment(isoDefaultDate)]
                    : prev.flightSegments,
            transitSegments:
                value !== ACTIVITY_KIND.FLIGHT && !prev.transitSegments.length
                    ? [emptyTransitSegment(isoDefaultDate)]
                    : prev.transitSegments,
        }));
        parsedSmartRef.current = null;
        // Picking a concrete mode collapses the chooser back to the result,
        // and reveals the describe box so the user can fill the new leg.
        setChooserOpen(false);
        setShowSmartBox(true);
    };

    const activeChip = TYPE_CHIPS.find((c) => c.value === kind);

    /** Apply the smart-box text to the active kind's first segment. */
    const handleSmartText = (text: string) => {
        setTransport((prev) => {
            if (isFlightKind(prev.kind)) {
                const parsed = parseFlightInfo(text);
                const segs = parsed.segments.length
                    ? parsed.segments.map((s, i) => ({
                          ...(prev.flightSegments[i] ??
                              emptyFlightSegment(isoDefaultDate)),
                          flightNumber: s.flightNumber,
                          departDate: s.departDate ?? isoDefaultDate,
                          arrivalDate: s.departDate ?? isoDefaultDate,
                      }))
                    : prev.flightSegments.length
                      ? prev.flightSegments
                      : [emptyFlightSegment(isoDefaultDate)];
                return { ...prev, smartText: text, flightSegments: segs };
            }
            const parsed = parseTransitEntry(text);
            const base =
                prev.transitSegments[0] ?? emptyTransitSegment(isoDefaultDate);
            const seg: TransitInfo = parsed
                ? {
                      ...base,
                      operator: parsed.operator ?? base.operator,
                      number: parsed.number ?? base.number,
                      departStation: parsed.departStation ?? base.departStation,
                      arrivalStation:
                          parsed.arrivalStation ?? base.arrivalStation,
                      departDate: parsed.departDate ?? base.departDate,
                      departTime: parsed.departTime ?? base.departTime,
                      arrivalDate: parsed.arrivalDate ?? base.arrivalDate,
                      arrivalTime: parsed.arrivalTime ?? base.arrivalTime,
                      classOrSeat: parsed.classOrSeat ?? base.classOrSeat,
                  }
                : base;
            const cost =
                parsed?.cost != null ? String(parsed.cost) : prev.cost;
            return {
                ...prev,
                smartText: text,
                transitSegments: [seg, ...prev.transitSegments.slice(1)],
                cost,
            };
        });
    };

    // When a kind is picked AND step 1 seeded smart text, parse it once.
    useEffect(() => {
        if (!kind || !transport.smartText.trim()) return;
        if (parsedSmartRef.current === `${kind}|${transport.smartText}`) return;
        parsedSmartRef.current = `${kind}|${transport.smartText}`;
        handleSmartText(transport.smartText);
        // handleSmartText is recreated each render; we gate re-runs via the ref.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind, transport.smartText]);

    const setFlightField = (
        idx: number,
        name: keyof FlightInfo,
        value: string,
    ) => {
        setTransport((prev) => {
            const segs = prev.flightSegments.length
                ? [...prev.flightSegments]
                : [emptyFlightSegment(isoDefaultDate)];
            const cur = segs[idx] ?? {};
            const updated: FlightInfo = { ...cur, [name]: value };
            if (
                name === 'departDate' &&
                value &&
                (!cur.arrivalDate || cur.arrivalDate === cur.departDate)
            ) {
                updated.arrivalDate = value;
            }
            segs[idx] = updated;
            return { ...prev, flightSegments: segs };
        });
    };

    const setTransitField = (
        idx: number,
        name: keyof TransitInfo,
        value: string,
    ) => {
        setTransport((prev) => {
            const segs = prev.transitSegments.length
                ? [...prev.transitSegments]
                : [emptyTransitSegment(isoDefaultDate)];
            segs[idx] = { ...(segs[idx] ?? {}), [name]: value };
            return { ...prev, transitSegments: segs };
        });
    };

    const transitSeg = transport.transitSegments[0];

    return (
        <section className="add-destination-group">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">
                    {chooserOpen ? 'How are you getting there?' : 'Getting there'}
                </h4>
            </header>

            {/* Country confirm / picker when step 1 couldn't resolve one. */}
            {country ? (
                <div className="country-picker-chip">
                    <span className="country-picker-chip-label">
                        Destination: <strong>{country.name}</strong>
                    </span>
                    <button
                        type="button"
                        className="country-picker-chip-change"
                        onClick={() => onCountryChange(null)}
                    >
                        change
                    </button>
                </div>
            ) : isFlightKind(kind) ? (
                <div className="add-destination-field">
                    <label className="add-destination-label">Destination</label>
                    <p className="transport-resolving">
                        Finding your destination from your flight… or pick it
                        below.
                    </p>
                    <SearchBar
                        defaultValue={defaultCountry ?? undefined}
                        type="simple"
                        onSelected={onCountryChange}
                    />
                </div>
            ) : (
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        Confirm country
                    </label>
                    <SearchBar
                        defaultValue={defaultCountry ?? undefined}
                        type="simple"
                        onSelected={onCountryChange}
                    />
                </div>
            )}

            {chooserOpen ? (
                <div
                    className="transport-tiles"
                    role="tablist"
                    aria-label="Transport type"
                >
                    {TYPE_CHIPS.map(({ value, label, sub, Icon }) => {
                        const active =
                            value === 'later' ? kind === null : kind === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                className={classNames('transport-tile', {
                                    'is-active': active,
                                })}
                                onClick={() => pickKind(value)}
                            >
                                <Icon className="transport-tile-icon" />
                                <span className="transport-tile-title">
                                    {label}
                                </span>
                                <span className="transport-tile-sub">{sub}</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                kind &&
                activeChip && (
                    <div className="transport-active-mode">
                        <span className="transport-active-mode-label">
                            <activeChip.Icon className="transport-active-mode-icon" />
                            {activeChip.label}
                        </span>
                        <button
                            type="button"
                            className="transport-active-mode-change"
                            onClick={() => setChooserOpen(true)}
                        >
                            Change
                        </button>
                    </div>
                )
            )}

            {kind && (
                <>
                    {showSmartBox && (
                    <div className="add-destination-field">
                        <label className="add-destination-label">
                            Describe your transportation
                        </label>
                        <div className="transport-smart">
                            <AutoAwesomeRoundedIcon className="transport-smart-spark" />
                            <InputField
                                variant="bare"
                                name="transport-smart"
                                value={transport.smartText}
                                required={false}
                                placeholder={
                                    isFlightKind(kind)
                                        ? 'e.g. "Copa CM123 June 6"'
                                        : isRentalKind(kind)
                                          ? 'e.g. "Hertz pickup PTY June 6 10am $50"'
                                          : 'e.g. "Panama City to Boquete 9am $30"'
                                }
                                onChange={(e) => handleSmartText(e.target.value)}
                            />
                        </div>
                    </div>
                    )}

                    {/* The flight/transit lookup watchers + the arrival-airport
                        → country derivation that used to live here are now in
                        the orchestrator's always-mounted TransportResolver, so
                        they keep resolving after the user clicks Continue and
                        this step unmounts. This step is entry-only. */}

                    {/* Collapsed entry view: a quiet "Edit details" link to
                        reveal the full editable fields. The read-only review of
                        the parsed result moved to the Confirm step. */}
                    {!showDetails && (
                        <div className="transport-edit-toggle">
                            {lookupNotFound[0] && (
                                <span className="transport-edit-toggle-warn">
                                    Couldn&rsquo;t find {lookupNotFound[0]}. Open
                                    Edit details to fill it in manually.
                                </span>
                            )}
                            <button
                                type="button"
                                className="transport-edit-toggle-btn"
                                onClick={() => setShowDetails(true)}
                            >
                                <EditRoundedIcon fontSize="small" />
                                Edit details
                            </button>
                        </div>
                    )}

                    {showDetails && isFlightKind(kind) && (
                        <FlightFields
                            segments={
                                transport.flightSegments.length
                                    ? transport.flightSegments
                                    : [emptyFlightSegment(isoDefaultDate)]
                            }
                            tripMaxDate={tripMaxDate}
                            onField={setFlightField}
                            isoDefaultDate={isoDefaultDate}
                        />
                    )}

                    {showDetails && kind && !isFlightKind(kind) && (
                        <TransitFields
                            segment={transitSeg ?? emptyTransitSegment(isoDefaultDate)}
                            isRental={isRentalKind(kind)}
                            tripMaxDate={tripMaxDate}
                            onField={setTransitField}
                        />
                    )}

                    {showDetails && (
                        <div className="add-destination-field add-destination-flight-cost">
                            <label className="add-destination-label">
                                Cost{' '}
                                <span className="add-destination-optional">
                                    (optional)
                                </span>
                            </label>
                            <InputField
                                value={transport.cost}
                                type="number"
                                name="transportCost"
                                label=""
                                required={false}
                                onChange={(e) =>
                                    setTransport((prev) => ({
                                        ...prev,
                                        cost: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

interface FlightFieldsProps {
    segments: FlightInfo[];
    tripMaxDate?: string;
    isoDefaultDate: string;
    onField: (idx: number, name: keyof FlightInfo, value: string) => void;
}

/** Editable per-segment flight fields. Mirrors the prior AddDestination
 *  flight markup (outbound leg, no add-stopover — destination transport is
 *  the simple single-leg arrival case). */
const FlightFields = ({
    segments,
    tripMaxDate,
    isoDefaultDate,
    onField,
}: FlightFieldsProps) => (
    <>
        {segments.map((seg, idx) => (
            <div key={idx} className="add-destination-segment">
                <div className="add-destination-field">
                    <label className="add-destination-label">Flight number</label>
                    <InputField
                        value={seg.flightNumber ?? ''}
                        label=""
                        name={`flightNumber-${idx}`}
                        onChange={(e) =>
                            onField(idx, 'flightNumber', e.target.value)
                        }
                    />
                </div>
                <div className="add-destination-row">
                    <div className="add-destination-field">
                        <label className="add-destination-label">
                            Depart airport
                        </label>
                        <AirportAutocomplete
                            value={seg.departAirport ?? ''}
                            onChange={(code) =>
                                onField(idx, 'departAirport', code)
                            }
                            placeholder="IATA code, city, or airport"
                        />
                    </div>
                    <div className="add-destination-field">
                        <label className="add-destination-label">
                            Arrive airport
                        </label>
                        <AirportAutocomplete
                            value={seg.arrivalAirport ?? ''}
                            onChange={(code) =>
                                onField(idx, 'arrivalAirport', code)
                            }
                            placeholder="IATA code, city, or airport"
                        />
                    </div>
                </div>
                <div className="add-destination-row">
                    <div className="add-destination-field">
                        <label className="add-destination-label">Depart date</label>
                        <InputField
                            value={seg.departDate ?? ''}
                            type="date"
                            maxDate={tripMaxDate}
                            name={`departDate-${idx}`}
                            onChange={(e) =>
                                onField(idx, 'departDate', e.target.value)
                            }
                        />
                    </div>
                    <div className="add-destination-field">
                        <label className="add-destination-label">Depart time</label>
                        <InputField
                            value={seg.departTime ?? ''}
                            name={`departTime-${idx}`}
                            type="time"
                            label=""
                            onChange={(e) =>
                                onField(idx, 'departTime', e.target.value)
                            }
                        />
                    </div>
                </div>
                <div className="add-destination-row">
                    <div className="add-destination-field">
                        <label className="add-destination-label">Arrive date</label>
                        <InputField
                            value={seg.arrivalDate ?? ''}
                            type="date"
                            minDate={seg.departDate || isoDefaultDate}
                            maxDate={tripMaxDate}
                            name={`arrivalDate-${idx}`}
                            onChange={(e) =>
                                onField(idx, 'arrivalDate', e.target.value)
                            }
                        />
                    </div>
                    <div className="add-destination-field">
                        <label className="add-destination-label">Arrive time</label>
                        <InputField
                            value={seg.arrivalTime ?? ''}
                            name={`arrivalTime-${idx}`}
                            type="time"
                            label=""
                            onChange={(e) =>
                                onField(idx, 'arrivalTime', e.target.value)
                            }
                        />
                    </div>
                </div>
            </div>
        ))}
    </>
);

interface TransitFieldsProps {
    segment: TransitInfo;
    isRental: boolean;
    tripMaxDate?: string;
    onField: (idx: number, name: keyof TransitInfo, value: string) => void;
}

/** Editable transit fields (single leg). Labels re-map for rental cars,
 *  mirroring AddPlaceBtn's TransitForm vocabulary. */
const TransitFields = ({
    segment,
    isRental,
    tripMaxDate,
    onField,
}: TransitFieldsProps) => {
    const labels = isRental
        ? {
              operator: 'Rental company',
              number: 'Confirmation number',
              departStation: 'Pickup location',
              arrivalStation: 'Dropoff location (optional)',
              departDate: 'Pickup date',
              departTime: 'Pickup time',
              arrivalDate: 'Dropoff date (optional)',
              arrivalTime: 'Dropoff time (optional)',
              classOrSeat: 'Car class (optional)',
          }
        : {
              operator: 'Provider',
              number: 'Vehicle number (optional)',
              departStation: 'Departure location',
              arrivalStation: 'Arrival location (optional)',
              departDate: 'Depart date',
              departTime: 'Depart time',
              arrivalDate: 'Arrival date (optional)',
              arrivalTime: 'Arrival time (optional)',
              classOrSeat: 'Seat or class (optional)',
          };

    return (
        <div className="add-destination-segment">
            <div className="add-destination-row">
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.operator}
                    </label>
                    <InputField
                        value={segment.operator ?? ''}
                        name="transitOperator"
                        label=""
                        required={!isRental}
                        onChange={(e) =>
                            onField(0, 'operator', e.target.value)
                        }
                    />
                </div>
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.number}
                    </label>
                    <InputField
                        value={segment.number ?? ''}
                        name="transitNumber"
                        label=""
                        required={false}
                        onChange={(e) => onField(0, 'number', e.target.value)}
                    />
                </div>
            </div>
            <div className="add-destination-row">
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.departStation}
                    </label>
                    <InputField
                        value={segment.departStation ?? ''}
                        name="transitDepartStation"
                        label=""
                        onChange={(e) =>
                            onField(0, 'departStation', e.target.value)
                        }
                    />
                </div>
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.arrivalStation}
                    </label>
                    <InputField
                        value={segment.arrivalStation ?? ''}
                        name="transitArrivalStation"
                        label=""
                        required={false}
                        onChange={(e) =>
                            onField(0, 'arrivalStation', e.target.value)
                        }
                    />
                </div>
            </div>
            <div className="add-destination-row">
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.departDate}
                    </label>
                    <InputField
                        value={segment.departDate ?? ''}
                        type="date"
                        maxDate={tripMaxDate}
                        name="transitDepartDate"
                        onChange={(e) =>
                            onField(0, 'departDate', e.target.value)
                        }
                    />
                </div>
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.departTime}
                    </label>
                    <InputField
                        value={segment.departTime ?? ''}
                        name="transitDepartTime"
                        type="time"
                        label=""
                        required={false}
                        onChange={(e) =>
                            onField(0, 'departTime', e.target.value)
                        }
                    />
                </div>
            </div>
            <div className="add-destination-row">
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.arrivalDate}
                    </label>
                    <InputField
                        value={segment.arrivalDate ?? ''}
                        type="date"
                        minDate={segment.departDate || undefined}
                        maxDate={tripMaxDate}
                        name="transitArrivalDate"
                        required={false}
                        onChange={(e) =>
                            onField(0, 'arrivalDate', e.target.value)
                        }
                    />
                </div>
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        {labels.arrivalTime}
                    </label>
                    <InputField
                        value={segment.arrivalTime ?? ''}
                        name="transitArrivalTime"
                        type="time"
                        label=""
                        required={false}
                        onChange={(e) =>
                            onField(0, 'arrivalTime', e.target.value)
                        }
                    />
                </div>
            </div>
            <div className="add-destination-field">
                <label className="add-destination-label">
                    {labels.classOrSeat}
                </label>
                <InputField
                    value={segment.classOrSeat ?? ''}
                    name="transitClassOrSeat"
                    label=""
                    required={false}
                    onChange={(e) =>
                        onField(0, 'classOrSeat', e.target.value)
                    }
                />
            </div>
        </div>
    );
};

export default TransportStep;
