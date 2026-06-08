import { useEffect, useRef, useState, type ReactNode } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import InputField from 'components/common/FormFields/InputField';
import AirportAutocomplete from 'components/common/FormFields/AirportAutocomplete';
import AirlineLogo, { deriveAirlineCode } from 'components/common/AirlineLogo';
import type { FlightInfo } from 'types';
import { DateTimeField, flightRoute, flightSchedule, toDateTime } from '../helpers';
import './index.scss';

export interface FlightFieldsProps {
    segments: FlightInfo[];
    tripMaxDate?: string;
    isoDefaultDate: string;
    onField: (idx: number, name: keyof FlightInfo, value: string) => void;
    onAddLeg: () => void;
    onRemoveLeg: (idx: number) => void;
    /** Optional per-segment content rendered at the TOP of an open segment
     *  body, before the flight-number field. The activity form uses it to
     *  mount its lookup watcher + loading / "couldn't find" hint; the
     *  destination passes nothing. `open` mirrors the segment's expanded
     *  state so the slot can render lazily. */
    renderSegmentExtra?: (segIdx: number, open: boolean) => ReactNode;
    /** Picked when an arrival airport is selected on the LAST segment — lets
     *  the activity form seed the destination city. Optional; the
     *  destination doesn't use it. */
    onArrivalAirportMeta?: (
        idx: number,
        meta: { city?: string | null },
    ) => void;
}

/** One collapsible card per flight leg — shared by the destination editor and
 *  the Add-Activity flight form. Collapsed cards show a route / flight-number
 *  summary; "Add stopover" appends a leg (auto-opened for editing) and any
 *  extra leg can be removed, so a layover (Reykjavík → Stockholm → Oslo) is
 *  editable. */
const FlightFields = ({
    segments,
    tripMaxDate,
    isoDefaultDate,
    onField,
    onAddLeg,
    onRemoveLeg,
    renderSegmentExtra,
    onArrivalAirportMeta,
}: FlightFieldsProps) => {
    const [openSegments, setOpenSegments] = useState<Set<number>>(
        () => new Set(),
    );
    const prevLenRef = useRef(segments.length);
    useEffect(() => {
        if (segments.length > prevLenRef.current) {
            // Auto-open the freshly added (last) leg so it's ready to fill.
            setOpenSegments((prev) => new Set(prev).add(segments.length - 1));
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

    // Vertical airport path (DEP ↓ ARR ↓ …) shown above the add button so the
    // whole flight is visible at a glance. Built from each leg's depart code
    // plus the final leg's arrival, collapsing the shared stop between two
    // legs (a leg's arrival == the next leg's depart) into one entry.
    const pathStops: string[] = [];
    const pushStop = (code?: string) => {
        const c = code?.trim().toUpperCase();
        if (c && pathStops[pathStops.length - 1] !== c) pathStops.push(c);
    };
    segments.forEach((seg) => {
        pushStop(seg.departAirport);
        pushStop(seg.arrivalAirport);
    });

    return (
        <>
            {segments.map((seg, idx) => {
                const open = openSegments.has(idx);
                const route = flightRoute(seg);
                const schedule = flightSchedule(seg);
                const fn = seg.flightNumber?.trim().toUpperCase();
                const carrier = deriveAirlineCode(null, seg.flightNumber);
                return (
                    <div key={idx} className="add-destination-segment">
                        <div className="add-destination-segment-head">
                            <button
                                type="button"
                                className="add-destination-segment-toggle flight-segment-toggle"
                                onClick={() => toggle(idx)}
                                aria-expanded={open}
                            >
                                {open ? (
                                    <ExpandLessRoundedIcon fontSize="small" />
                                ) : (
                                    <ExpandMoreRoundedIcon fontSize="small" />
                                )}
                                <span className="flight-segment-header">
                                    <span className="flight-segment-route">
                                        <span className="flight-segment-seg">
                                            Segment {idx + 1}
                                        </span>
                                        {route && (
                                            <span className="flight-segment-path">
                                                {route}
                                            </span>
                                        )}
                                    </span>
                                    {(fn || schedule) && (
                                        <span className="flight-segment-meta">
                                            {fn && (
                                                <span className="flight-segment-flight">
                                                    <AirlineLogo
                                                        flightNumber={
                                                            seg.flightNumber
                                                        }
                                                        className="flight-segment-logo"
                                                    />
                                                    {fn}
                                                    {carrier && (
                                                        <span className="flight-segment-carrier">
                                                            {carrier}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            {schedule && (
                                                <span className="flight-segment-schedule">
                                                    {schedule}
                                                </span>
                                            )}
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
                                {renderSegmentExtra?.(idx, open)}
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
                                            onSelectMeta={
                                                onArrivalAirportMeta
                                                    ? (opt) =>
                                                          onArrivalAirportMeta(
                                                              idx,
                                                              opt,
                                                          )
                                                    : undefined
                                            }
                                            placeholder="IATA code, city, or airport"
                                        />
                                    </div>
                                </div>
                                <div className="add-destination-row">
                                    <DateTimeField
                                        label="Depart"
                                        value={toDateTime(
                                            seg.departDate,
                                            seg.departTime,
                                        )}
                                        maxDate={tripMaxDate}
                                        onChange={(date, time) => {
                                            onField(idx, 'departDate', date);
                                            onField(idx, 'departTime', time);
                                        }}
                                    />
                                    <DateTimeField
                                        label="Arrive"
                                        value={toDateTime(
                                            seg.arrivalDate,
                                            seg.arrivalTime,
                                        )}
                                        minDate={seg.departDate || isoDefaultDate}
                                        maxDate={tripMaxDate}
                                        onChange={(date, time) => {
                                            onField(idx, 'arrivalDate', date);
                                            onField(idx, 'arrivalTime', time);
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            {pathStops.length > 1 && (
                <ul className="flight-path" aria-label="Flight route">
                    {pathStops.map((stop, i) => (
                        <li key={`${stop}-${i}`} className="flight-path-stop">
                            {stop}
                        </li>
                    ))}
                </ul>
            )}
            <button
                type="button"
                className="add-destination-add-leg"
                onClick={onAddLeg}
            >
                <AddRoundedIcon fontSize="small" />
                Add stopover
            </button>
        </>
    );
};

export default FlightFields;
