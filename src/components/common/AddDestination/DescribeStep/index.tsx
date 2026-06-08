import {
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import classNames from 'classnames';
import moment from 'moment';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import { parseFlightInfo } from 'components/common/AddPlaceBtn/parseFlightInfo';
import { parseTransitEntry } from 'components/common/AddPlaceBtn/parseTransitQuery';
import { ACTIVITY_KIND, ADD_METHOD } from 'constants';
import type { AddMethod, FlightInfo, TransitInfo } from 'types';
import type { TransportDraft, TransportKind } from '../types';
import { TRANSPORT_MODE, buildTransportSummary } from '../transportSummary';
import './index.scss';

export interface DescribeStepProps {
    mode: 'add' | 'edit';
    transport: TransportDraft;
    setTransport: Dispatch<SetStateAction<TransportDraft>>;
    isoDefaultDate: string;
    tripMaxDate?: string;
    emptyFlightSegment: (date: string) => FlightInfo;
    emptyTransitSegment: (date: string) => TransitInfo;
    /** Jump back to change the transport type / method. Omitted in edit mode
     *  (the tiles render inline above this step, no wizard navigation). */
    onChangeType?: () => void;
    /** ADD-only: the method picked on the Method step. `CUSTOM` opens the
     *  editable fields straight away (no smart box); `SMART` shows the
     *  collapsed smart box + "Edit details" toggle (the default). Undefined
     *  in edit mode, where the fields are always open. */
    method?: AddMethod | null;
    /** Per-segment "couldn't find this flight/route" hints, owned by the
     *  orchestrator's always-mounted TransportResolver. Read-only here —
     *  surfaced as a manual-entry nudge under the smart box. */
    lookupNotFound: Record<number, string>;
}

const isRentalKind = (kind: TransportKind | null) =>
    kind === ACTIVITY_KIND.RENTAL_CAR;
const isFlightKind = (kind: TransportKind | null) =>
    kind === ACTIVITY_KIND.FLIGHT;

/** Smart-box placeholder per transport kind. */
const smartPlaceholder = (kind: TransportKind): string =>
    isFlightKind(kind)
        ? 'EWR to Panama City June 6 on Copa $450 — or "Copa CM123 June 6"'
        : isRentalKind(kind)
          ? 'Hertz pickup PTY June 6 10am $50'
          : 'Renfe 3152 Madrid to Barcelona 9am $30';

/** Describe the chosen transport. A smart box (parsed via
 *  parseFlightInfo / parseTransitEntry into the first segment) → "Edit
 *  details" reveals the full per-segment fields + cost. For "I'll add
 *  later" (kind=null) it's a destination-only entry — the orchestrator's
 *  TransportResolver resolves the country from that text. Entry-only: the
 *  async route/country enrichment lives in TransportResolver. */
const DescribeStep = ({
    mode,
    transport,
    setTransport,
    isoDefaultDate,
    tripMaxDate,
    emptyFlightSegment,
    emptyTransitSegment,
    onChangeType,
    method,
    lookupNotFound,
}: DescribeStepProps) => {
    const isEdit = mode === 'edit';
    const { kind } = transport;
    // Edit mode — and the CUSTOM add-method — open straight into the editable
    // segment fields. The collapsed smart-box summary + "Edit details" toggle
    // is an ADD affordance (describe a flight from scratch); when the user taps
    // Edit on an existing destination they came to change its details, so jump
    // right to the per-segment form with every leg shown.
    const fieldsOpen = method === ADD_METHOD.CUSTOM || isEdit;
    const [showDetails, setShowDetails] = useState(fieldsOpen);
    // Track whether we've already auto-parsed the current smart text so a
    // re-render doesn't clobber subsequent manual edits.
    const parsedSmartRef = useRef<string | null>(null);

    useEffect(() => {
        setShowDetails(fieldsOpen);
    }, [fieldsOpen, kind]);

    const activeMode = kind ? TRANSPORT_MODE[kind] : null;
    // CUSTOM drops the user straight into the fields, so the smart box is
    // suppressed. SMART (and edit mode) keep it as the primary entry.
    const showSmartBox = method !== ADD_METHOD.CUSTOM;
    // One-line preview of the (seeded / parsed) transport shown while details
    // are collapsed — e.g. "UA123 · LHR → EWR · 2026-06-06" — so the user can
    // see what's there without expanding the full field grid.
    const collapsedSummary = buildTransportSummary(transport);
    // One side of a flight resolved but not the other — e.g. "bangkok to hoi
    // an", where Hoi An has no airport of its own so only BKK comes back. Nudge
    // the user to pick the missing airport (the nearest one) instead of leaving
    // a half-empty flight.
    const hasUnresolvedAirport =
        isFlightKind(kind) &&
        transport.flightSegments.some(
            (s) => Boolean(s.departAirport) !== Boolean(s.arrivalAirport),
        );

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

    // Parse the seeded smart text once when a kind is set + text is present.
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

    /** Append a stopover leg. It continues from where the previous leg
     *  landed — depart airport/date/time default to the prior leg's
     *  arrival — so a London→Oslo flight extends naturally to Oslo→Moscow. */
    const addFlightLeg = () => {
        setTransport((prev) => {
            const segs = prev.flightSegments.length
                ? [...prev.flightSegments]
                : [emptyFlightSegment(isoDefaultDate)];
            const last = segs[segs.length - 1];
            segs.push({
                ...emptyFlightSegment(last?.arrivalDate || isoDefaultDate),
                departAirport: last?.arrivalAirport,
                departDate: last?.arrivalDate || isoDefaultDate,
                departTime: last?.arrivalTime,
                arrivalDate: last?.arrivalDate || isoDefaultDate,
            });
            return { ...prev, flightSegments: segs };
        });
        setShowDetails(true);
    };

    const removeFlightLeg = (idx: number) => {
        setTransport((prev) => {
            if (prev.flightSegments.length <= 1) return prev;
            return {
                ...prev,
                flightSegments: prev.flightSegments.filter((_, i) => i !== idx),
            };
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

    // "I'll add later" — destination-only entry. The orchestrator's resolver
    // derives the country from this text; no transport fields here.
    if (!kind) {
        return (
            <section className="add-destination-group">
                <header className="add-destination-group-head">
                    <h4 className="add-destination-group-title">
                        Where are you going?
                    </h4>
                </header>

                {!isEdit && onChangeType && (
                    <ChangeTypeRow label="No transport" onChange={onChangeType} />
                )}

                <div className="add-destination-field">
                    <label className="add-destination-label">
                        Where are you going?
                    </label>
                    <div className="transport-smart">
                        <AutoAwesomeRoundedIcon className="transport-smart-spark" />
                        <InputField
                            variant="bare"
                            name="destination-smart"
                            value={transport.smartText}
                            required={false}
                            placeholder="Panama"
                            onChange={(e) =>
                                setTransport((prev) => ({
                                    ...prev,
                                    smartText: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <p className="describe-step-note">
                        We&rsquo;ll find the country from this.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="add-destination-group">
            <header className="add-destination-group-head">
                <h4 className="add-destination-group-title">
                    Describe your {activeMode?.label}
                </h4>
            </header>

            {!isEdit && activeMode && onChangeType && (
                <ChangeTypeRow
                    label={activeMode.label}
                    Icon={activeMode.Icon}
                    onChange={onChangeType}
                />
            )}

            {showSmartBox && (
                <div className="add-destination-field">
                    <label className="add-destination-label">
                        Describe your {activeMode?.label}
                    </label>
                    <div className="transport-smart">
                        <AutoAwesomeRoundedIcon className="transport-smart-spark" />
                        <InputField
                            variant="bare"
                            name="transport-smart"
                            value={transport.smartText}
                            required={false}
                            placeholder={smartPlaceholder(kind)}
                            onChange={(e) => handleSmartText(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {hasUnresolvedAirport && (
                <p className="describe-step-airport-warn" role="alert">
                    <WarningAmberRoundedIcon className="describe-step-warn-icon" />
                    We couldn&rsquo;t find an airport for part of your route —
                    some places (like Hoi An) have no airport of their own.
                    {showDetails
                        ? ' Pick the nearest airport in the fields below (e.g. Da Nang).'
                        : ' Open Edit details to pick the nearest airport (e.g. Da Nang).'}
                </p>
            )}

            {showSmartBox && !showDetails && (
                <div className="transport-edit-toggle">
                    {collapsedSummary && (
                        <div className="transport-edit-summary">
                            {activeMode && (
                                <activeMode.Icon className="transport-edit-summary-icon" />
                            )}
                            <span className="transport-edit-summary-text">
                                {collapsedSummary}
                            </span>
                        </div>
                    )}
                    {lookupNotFound[0] && (
                        <span className="transport-edit-toggle-warn">
                            Couldn&rsquo;t find {lookupNotFound[0]}. Open Edit
                            details to fill it in manually.
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
                    onAddLeg={addFlightLeg}
                    onRemoveLeg={removeFlightLeg}
                    isoDefaultDate={isoDefaultDate}
                />
            )}

            {showDetails && !isFlightKind(kind) && (
                <TransitFields
                    segment={transitSeg ?? emptyTransitSegment(isoDefaultDate)}
                    isRental={isRentalKind(kind)}
                    tripMaxDate={tripMaxDate}
                    RouteIcon={activeMode?.Icon}
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
        </section>
    );
};

interface ChangeTypeRowProps {
    label: string;
    Icon?: typeof EditRoundedIcon;
    onChange: () => void;
}

/** Shows the active transport choice with a "Change" link back to step 1. */
const ChangeTypeRow = ({ label, Icon, onChange }: ChangeTypeRowProps) => (
    <div className="transport-active-mode">
        <span className="transport-active-mode-label">
            {Icon && <Icon className="transport-active-mode-icon" />}
            {label}
        </span>
        <button
            type="button"
            className="transport-active-mode-change"
            onClick={onChange}
        >
            Change
        </button>
    </div>
);

interface FlightFieldsProps {
    segments: FlightInfo[];
    tripMaxDate?: string;
    isoDefaultDate: string;
    onField: (idx: number, name: keyof FlightInfo, value: string) => void;
    onAddLeg: () => void;
    onRemoveLeg: (idx: number) => void;
}

/** Summary shown on a collapsed leg header — the flight number if set,
 *  else the "DEP → ARR" route, else nothing. */
const flightSegmentSummary = (seg: FlightInfo): string => {
    const fn = seg.flightNumber?.trim().toUpperCase();
    if (fn) return fn;
    const dep = seg.departAirport?.trim().toUpperCase();
    const arr = seg.arrivalAirport?.trim().toUpperCase();
    if (dep || arr) return `${dep || '—'} → ${arr || '—'}`;
    return '';
};

/** One collapsible card per flight leg — mirrors the Add-Activity flight
 *  form. Collapsed cards show a route / flight-number summary; "Add segment
 *  (stopover)" appends a leg (auto-opened for editing) and any extra leg can
 *  be removed, so a layover (Reykjavík → Stockholm → Oslo) is editable. */
const FlightFields = ({
    segments,
    tripMaxDate,
    isoDefaultDate,
    onField,
    onAddLeg,
    onRemoveLeg,
}: FlightFieldsProps) => {
    const [openSegments, setOpenSegments] = useState<Set<number>>(
        () => new Set(),
    );
    const prevLenRef = useRef(segments.length);
    useEffect(() => {
        if (segments.length > prevLenRef.current) {
            // Auto-open the freshly added (last) leg so it's ready to fill.
            setOpenSegments((prev) =>
                new Set(prev).add(segments.length - 1),
            );
        }
        prevLenRef.current = segments.length;
    }, [segments.length]);

    const toggle = (idx: number) =>
        setOpenSegments((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });

    return (
        <>
            {segments.map((seg, idx) => {
                const open = openSegments.has(idx);
                const sub = flightSegmentSummary(seg);
                return (
                    <div key={idx} className="add-destination-segment">
                        <div className="add-destination-segment-head">
                            <button
                                type="button"
                                className="add-destination-segment-toggle"
                                onClick={() => toggle(idx)}
                                aria-expanded={open}
                            >
                                {open ? (
                                    <ExpandLessRoundedIcon fontSize="small" />
                                ) : (
                                    <ExpandMoreRoundedIcon fontSize="small" />
                                )}
                                <span className="add-destination-segment-title">
                                    Segment {idx + 1}
                                    {sub && (
                                        <span className="add-destination-segment-sub">
                                            {' · '}
                                            {sub}
                                        </span>
                                    )}
                                </span>
                            </button>
                            {segments.length > 1 && (
                                <button
                                    type="button"
                                    className="add-destination-segment-remove"
                                    aria-label={`Remove segment ${idx + 1}`}
                                    onClick={() => onRemoveLeg(idx)}
                                >
                                    <CloseRoundedIcon fontSize="small" />
                                </button>
                            )}
                        </div>
                        {open && (
                            <div className="add-destination-segment-body">
                                <div className="add-destination-field">
                                    <label className="add-destination-label">
                                        Flight number
                                    </label>
                                    <InputField
                                        value={seg.flightNumber ?? ''}
                                        label=""
                                        name={`flightNumber-${idx}`}
                                        onChange={(e) =>
                                            onField(
                                                idx,
                                                'flightNumber',
                                                e.target.value,
                                            )
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
                                                onField(
                                                    idx,
                                                    'departAirport',
                                                    code,
                                                )
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
                                                onField(
                                                    idx,
                                                    'arrivalAirport',
                                                    code,
                                                )
                                            }
                                            placeholder="IATA code, city, or airport"
                                        />
                                    </div>
                                </div>
                                <div className="add-destination-row">
                                    <div className="add-destination-field">
                                        <label className="add-destination-label">
                                            Depart date
                                        </label>
                                        <InputField
                                            value={seg.departDate ?? ''}
                                            type="date"
                                            maxDate={tripMaxDate}
                                            name={`departDate-${idx}`}
                                            onChange={(e) =>
                                                onField(
                                                    idx,
                                                    'departDate',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="add-destination-field">
                                        <label className="add-destination-label">
                                            Depart time
                                        </label>
                                        <InputField
                                            value={seg.departTime ?? ''}
                                            name={`departTime-${idx}`}
                                            type="time"
                                            label=""
                                            onChange={(e) =>
                                                onField(
                                                    idx,
                                                    'departTime',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="add-destination-row">
                                    <div className="add-destination-field">
                                        <label className="add-destination-label">
                                            Arrive date
                                        </label>
                                        <InputField
                                            value={seg.arrivalDate ?? ''}
                                            type="date"
                                            minDate={
                                                seg.departDate || isoDefaultDate
                                            }
                                            maxDate={tripMaxDate}
                                            name={`arrivalDate-${idx}`}
                                            onChange={(e) =>
                                                onField(
                                                    idx,
                                                    'arrivalDate',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="add-destination-field">
                                        <label className="add-destination-label">
                                            Arrive time
                                        </label>
                                        <InputField
                                            value={seg.arrivalTime ?? ''}
                                            name={`arrivalTime-${idx}`}
                                            type="time"
                                            label=""
                                            onChange={(e) =>
                                                onField(
                                                    idx,
                                                    'arrivalTime',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            <button
                type="button"
                className="add-destination-add-leg"
                onClick={onAddLeg}
            >
                <AddRoundedIcon fontSize="small" />
                Add segment (stopover)
            </button>
        </>
    );
};

interface TransitFieldsProps {
    segment: TransitInfo;
    isRental: boolean;
    tripMaxDate?: string;
    /** Transit-mode icon for the route connector (train / bus / car). */
    RouteIcon?: typeof EditRoundedIcon;
    onField: (idx: number, name: keyof TransitInfo, value: string) => void;
}

/** Combine the model's separate `date` (YYYY-MM-DD) + `time` (HH:mm) strings
 *  into a single moment for the DateTimePicker. Returns null when neither is
 *  set so an unfilled control renders blank (not today). */
const toDateTime = (date?: string, time?: string): moment.Moment | null => {
    if (!date && !time) return null;
    const m = moment(
        `${date || moment().format('YYYY-MM-DD')} ${time || '00:00'}`,
        'YYYY-MM-DD HH:mm',
    );
    return m.isValid() ? m : null;
};

interface DateTimeFieldProps {
    label: string;
    value: moment.Moment | null;
    minDate?: string;
    maxDate?: string;
    /** Splits the combined value back into the model's date + time strings.
     *  Empty `date`/`time` when the picker is cleared. */
    onChange: (date: string, time: string) => void;
}

/** A single date+time control that writes back to the two separate model
 *  fields — used for both the depart and arrival rows in Schedule. */
const DateTimeField = ({
    label,
    value,
    minDate,
    maxDate,
    onChange,
}: DateTimeFieldProps) => (
    <div className="add-destination-field transit-datetime">
        <label className="add-destination-label">{label}</label>
        <DateTimePicker
            value={value}
            onChange={(m) =>
                m && m.isValid()
                    ? onChange(m.format('YYYY-MM-DD'), m.format('HH:mm'))
                    : onChange('', '')
            }
            {...(minDate ? { minDate: moment(minDate) } : {})}
            {...(maxDate ? { maxDate: moment(maxDate) } : {})}
        />
    </div>
);

/** Editable transit fields (single leg), grouped into subtle sections —
 *  Route (stacked from → to), Schedule (one date+time control each), and a
 *  collapsible Additional details for the optional secondary fields. Labels
 *  re-map for rental cars, mirroring AddPlaceBtn's TransitForm vocabulary. */
const TransitFields = ({
    segment,
    isRental,
    tripMaxDate,
    RouteIcon,
    onField,
}: TransitFieldsProps) => {
    const [showMore, setShowMore] = useState(false);

    const labels = isRental
        ? {
              operator: 'Rental company',
              number: 'Confirmation number',
              departStation: 'Pickup location',
              arrivalStation: 'Dropoff location (optional)',
              departDateTime: 'Pickup',
              arrivalDateTime: 'Dropoff (optional)',
              classOrSeat: 'Car class (optional)',
          }
        : {
              operator: 'Provider',
              number: 'Vehicle number (optional)',
              departStation: 'Departure location',
              arrivalStation: 'Arrival location (optional)',
              departDateTime: 'Depart',
              arrivalDateTime: 'Arrival (optional)',
              classOrSeat: 'Seat or class (optional)',
          };

    return (
        <div className="add-destination-segment transit-fields">
            <div className="add-destination-field">
                <label className="add-destination-label">
                    {labels.operator}
                </label>
                <InputField
                    value={segment.operator ?? ''}
                    name="transitOperator"
                    label=""
                    required={!isRental}
                    onChange={(e) => onField(0, 'operator', e.target.value)}
                />
            </div>

            <section className="transit-section">
                <h5 className="transit-section-title">Route</h5>
                <div className="transit-route">
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
                    <div className="transit-route-connector" aria-hidden>
                        {RouteIcon ? (
                            <RouteIcon className="transit-route-connector-mode" />
                        ) : (
                            <ArrowDownwardRoundedIcon className="transit-route-connector-arrow" />
                        )}
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
            </section>

            <section className="transit-section">
                <h5 className="transit-section-title">Schedule</h5>
                <div className="add-destination-row">
                    <DateTimeField
                        label={labels.departDateTime}
                        value={toDateTime(
                            segment.departDate,
                            segment.departTime,
                        )}
                        maxDate={tripMaxDate}
                        onChange={(date, time) => {
                            onField(0, 'departDate', date);
                            onField(0, 'departTime', time);
                        }}
                    />
                    <DateTimeField
                        label={labels.arrivalDateTime}
                        value={toDateTime(
                            segment.arrivalDate,
                            segment.arrivalTime,
                        )}
                        minDate={segment.departDate || undefined}
                        maxDate={tripMaxDate}
                        onChange={(date, time) => {
                            onField(0, 'arrivalDate', date);
                            onField(0, 'arrivalTime', time);
                        }}
                    />
                </div>
            </section>

            <section className="transit-section">
                <button
                    type="button"
                    className="transit-more-toggle"
                    onClick={() => setShowMore((v) => !v)}
                    aria-expanded={showMore}
                >
                    {showMore ? (
                        <ExpandLessRoundedIcon fontSize="small" />
                    ) : (
                        <ExpandMoreRoundedIcon fontSize="small" />
                    )}
                    <span className="transit-section-title transit-more-title">
                        Additional details
                    </span>
                </button>
                {showMore && (
                    <div
                        className={classNames(
                            'add-destination-row',
                            'transit-more-body',
                        )}
                    >
                        <div className="add-destination-field">
                            <label className="add-destination-label">
                                {labels.number}
                            </label>
                            <InputField
                                value={segment.number ?? ''}
                                name="transitNumber"
                                label=""
                                required={false}
                                onChange={(e) =>
                                    onField(0, 'number', e.target.value)
                                }
                            />
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
                )}
            </section>
        </div>
    );
};

export default DescribeStep;
