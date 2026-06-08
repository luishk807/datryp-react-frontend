import {
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InputField from 'components/common/FormFields/InputField';
import FlightFields from 'components/common/TransportFields/FlightFields';
import TransitFields from 'components/common/TransportFields/TransitFields';
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
    // Once the smart text has parsed into a summary we collapse the tall input
    // into a compact success chip; "Edit description" re-reveals the input.
    const [editingSmart, setEditingSmart] = useState(false);
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

            {showSmartBox &&
                (collapsedSummary && !editingSmart ? (
                    <div className="add-destination-field">
                        <div className="transport-smart-chip">
                            <AutoAwesomeRoundedIcon className="transport-smart-spark" />
                            <span className="transport-smart-chip-text">
                                {collapsedSummary}
                            </span>
                            <button
                                type="button"
                                className="transport-smart-chip-edit"
                                onClick={() => setEditingSmart(true)}
                            >
                                Edit description
                            </button>
                        </div>
                    </div>
                ) : (
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
                ))}

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
                    segments={[
                        transitSeg ?? emptyTransitSegment(isoDefaultDate),
                    ]}
                    isRental={isRentalKind(kind)}
                    tripMaxDate={tripMaxDate}
                    isoDefaultDate={isoDefaultDate}
                    ModeIcon={activeMode?.Icon}
                    onField={setTransitField}
                    onAddLeg={() => {}}
                    onRemoveLeg={() => {}}
                    showAddLeg={false}
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

export default DescribeStep;
