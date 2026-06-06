import {
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
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
    // Only the CUSTOM add-method opens straight into the editable fields.
    // SMART (and edit mode) show the collapsed smart box + a summary chip +
    // "Edit details" — mirroring the clean Add-Activity edit, which keeps the
    // segment collapsed until the user chooses to tweak it.
    const fieldsOpen = method === ADD_METHOD.CUSTOM;
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
                    isoDefaultDate={isoDefaultDate}
                />
            )}

            {showDetails && !isFlightKind(kind) && (
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
}

/** Editable per-segment flight fields (single outbound leg — destination
 *  transport is the simple arrival case). */
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

export default DescribeStep;
