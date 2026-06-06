import {
    useEffect,
    useMemo,
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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import SearchBar from 'components/SearchBar';
import FlightSegmentLookupWatcher from 'components/common/AddPlaceBtn/FlightSegmentLookupWatcher';
import TransitSegmentLookupWatcher from 'components/common/AddPlaceBtn/TransitSegmentLookupWatcher';
import { parseFlightInfo } from 'components/common/AddPlaceBtn/parseFlightInfo';
import { parseTransitEntry } from 'components/common/AddPlaceBtn/parseTransitQuery';
import { useAirports } from 'api/hooks/useAirports';
import { useCountries } from 'api/hooks/useCountries';
import type { FlightLookupResult } from 'api/flightLookupApi';
import type { TransitLookupResult } from 'api/transitLookupApi';
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
}

const TYPE_CHIPS: {
    value: TransportKind | 'later';
    label: string;
    Icon: typeof FlightRoundedIcon;
}[] = [
    { value: ACTIVITY_KIND.FLIGHT, label: 'Flight', Icon: FlightRoundedIcon },
    {
        value: ACTIVITY_KIND.TRAIN,
        label: 'Train',
        Icon: DirectionsTransitRoundedIcon,
    },
    { value: ACTIVITY_KIND.BUS, label: 'Bus', Icon: DirectionsBusRoundedIcon },
    {
        value: ACTIVITY_KIND.RENTAL_CAR,
        label: 'Rental Car',
        Icon: CarRentalRoundedIcon,
    },
    { value: 'later', label: "I'll add later", Icon: BlockRoundedIcon },
];

const isRentalKind = (kind: TransportKind | null) =>
    kind === ACTIVITY_KIND.RENTAL_CAR;
const isFlightKind = (kind: TransportKind | null) =>
    kind === ACTIVITY_KIND.FLIGHT;

/** Step 2 — how are you getting there. Type chips → smart box (parsed via
 *  parseFlightInfo / parseTransitEntry) → "Parsed" summary with Edit Details
 *  expanding the full per-segment fields. Surfaces a country confirm/picker
 *  when step 1 couldn't resolve one. */
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
    const [lookupNotFound, setLookupNotFound] = useState<Record<number, string>>(
        {},
    );
    // Track whether we've already auto-parsed the seeded smart text so a
    // re-render doesn't clobber subsequent manual edits.
    const parsedSmartRef = useRef<string | null>(null);

    useEffect(() => {
        setShowDetails(isEdit);
    }, [isEdit, kind]);

    // Derive the destination from a flight's arrival airport when step 1's
    // smart text named no country (e.g. "UA123" → LHR→EWR → United States).
    // Two hops: arrival IATA → airports catalog (its country) → countries
    // catalog (the Country with a savable id). Disabled once a country is
    // set so it can't loop or fight a user pick.
    const arrivalAirport =
        transport.flightSegments[0]?.arrivalAirport?.trim() ?? '';
    const needAirportCountry =
        isFlightKind(kind) && !country && arrivalAirport.length >= 3;
    const { data: airportData } = useAirports(
        needAirportCountry ? arrivalAirport : '',
    );
    const derivedCountryName = useMemo(() => {
        if (!needAirportCountry) return '';
        const items = airportData?.items ?? [];
        const match =
            items.find(
                (a) =>
                    a.iataCode.toUpperCase() === arrivalAirport.toUpperCase(),
            ) ?? items[0];
        return match?.country ?? '';
    }, [airportData, needAirportCountry, arrivalAirport]);
    const { data: derivedCountryMatches } = useCountries(derivedCountryName, {
        enabled: derivedCountryName.length > 0,
        limit: 1,
    });
    useEffect(() => {
        if (!needAirportCountry) return;
        const best = derivedCountryMatches?.[0];
        if (!best) return;
        onCountryChange({
            id: best.id,
            name: best.name,
            code: best.code,
            local: best.local ?? undefined,
            image: best.image ?? undefined,
        });
        // onCountryChange is stable; fire once per resolved match.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [derivedCountryMatches, needAirportCountry]);

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

    const applyFlightLookup = (idx: number, result: FlightLookupResult) => {
        setTransport((prev) => {
            const segs = prev.flightSegments.length
                ? [...prev.flightSegments]
                : [emptyFlightSegment(isoDefaultDate)];
            const cur = segs[idx] ?? {};
            segs[idx] = {
                ...cur,
                departAirport: result.departAirport ?? cur.departAirport,
                arrivalAirport: result.arrivalAirport ?? cur.arrivalAirport,
                departDate: result.departDate ?? cur.departDate,
                departTime: result.departTime ?? cur.departTime,
                arrivalDate: result.arrivalDate ?? cur.arrivalDate,
                arrivalTime: result.arrivalTime ?? cur.arrivalTime,
            };
            return { ...prev, flightSegments: segs };
        });
    };

    const applyTransitLookup = (idx: number, result: TransitLookupResult) => {
        setTransport((prev) => {
            const segs = prev.transitSegments.length
                ? [...prev.transitSegments]
                : [emptyTransitSegment(isoDefaultDate)];
            const cur = segs[idx] ?? {};
            segs[idx] = {
                ...cur,
                operator: result.operator ?? cur.operator,
                number: result.number ?? cur.number,
                departStation: result.departStation ?? cur.departStation,
                arrivalStation: result.arrivalStation ?? cur.arrivalStation,
                departDate: result.departDate ?? cur.departDate,
                departTime: result.departTime ?? cur.departTime,
                arrivalDate: result.arrivalDate ?? cur.arrivalDate,
                arrivalTime: result.arrivalTime ?? cur.arrivalTime,
            };
            return { ...prev, transitSegments: segs };
        });
    };

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

    const flightSeg = transport.flightSegments[0];
    const transitSeg = transport.transitSegments[0];

    // Compact parsed summary line for the active kind.
    const summary = (() => {
        if (isFlightKind(kind) && flightSeg) {
            const route =
                flightSeg.departAirport && flightSeg.arrivalAirport
                    ? `${flightSeg.departAirport} → ${flightSeg.arrivalAirport}`
                    : null;
            const parts = [
                flightSeg.flightNumber,
                route,
                flightSeg.departDate,
                flightSeg.departTime,
            ].filter(Boolean);
            return parts.length ? parts.join(' · ') : null;
        }
        if (kind && !isFlightKind(kind) && transitSeg) {
            const route =
                transitSeg.departStation && transitSeg.arrivalStation
                    ? `${transitSeg.departStation} → ${transitSeg.arrivalStation}`
                    : null;
            const parts = [
                transitSeg.operator,
                transitSeg.number,
                route,
                transitSeg.departDate,
                transitSeg.departTime,
            ].filter(Boolean);
            return parts.length ? parts.join(' · ') : null;
        }
        return null;
    })();

    const activeChipLabel =
        TYPE_CHIPS.find((c) => c.value === kind)?.label ?? '';

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
                    className="transport-chips"
                    role="tablist"
                    aria-label="Transport type"
                >
                    {TYPE_CHIPS.map(({ value, label, Icon }) => {
                        const active =
                            value === 'later' ? kind === null : kind === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                className={classNames('transport-chip', {
                                    'is-active': active,
                                })}
                                onClick={() => pickKind(value)}
                            >
                                <Icon className="transport-chip-icon" />
                                <span>{label}</span>
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

                    {/* Lookup watchers — flight by number+date, transit by
                        operator+number. Rental cars have no lookup. */}
                    {isFlightKind(kind) &&
                        transport.flightSegments.map((seg, idx) => (
                            <FlightSegmentLookupWatcher
                                key={`flw-${idx}`}
                                flightNumber={seg.flightNumber}
                                departDate={seg.departDate}
                                onResult={(r) => {
                                    applyFlightLookup(idx, r);
                                    setLookupNotFound((prev) => {
                                        if (!(idx in prev)) return prev;
                                        const next = { ...prev };
                                        delete next[idx];
                                        return next;
                                    });
                                }}
                                onNotFound={(num) =>
                                    setLookupNotFound((prev) => ({
                                        ...prev,
                                        [idx]: num,
                                    }))
                                }
                            />
                        ))}
                    {(kind === ACTIVITY_KIND.TRAIN ||
                        kind === ACTIVITY_KIND.BUS) &&
                        transport.transitSegments.map((seg, idx) => (
                            <TransitSegmentLookupWatcher
                                key={`tlw-${idx}`}
                                operator={seg.operator}
                                number={seg.number}
                                kind={
                                    kind === ACTIVITY_KIND.TRAIN
                                        ? 'train'
                                        : 'bus'
                                }
                                departDate={seg.departDate}
                                country={country?.name}
                                onResult={(r) => {
                                    applyTransitLookup(idx, r);
                                    setLookupNotFound((prev) => {
                                        if (!(idx in prev)) return prev;
                                        const next = { ...prev };
                                        delete next[idx];
                                        return next;
                                    });
                                }}
                                onNotFound={(label) =>
                                    setLookupNotFound((prev) => ({
                                        ...prev,
                                        [idx]: label,
                                    }))
                                }
                            />
                        ))}

                    {/* Parsed summary (add-mode collapsed view). */}
                    {!showDetails && (
                        <div className="transport-parsed">
                            <span className="transport-parsed-head">
                                <CheckCircleRoundedIcon
                                    fontSize="small"
                                    className="transport-parsed-check"
                                />
                                Parsed {activeChipLabel}
                            </span>
                            <span className="transport-parsed-line">
                                {summary ??
                                    'Type your details above, or open Edit Details to fill them in.'}
                            </span>
                            {lookupNotFound[0] && (
                                <span className="transport-parsed-warn">
                                    Couldn&rsquo;t find {lookupNotFound[0]}. Open
                                    Edit Details to fill in manually.
                                </span>
                            )}
                            <button
                                type="button"
                                className="transport-parsed-edit"
                                onClick={() => setShowDetails(true)}
                            >
                                <EditRoundedIcon fontSize="small" />
                                Edit Details
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
